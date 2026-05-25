"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Fuel, Plus, AlertCircle, Truck, Activity, Droplets, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const refillSchema = z.object({
  tank_id: z.string().min(1, "Select a tank"),
  refill_amount: z.coerce.number().positive("Amount must be positive"),
  supplier_name: z.string().min(1, "Supplier name required"),
  invoice_number: z.string().optional(),
  cost: z.coerce.number().min(0),
  refill_date: z.string().nonempty("Date required"),
});
type RefillForm = z.infer<typeof refillSchema>;

const FUEL_COLORS: Record<string, string> = {
  petrol: "#3b82f6", diesel: "#10b981", premium_petrol: "#f59e0b", cng: "#8b5cf6"
};

function TankVisual({ pct, color, isCritical }: { pct: number; color: string; isCritical: boolean }) {
  return (
    <div className="relative w-16 h-28 mx-auto">
      <svg viewBox="0 0 60 120" className="w-full h-full">
        <rect x="5" y="10" width="50" height="100" rx="6" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
        <clipPath id={`clip-${color}`}>
          <rect x="5" y="10" width="50" height="100" rx="6" />
        </clipPath>
        <rect
          x="5"
          y={10 + (100 - Math.min(100, pct))}
          width="50"
          height={Math.min(100, pct)}
          fill={isCritical ? "#ef4444" : color}
          opacity="0.85"
          clipPath={`url(#clip-${color})`}
          className="transition-all duration-1000 ease-out"
        />
        <rect x="8" y="12" width="10" height="96" rx="3" fill="rgba(255,255,255,0.06)" clipPath={`url(#clip-${color})`} />
        <rect x="22" y="4" width="16" height="8" rx="3" fill="rgba(255,255,255,0.2)" />
        {[25, 50, 75].map(t => (
          <line key={t} x1="48" y1={10 + (100 - t)} x2="54" y2={10 + (100 - t)} stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        ))}
      </svg>
      {isCritical && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
      )}
    </div>
  );
}

interface FuelClientProps {
  initialData: {
    tanks: any[];
    refills: any[];
    activityLogs: any[];
  };
}

export default function FuelManagementClient({ initialData }: FuelClientProps) {
  const [tanks, setTanks] = useState<any[]>(initialData.tanks);
  const [refills, setRefills] = useState<any[]>(initialData.refills);
  const [activityLogs, setActivityLogs] = useState<any[]>(initialData.activityLogs);
  const [loading, setLoading] = useState(() => {
    const hasData = initialData && (
      (initialData.tanks && initialData.tanks.length > 0) ||
      (initialData.refills && initialData.refills.length > 0) ||
      (initialData.activityLogs && initialData.activityLogs.length > 0)
    );
    return !hasData;
  });
  const [isRefillOpen, setIsRefillOpen] = useState(false);
  const supabase = createClient();

  const form = useForm<RefillForm>({
    resolver: zodResolver(refillSchema) as any,
    defaultValues: { tank_id: "", refill_amount: 0, supplier_name: "", invoice_number: "", cost: 0, refill_date: new Date().toISOString().split("T")[0] }
  });

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [{ data: tankData }, { data: refillData }, { data: logs }] = await Promise.all([
        supabase.from("fuel_stock").select("*").order("created_at"),
        supabase.from("fuel_refills").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("fuel_activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
      ]);
      if (tankData) setTanks(tankData);
      if (refillData) setRefills(refillData);
      if (logs) setActivityLogs(logs);
    } catch (error) {
      console.error("Failed to fetch fuel data:", error);
      toast.error("Failed to sync fuel operations data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const hasData = initialData && (
      (initialData.tanks && initialData.tanks.length > 0) ||
      (initialData.refills && initialData.refills.length > 0) ||
      (initialData.activityLogs && initialData.activityLogs.length > 0)
    );
    if (!hasData) {
      fetchData(true);
    }

    let timeoutId: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchData(true);
      }, 1000);
    };

    const channel = supabase.channel("fuel_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel_stock" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel_refills" }, debouncedFetch)
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleAddRefill = async (data: RefillForm) => {
    try {
      const tank = tanks.find(t => t.id === data.tank_id);
      if (!tank) throw new Error("Tank not found");

      const newStock = Number(tank.current_stock) + data.refill_amount;
      if (newStock > tank.capacity) throw new Error(`Exceeds tank capacity of ${tank.capacity}L`);

      const prevStock = Number(tank.current_stock);

      const { data: branches } = await supabase.from("branches").select("id").limit(1);
      const branchId = branches?.[0]?.id ?? null;

      const { error: refillErr } = await supabase.from("fuel_refills").insert({
        branch_id: branchId,
        tank_id: data.tank_id,
        fuel_type: tank.fuel_type,
        refill_amount: data.refill_amount,
        supplier_name: data.supplier_name,
        invoice_number: data.invoice_number || null,
        cost: data.cost,
        refill_date: data.refill_date,
      });
      if (refillErr) throw new Error(refillErr.message);

      const { error: stockErr } = await supabase.from("fuel_stock")
        .update({ current_stock: newStock, last_refill_date: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", data.tank_id);
      if (stockErr) throw new Error(stockErr.message);

      await supabase.from("fuel_activity_logs").insert({
        branch_id: branchId,
        action_type: "refill",
        description: `${data.refill_amount}L of ${tank.fuel_type} added from ${data.supplier_name}`,
        previous_value: prevStock,
        updated_value: newStock,
        fuel_type: tank.fuel_type,
      });

      toast.success("Refill recorded!", { description: `+${data.refill_amount}L added to ${tank.fuel_type} tank` });
      setIsRefillOpen(false);
      form.reset();
      fetchData();
    } catch (err: any) {
      toast.error("Refill failed", { description: err.message });
    }
  };

  const totalStock = tanks.reduce((a, t) => a + Number(t.current_stock), 0);
  const criticalTanks = tanks.filter(t => t.current_stock <= t.min_alert_level);

  const trendData = Array.from({ length: 7 }, (_, i) => ({
    day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
    stock: Math.round(totalStock * (0.85 + Math.random() * 0.3)),
  }));

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-4 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Fuel Operations <Fuel className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Realtime tank monitoring, refill management, and stock analytics.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Dialog open={isRefillOpen} onOpenChange={setIsRefillOpen}>
              <DialogTrigger render={<Button className="h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-4 bg-amber-500 hover:bg-amber-600 text-black font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]" />}>
                <Truck className="w-4 h-4 mr-2" /> Record Refill
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-[440px] glass-panel border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Record Fuel Refill</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleAddRefill)} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Tank</Label>
                    <select {...form.register("tank_id")} className="w-full bg-background/50 border border-white/10 rounded-md p-2 text-white">
                      <option value="">Choose tank...</option>
                      {tanks.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.fuel_type.replace("_", " ").toUpperCase()} — {Number(t.current_stock).toLocaleString()}L / {Number(t.capacity).toLocaleString()}L
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.tank_id && <p className="text-red-400 text-xs">{form.formState.errors.tank_id.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Refill Amount (L)</Label>
                      <Input type="number" step="0.01" {...form.register("refill_amount")} className="bg-background/50 border-white/10" placeholder="e.g. 5000" />
                      {form.formState.errors.refill_amount && <p className="text-red-400 text-xs">{form.formState.errors.refill_amount.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Cost (₹)</Label>
                      <Input type="number" step="0.01" {...form.register("cost")} className="bg-background/50 border-white/10" placeholder="e.g. 450000" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Supplier Name</Label>
                    <Input {...form.register("supplier_name")} className="bg-background/50 border-white/10" placeholder="e.g. HPCL Mumbai" />
                    {form.formState.errors.supplier_name && <p className="text-red-400 text-xs">{form.formState.errors.supplier_name.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Invoice No. (optional)</Label>
                      <Input {...form.register("invoice_number")} className="bg-background/50 border-white/10" placeholder="INV-2024-001" />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" {...form.register("refill_date")} className="bg-background/50 border-white/10" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold mt-2">
                    Confirm Refill Entry
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {criticalTanks.length > 0 && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center gap-4 animate-in slide-in-from-top-2">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0 animate-pulse" />
            <div>
              <p className="font-bold text-red-400">⚠ Critical Stock Alert</p>
              <p className="text-sm text-red-300/80">{criticalTanks.map(t => t.fuel_type.replace("_", " ").toUpperCase()).join(", ")} below minimum threshold. Immediate refill required.</p>
            </div>
            <Button size="sm" onClick={() => setIsRefillOpen(true)} className="ml-auto bg-red-500 hover:bg-red-600 text-white shrink-0">Order Now</Button>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="glass-panel border-white/5">
            <CardContent className="p-3 sm:p-5 flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-amber-500/10 rounded-lg sm:rounded-xl shrink-0"><Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold truncate">Total Stock</p>
                {loading ? <Skeleton className="h-5 sm:h-7 w-16 sm:w-20 mt-1 bg-white/10" /> : <h3 className="text-base sm:text-2xl font-black text-amber-400 mt-0.5 sm:mt-1 truncate">{totalStock.toLocaleString()}L</h3>}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-white/5">
            <CardContent className="p-3 sm:p-5 flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-primary/10 rounded-lg sm:rounded-xl shrink-0"><Truck className="w-4 h-4 sm:w-5 sm:h-5 text-primary" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold truncate">Refills Today</p>
                {loading ? <Skeleton className="h-5 sm:h-7 w-12 mt-1 bg-white/10" /> : <h3 className="text-base sm:text-2xl font-black text-white mt-0.5 sm:mt-1 truncate">{refills.filter(r => r.refill_date === new Date().toISOString().split("T")[0]).length}</h3>}
              </div>
            </CardContent>
          </Card>
          <Card className={`glass-panel ${criticalTanks.length > 0 ? "border-red-500/30" : "border-white/5"}`}>
            <CardContent className="p-3 sm:p-5 flex items-center gap-2 sm:gap-3">
              <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 ${criticalTanks.length > 0 ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                <AlertCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${criticalTanks.length > 0 ? "text-red-400 animate-pulse" : "text-emerald-400"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold truncate">Critical Tanks</p>
                <h3 className={`text-base sm:text-2xl font-black mt-0.5 sm:mt-1 truncate ${criticalTanks.length > 0 ? "text-red-400" : "text-emerald-400"}`}>{criticalTanks.length}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-white/5">
            <CardContent className="p-3 sm:p-5 flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-2.5 bg-purple-500/10 rounded-lg sm:rounded-xl shrink-0"><Activity className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold truncate">Active Tanks</p>
                <h3 className="text-base sm:text-2xl font-black text-white mt-0.5 sm:mt-1 truncate">{tanks.length}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="w-5 h-5 text-amber-400" /> Live Tank Status
              <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400 font-normal">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Realtime
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex gap-8 justify-center">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="w-16 h-40 bg-white/5 rounded-lg" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {tanks.map(tank => {
                  const pct = Math.round((tank.current_stock / tank.capacity) * 100);
                  const isCritical = tank.current_stock <= tank.min_alert_level;
                  const color = FUEL_COLORS[tank.fuel_type] ?? "#888";
                  return (
                    <div key={tank.id} className={`flex flex-col items-center p-4 rounded-2xl border transition-all ${isCritical ? "border-red-500/30 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "border-white/5 bg-white/2 hover:bg-white/5"}`}>
                      <TankVisual pct={pct} color={color} isCritical={isCritical} />
                      <div className="mt-3 text-center">
                        <p className="font-bold text-white capitalize text-sm">{tank.fuel_type.replace("_", " ")}</p>
                        <p className="text-2xl font-black mt-1" style={{ color: isCritical ? "#ef4444" : color }}>{pct}%</p>
                        <p className="text-[11px] text-muted-foreground">{Number(tank.current_stock).toLocaleString()}L</p>
                        <p className="text-[10px] text-muted-foreground">of {Number(tank.capacity).toLocaleString()}L</p>
                        {isCritical && <span className="mt-2 inline-block text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">CRITICAL</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-panel border-white/5 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-primary" /> Stock Trend
              </CardTitle>
              <CardDescription>Weekly total fuel stock movement</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(5,5,15,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px" }} itemStyle={{ color: "#fff" }} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
                  <Area type="monotone" dataKey="stock" stroke="#f59e0b" strokeWidth={2} fill="url(#stockGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/5">
            <CardHeader>
              <CardTitle>Refill History</CardTitle>
              <CardDescription>Last 10 deliveries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {refills.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No refills recorded yet.</p>
              ) : refills.map(r => (
                <div key={r.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/3 border border-white/5 hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-white capitalize">{r.fuel_type.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{r.supplier_name} · {r.refill_date}</p>
                  </div>
                  <span className="text-amber-400 font-bold text-sm">+{Number(r.refill_amount).toLocaleString()}L</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel border-white/5">
          <CardHeader>
            <CardTitle>Fuel Activity Log</CardTitle>
            <CardDescription>Complete audit trail of all fuel operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground hidden sm:table-cell">Time</TableHead>
                    <TableHead className="text-muted-foreground">Action</TableHead>
                    <TableHead className="text-muted-foreground">Description</TableHead>
                    <TableHead className="text-right text-muted-foreground">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No fuel activity logged yet.</TableCell></TableRow>
                  ) : activityLogs.map(log => (
                    <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="text-muted-foreground text-xs hidden sm:table-cell">{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${log.action_type === "refill" ? "bg-emerald-500/10 text-emerald-400" : log.action_type === "dispense" ? "bg-primary/10 text-primary" : "bg-white/5 text-muted-foreground"}`}>
                          {log.action_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-white text-sm max-w-xs truncate">{log.description}</TableCell>
                      <TableCell className="text-right">
                        {log.previous_value !== null && log.updated_value !== null && (
                          <span className={`text-sm font-bold ${Number(log.updated_value) > Number(log.previous_value) ? "text-emerald-400" : "text-red-400"}`}>
                            {Number(log.updated_value) > Number(log.previous_value) ? "+" : ""}{(Number(log.updated_value) - Number(log.previous_value)).toFixed(0)}L
                          </span>
                        )}
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
