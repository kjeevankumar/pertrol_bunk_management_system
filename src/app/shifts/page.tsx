"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CalendarDays, UserCheck, UserX, Clock, Plus, LogIn, LogOut, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

const STATUS_STYLE: Record<string, string> = {
  present: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  late: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  absent: "bg-red-500/10 text-red-400 border-red-500/20",
  leave: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  half_day: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export default function ShiftsPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isShiftOpen, setIsShiftOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("present");
  const [selectedShift, setSelectedShift] = useState("");
  const [shiftForm, setShiftForm] = useState({ name: "", start_time: "06:00", end_time: "14:00" });
  const supabase = createClient();
  const [today, setToday] = useState("");
  const [todayDateLabel, setTodayDateLabel] = useState("");

  const fetchData = useCallback(async () => {
    if (!today) return;
    const [{ data: emps }, { data: att }, { data: shiftData }] = await Promise.all([
      supabase.from("employees").select("id, first_name, last_name, designation").eq("status", "active"),
      supabase.from("attendance").select("*, employees(first_name, last_name)").eq("date", today).order("created_at", { ascending: false }),
      supabase.from("shifts").select("*").order("start_time"),
    ]);
    if (emps) setEmployees(emps);
    if (att) setAttendance(att);
    if (shiftData) setShifts(shiftData);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);
    setTodayDateLabel(new Date().toDateString());
  }, []);

  useEffect(() => {
    if (today) {
      fetchData();
      const channel = supabase.channel("realtime_shifts")
        .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, fetchData)
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [fetchData, today]);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) { toast.error("Select an employee"); return; }
    try {
      // Check if already checked in today
      const existing = attendance.find(a => a.employee_id === selectedEmp);
      if (existing) { toast.error("Employee already has an attendance record today"); return; }

      const emp = employees.find(e => e.id === selectedEmp);
      const now = new Date();
      const shift = shifts.find(s => s.id === selectedShift);

      // Determine if late (after 10 mins of shift start)
      let status = selectedStatus;
      if (shift && status === "present") {
        const [h, m] = shift.start_time.split(":").map(Number);
        const shiftStart = new Date(); shiftStart.setHours(h, m + 10, 0, 0);
        if (now > shiftStart) status = "late";
      }

      const { error } = await supabase.from("attendance").insert({
        employee_id: selectedEmp,
        shift_id: selectedShift || null,
        date: today,
        login_time: now.toISOString(),
        status,
        overtime_hours: 0,
      });
      if (error) throw new Error(error.message);

      await logAudit({ action_type: "create", module_name: "attendance", description: `${emp?.first_name} ${emp?.last_name} checked in as ${status}` });
      await supabase.from("activity_logs").insert({ action: `${emp?.first_name} ${emp?.last_name} checked in (${status})`, entity_type: "attendance" });

      toast.success("Check-in recorded", { description: `${emp?.first_name} ${emp?.last_name} — ${status}` });
      setIsCheckInOpen(false);
      setSelectedEmp(""); setSelectedShift("");
      fetchData();
    } catch (err: any) { toast.error("Check-in failed", { description: err.message }); }
  };

  const handleCheckOut = async (attId: string, empName: string, loginTime: string, shiftId: string) => {
    try {
      const now = new Date();
      const login = new Date(loginTime);
      const hoursWorked = (now.getTime() - login.getTime()) / (1000 * 60 * 60);

      // Calculate overtime (standard shift = 8h)
      const overtime = Math.max(0, hoursWorked - 8);

      const { error } = await supabase.from("attendance").update({
        logout_time: now.toISOString(),
        overtime_hours: Number(overtime.toFixed(2)),
      }).eq("id", attId);
      if (error) throw new Error(error.message);

      await logAudit({ action_type: "update", module_name: "attendance", description: `${empName} checked out. Worked ${hoursWorked.toFixed(1)}h, overtime: ${overtime.toFixed(1)}h` });
      toast.success("Check-out recorded", { description: `Worked ${hoursWorked.toFixed(1)}h` });
      fetchData();
    } catch (err: any) { toast.error("Check-out failed", { description: err.message }); }
  };

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: branches } = await supabase.from("branches").select("id").limit(1);
    const { error } = await supabase.from("shifts").insert({
      branch_id: branches?.[0]?.id ?? null,
      name: shiftForm.name,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Shift created");
    setIsShiftOpen(false);
    setShiftForm({ name: "", start_time: "06:00", end_time: "14:00" });
    fetchData();
  };

  // Analytics derived
  const presentCount = attendance.filter(a => a.status === "present" || a.status === "late").length;
  const absentCount = employees.length - attendance.length;
  const lateCount = attendance.filter(a => a.status === "late").length;
  const totalOT = attendance.reduce((a, r) => a + Number(r.overtime_hours ?? 0), 0);
  const attPct = employees.length > 0 ? Math.round((presentCount / employees.length) * 100) : 0;

  // Shift-wise chart
  const shiftChart = shifts.map(s => ({
    name: s.name,
    count: attendance.filter(a => a.shift_id === s.id).length,
  }));

  const checkedInIds = new Set(attendance.map(a => a.employee_id));
  const notCheckedIn = employees.filter(e => !checkedInIds.has(e.id));

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-4 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Shifts & Attendance <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Realtime workforce attendance and shift operations — {todayDateLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button onClick={fetchData} variant="outline" className="h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-4 border-white/10 hover:bg-white/5 text-white">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Dialog open={isShiftOpen} onOpenChange={setIsShiftOpen}>
              <DialogTrigger render={<Button variant="outline" className="h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-4 border-primary/30 text-primary hover:bg-primary/10" />}>
                <Clock className="w-4 h-4 mr-2" /> New Shift
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-[380px] glass-panel border-white/10 text-white">
                <DialogHeader><DialogTitle>Create Shift</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateShift} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Shift Name</Label>
                    <input value={shiftForm.name} onChange={e => setShiftForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Morning Shift" className="w-full bg-background/50 border border-white/10 rounded-md p-2 text-white placeholder:text-white/30" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Time</Label>
                      <input type="time" value={shiftForm.start_time} onChange={e => setShiftForm(f => ({ ...f, start_time: e.target.value }))} className="w-full bg-background/50 border border-white/10 rounded-md p-2 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label>End Time</Label>
                      <input type="time" value={shiftForm.end_time} onChange={e => setShiftForm(f => ({ ...f, end_time: e.target.value }))} className="w-full bg-background/50 border border-white/10 rounded-md p-2 text-white" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold">Create Shift</Button>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
              <DialogTrigger render={<Button className="h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]" />}>
                <LogIn className="w-4 h-4 mr-2" /> Mark Attendance
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-[380px] glass-panel border-white/10 text-white">
                <DialogHeader><DialogTitle>Record Attendance</DialogTitle></DialogHeader>
                <form onSubmit={handleCheckIn} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <select value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)} required className="w-full bg-background/50 border border-white/10 rounded-md p-2 text-white">
                      <option value="">Select employee...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} — {emp.designation}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Shift</Label>
                    <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} className="w-full bg-background/50 border border-white/10 rounded-md p-2 text-white">
                      <option value="">No shift assigned</option>
                      {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full bg-background/50 border border-white/10 rounded-md p-2 text-white">
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="half_day">Half Day</option>
                      <option value="leave">On Leave</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold">Confirm Attendance</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Present", value: presentCount, icon: UserCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Absent", value: absentCount < 0 ? 0 : absentCount, icon: UserX, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Late Today", value: lateCount, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Overtime (h)", value: totalOT.toFixed(1), icon: Clock, color: "text-purple-400", bg: "bg-purple-500/10" },
            { label: "Attendance %", value: `${attPct}%`, icon: CheckCircle2, color: attPct >= 80 ? "text-emerald-400" : "text-red-400", bg: attPct >= 80 ? "bg-emerald-500/10" : "bg-red-500/10" },
          ].map(c => (
            <Card key={c.label} className="glass-panel border-white/5">
              <CardContent className="p-3 sm:p-5 flex items-center gap-2 sm:gap-3">
                <div className={`p-2 sm:p-2.5 ${c.bg} rounded-lg sm:rounded-xl shrink-0`}><c.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${c.color}`} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase truncate">{c.label}</p>
                  {loading ? <Skeleton className="h-5 sm:h-7 w-12 mt-1 bg-white/10" /> : <h3 className={`text-base sm:text-2xl font-black mt-0.5 sm:mt-1 ${c.color} truncate`}>{c.value}</h3>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Shifts + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-panel border-white/5">
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Active Shifts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {shifts.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No shifts configured. Create one above.</p>
              ) : shifts.map(s => (
                <div key={s.id} className="p-3 rounded-xl border border-white/5 bg-white/3 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div>
                    <p className="font-semibold text-white">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.start_time} — {s.end_time}</p>
                  </div>
                  <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    {attendance.filter(a => a.shift_id === s.id).length} staff
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/5 lg:col-span-2">
            <CardHeader><CardTitle>Shift Attendance Distribution</CardTitle><CardDescription>Staff count per shift today</CardDescription></CardHeader>
            <CardContent>
              {shiftChart.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No shift data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={shiftChart} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: "rgba(5,5,15,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px" }} itemStyle={{ color: "#fff" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Not Checked In Alert */}
        {notCheckedIn.length > 0 && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300"><span className="font-bold">{notCheckedIn.length} employee(s) not yet checked in:</span>{" "}{notCheckedIn.map(e => `${e.first_name} ${e.last_name}`).join(", ")}</p>
          </div>
        )}

        {/* Today's Attendance Table */}
        <Card className="glass-panel border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Today's Attendance Register
              <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 font-normal">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Live
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Employee</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground hidden sm:table-cell">Check In</TableHead>
                    <TableHead className="text-muted-foreground hidden md:table-cell">Check Out</TableHead>
                    <TableHead className="text-muted-foreground">Overtime</TableHead>
                    <TableHead className="text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <TableRow key={i} className="border-white/5">
                        {Array(6).fill(0).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-24 bg-white/5" /></TableCell>)}
                      </TableRow>
                    ))
                  ) : attendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No attendance records for today. Mark attendance to begin.</TableCell>
                    </TableRow>
                  ) : attendance.map(rec => (
                    <TableRow key={rec.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="font-medium text-white">{rec.employees?.first_name} {rec.employees?.last_name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLE[rec.status] ?? "text-white bg-white/5 border-white/10"}`}>{rec.status}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">{rec.login_time ? new Date(rec.login_time).toLocaleTimeString() : "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm hidden md:table-cell">{rec.logout_time ? new Date(rec.logout_time).toLocaleTimeString() : <span className="text-amber-400 animate-pulse text-xs">Active</span>}</TableCell>
                      <TableCell className={`text-sm font-bold ${Number(rec.overtime_hours) > 0 ? "text-purple-400" : "text-muted-foreground"}`}>
                        {Number(rec.overtime_hours) > 0 ? `+${Number(rec.overtime_hours).toFixed(1)}h` : "—"}
                      </TableCell>
                      <TableCell>
                        {rec.login_time && !rec.logout_time ? (
                          <Button size="sm" variant="outline" className="text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                            onClick={() => handleCheckOut(rec.id, `${rec.employees?.first_name} ${rec.employees?.last_name}`, rec.login_time, rec.shift_id)}>
                            <LogOut className="w-3 h-3 mr-1" /> Check Out
                          </Button>
                        ) : rec.logout_time ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Done</span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
