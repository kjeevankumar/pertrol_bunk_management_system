"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Banknote, Users, Clock, TrendingUp, PlayCircle, CheckCircle2, Loader2, Plus, IndianRupee, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

export default function PayrollPage() {
  const [salaries, setSalaries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, paid: 0, overtime: 0 });
  const [selectedSalary, setSelectedSalary] = useState<any>(null);
  const supabase = createClient();

  const [currentMonthDate, setCurrentMonthDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState("");
  const [monthLabel, setMonthLabel] = useState("");

  const fetchPayroll = useCallback(async () => {
    if (!currentMonth) return;
    setLoading(true);
    try {
      const [{ data: sal }, { data: emps }] = await Promise.all([
        supabase.from("salaries").select("*, employees(first_name, last_name, designation, base_salary)").eq("month", currentMonth),
        supabase.from("employees").select("id, first_name, last_name, designation, base_salary").eq("status", "active"),
      ]);
      if (sal) {
        setSalaries(sal);
        setStats({
          total: sal.reduce((a, s) => a + Number(s.net_salary), 0),
          pending: sal.filter(s => s.status === "pending").length,
          paid: sal.filter(s => s.status === "paid").length,
          overtime: sal.reduce((a, s) => a + Number(s.overtime_amount), 0),
        });
      }
      if (emps) setEmployees(emps);
    } catch (error) {
      console.error("Failed to fetch payroll data:", error);
      toast.error("Failed to sync payroll data");
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    const date = new Date();
    setCurrentMonthDate(date);
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split("T")[0]);
    setMonthLabel(date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }));
  }, []);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  const handleRunPayroll = async () => {
    if (!confirm(`Generate payroll for ALL active employees for ${monthLabel}?`)) return;
    setIsProcessing(true);
    try {
      const activeDate = currentMonthDate || new Date();
      // Get attendance this month for overtime
      const { data: attendance } = await supabase.from("attendance")
        .select("employee_id, overtime_hours")
        .gte("date", currentMonth)
        .lte("date", new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 0).toISOString().split("T")[0]);

      const otByEmp: Record<string, number> = {};
      attendance?.forEach(a => {
        otByEmp[a.employee_id] = (otByEmp[a.employee_id] ?? 0) + Number(a.overtime_hours ?? 0);
      });

      let insertCount = 0;
      for (const emp of employees) {
        // Skip if already generated
        const existing = salaries.find(s => s.employee_id === emp.id);
        if (existing) continue;

        const base = Number(emp.base_salary) || 0;
        const ot = otByEmp[emp.id] ?? 0;
        const hourlyRate = base / (26 * 8); // 26 working days × 8 hours
        const otAmount = Number((ot * hourlyRate * 1.5).toFixed(2)); // 1.5x overtime
        const deductions = Number((base * 0.12).toFixed(2)); // 12% PF deduction
        const net = Number((base + otAmount - deductions).toFixed(2));

        const { error } = await supabase.from("salaries").insert({
          employee_id: emp.id,
          month: currentMonth,
          base_amount: base,
          overtime_amount: otAmount,
          bonus: 0,
          deductions,
          net_salary: net,
          status: "pending",
        });
        if (!error) insertCount++;
      }

      await logAudit({ action_type: "create", module_name: "payroll", description: `Payroll generated for ${insertCount} employees — ${monthLabel}` });
      await supabase.from("activity_logs").insert({ action: `Payroll generated for ${monthLabel} (${insertCount} employees)`, entity_type: "payroll" });

      toast.success("Payroll Generated!", { description: `${insertCount} salary records created for ${monthLabel}` });
      fetchPayroll();
    } catch (err: any) {
      toast.error("Payroll failed", { description: err.message });
    }
    setIsProcessing(false);
  };

  const handleMarkPaid = async (salaryId: string, empName: string) => {
    const { error } = await supabase.from("salaries").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", salaryId);
    if (error) { toast.error(error.message); return; }
    await logAudit({ action_type: "update", module_name: "payroll", description: `Salary marked as paid for ${empName}` });
    toast.success(`Payment confirmed for ${empName}`);
    fetchPayroll();
  };

  const handleAddBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !bonusAmount) return;
    const salary = salaries.find(s => s.employee_id === selectedEmpId);
    if (!salary) { toast.error("Generate payroll first before adding bonus"); return; }
    const bonus = Number(bonusAmount);
    const newNet = Number(salary.net_salary) + bonus;
    const { error } = await supabase.from("salaries").update({ bonus: Number(salary.bonus) + bonus, net_salary: newNet }).eq("id", salary.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Bonus added successfully");
    setIsBonusOpen(false); setBonusAmount(""); setSelectedEmpId("");
    fetchPayroll();
  };

  const fetchAiInsight = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Analyze this payroll data and give 3 brief insights about salary costs, overtime patterns, and optimization recommendations.",
          context: { stats, employeeCount: employees.length, month: monthLabel, salaryRecords: salaries.length }
        })
      });
      const data = await res.json();
      if (data.response) setAiInsight(data.response);
    } catch { toast.error("AI analysis unavailable"); }
    setAiLoading(false);
  };

  // Chart data — salary breakdown per employee
  const chartData = salaries.slice(0, 8).map(s => ({
    name: `${s.employees?.first_name ?? "?"} ${(s.employees?.last_name ?? "")[0] ?? ""}.`,
    base: Number(s.base_amount),
    overtime: Number(s.overtime_amount),
    bonus: Number(s.bonus),
  }));

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-4 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Payroll <Banknote className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Automated payroll intelligence for {monthLabel}.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Dialog open={isBonusOpen} onOpenChange={setIsBonusOpen}>
              <DialogTrigger render={<Button variant="outline" className="h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-4 border-amber-500/30 text-amber-400 hover:bg-amber-500/10" />}>
                <Plus className="w-4 h-4 mr-2" /> Add Bonus
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-[360px] glass-panel border-white/10 text-white">
                <DialogHeader><DialogTitle>Add Bonus</DialogTitle></DialogHeader>
                <form onSubmit={handleAddBonus} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <select value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} required className="w-full bg-background/50 border border-white/10 rounded-md p-2 text-white">
                      <option value="">Select employee...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bonus Amount (₹)</Label>
                    <Input type="number" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} placeholder="e.g. 5000" className="bg-background/50 border-white/10 text-white" />
                  </div>
                  <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold">Confirm Bonus</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button onClick={handleRunPayroll} disabled={isProcessing} className="h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-4 bg-primary hover:bg-primary/90 font-bold shadow-[0_0_15px_rgba(0,102,255,0.3)]">
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><PlayCircle className="w-4 h-4 mr-2" /> Run Payroll</>}
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Total Payout", value: `₹${stats.total.toLocaleString()}`, icon: IndianRupee, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Paid", value: stats.paid, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
            { label: "OT Payout", value: `₹${stats.overtime.toLocaleString()}`, icon: IndianRupee, color: "text-purple-400", bg: "bg-purple-500/10" },
          ].map(c => (
            <Card key={c.label} className="glass-panel border-white/5">
              <CardContent className="p-3 sm:p-5 flex items-center gap-2 sm:gap-3">
                <div className={`p-2 sm:p-2.5 ${c.bg} rounded-lg sm:rounded-xl shrink-0`}><c.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${c.color}`} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase truncate">{c.label}</p>
                  {loading ? <Skeleton className="h-5 sm:h-7 w-16 sm:w-20 mt-1 bg-white/10" /> : <h3 className={`text-base sm:text-2xl font-black mt-0.5 sm:mt-1 ${c.color} truncate`}>{c.value}</h3>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart + AI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-panel border-white/5 lg:col-span-2">
            <CardHeader><CardTitle>Salary Breakdown</CardTitle><CardDescription>Base + Overtime + Bonus per employee</CardDescription></CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <Banknote className="w-10 h-10 opacity-20" />
                  <p className="text-sm">No payroll data. Click "Run Payroll" to generate.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: "rgba(5,5,15,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px" }} itemStyle={{ color: "#fff" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="base" name="Base" fill="#3b82f6" stackId="a" />
                    <Bar dataKey="overtime" name="Overtime" fill="#8b5cf6" stackId="a" />
                    <Bar dataKey="bonus" name="Bonus" fill="#f59e0b" stackId="a" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Payroll Insight</CardTitle>
            </CardHeader>
            <CardContent>
              {aiInsight ? (
                <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap bg-black/30 rounded-lg p-3 border border-white/5 max-h-52 overflow-y-auto">
                  {aiInsight}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>AI analysis of salary costs and optimization</p>
                </div>
              )}
              <Button onClick={fetchAiInsight} disabled={aiLoading} className="w-full mt-4 bg-primary hover:bg-primary/90 font-bold text-sm">
                {aiLoading ? "Analyzing..." : aiInsight ? "Refresh Analysis" : "Generate AI Insight"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Table */}
        <Card className="glass-panel border-white/5">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Payroll Register — {monthLabel}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Salary records with automated OT and deduction calculations</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Employee</TableHead>
                    <TableHead className="text-muted-foreground hidden sm:table-cell">Designation</TableHead>
                    <TableHead className="text-right text-muted-foreground hidden md:table-cell">Base (₹)</TableHead>
                    <TableHead className="text-right text-muted-foreground hidden md:table-cell">OT (₹)</TableHead>
                    <TableHead className="text-right text-muted-foreground hidden md:table-cell">Bonus (₹)</TableHead>
                    <TableHead className="text-right text-muted-foreground hidden md:table-cell">Deductions (₹)</TableHead>
                    <TableHead className="text-right text-muted-foreground">Net Salary (₹)</TableHead>
                    <TableHead className="text-muted-foreground hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <TableRow key={i} className="border-white/5">
                        <TableCell><Skeleton className="h-4 w-24 bg-white/5" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-20 bg-white/5" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16 bg-white/5" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16 bg-white/5" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16 bg-white/5" /></TableCell>
                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16 bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 bg-white/5" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-12 bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 bg-white/5" /></TableCell>
                      </TableRow>
                    ))
                  ) : salaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        <Banknote className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p>No payroll records for {monthLabel}.</p>
                        <p className="text-sm mt-1">Click <span className="text-primary font-semibold">"Run Payroll"</span> to auto-generate salary records.</p>
                      </TableCell>
                    </TableRow>
                  ) : salaries.map(s => (
                    <TableRow key={s.id} onClick={() => setSelectedSalary(s)} className="cursor-pointer border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="font-semibold text-white">{s.employees?.first_name} {s.employees?.last_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">{s.employees?.designation}</TableCell>
                      <TableCell className="text-right text-white hidden md:table-cell">₹{Number(s.base_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-purple-400 hidden md:table-cell">₹{Number(s.overtime_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-amber-400 hidden md:table-cell">₹{Number(s.bonus).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-400 hidden md:table-cell">-₹{Number(s.deductions).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-black text-emerald-400 text-sm sm:text-base">₹{Number(s.net_salary).toLocaleString()}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${s.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                          {s.status}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {s.status === "pending" ? (
                          <Button size="sm" onClick={() => handleMarkPaid(s.id, `${s.employees?.first_name} ${s.employees?.last_name}`)}
                            className="bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/40 text-xs h-7 px-2.5">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Pay
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Paid</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Detail Sheet */}
        <Sheet open={!!selectedSalary} onOpenChange={(open) => !open && setSelectedSalary(null)}>
          <SheetContent className="glass-panel border-white/10 text-white w-full sm:max-w-[450px]">
            <SheetHeader>
              <SheetTitle className="text-xl font-bold text-white">Salary Statement</SheetTitle>
              <SheetDescription className="text-muted-foreground text-sm">
                Statement details for {selectedSalary?.employees?.first_name} {selectedSalary?.employees?.last_name} ({monthLabel})
              </SheetDescription>
            </SheetHeader>
            {selectedSalary && (
              <div className="mt-6 space-y-6">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="p-3 bg-emerald-500/10 rounded-xl"><IndianRupee className="w-6 h-6 text-emerald-400" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase">Net Take-Home</p>
                    <h3 className="text-3xl font-black text-emerald-400 mt-1">₹{Number(selectedSalary.net_salary).toLocaleString()}</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white/50 uppercase tracking-wider">Salary Breakdown</h4>
                  <div className="divide-y divide-white/5">
                    <div className="flex justify-between py-2.5 text-sm">
                      <span className="text-muted-foreground">Designation</span>
                      <span className="text-white font-semibold">{selectedSalary.employees?.designation}</span>
                    </div>
                    <div className="flex justify-between py-2.5 text-sm">
                      <span className="text-muted-foreground">Base Salary</span>
                      <span className="text-white font-semibold">₹{Number(selectedSalary.base_amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2.5 text-sm">
                      <span className="text-muted-foreground">Overtime Payout</span>
                      <span className="text-purple-400 font-semibold">₹{Number(selectedSalary.overtime_amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2.5 text-sm">
                      <span className="text-muted-foreground">Bonus Amount</span>
                      <span className="text-amber-400 font-semibold">₹{Number(selectedSalary.bonus).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2.5 text-sm">
                      <span className="text-red-400">PF & Deductions</span>
                      <span className="text-red-400 font-semibold">-₹{Number(selectedSalary.deductions).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white/50 uppercase tracking-wider">Payment Information</h4>
                  <div className="divide-y divide-white/5">
                    <div className="flex justify-between py-2.5 text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${selectedSalary.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                        {selectedSalary.status}
                      </span>
                    </div>
                    {selectedSalary.status === "paid" && (
                      <div className="flex justify-between py-2.5 text-sm">
                        <span className="text-muted-foreground">Paid Date</span>
                        <span className="text-white font-semibold">{new Date(selectedSalary.paid_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedSalary.status === "pending" && (
                  <Button onClick={() => {
                    handleMarkPaid(selectedSalary.id, `${selectedSalary.employees?.first_name} ${selectedSalary.employees?.last_name}`);
                    setSelectedSalary(null);
                  }} className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold mt-4">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Payment (Mark Paid)
                  </Button>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
