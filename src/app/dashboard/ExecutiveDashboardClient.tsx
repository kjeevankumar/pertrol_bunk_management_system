"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import { Fuel, TrendingUp, Users, AlertTriangle, Activity, 
  Zap, Sparkles, CheckCircle2, Clock, RefreshCw, ShieldAlert, 
  ArrowUpRight, ArrowDownRight, Fingerprint, Gauge, Target,
  ChevronRight, BrainCircuit
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RevenueVelocityChart = dynamic(
  () => import("@/components/dashboard/DashboardCharts").then(mod => mod.RevenueVelocityChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[180px] w-full bg-white/5 rounded-2xl" />
  }
);

const FUEL_COLORS: Record<string, string> = { 
  petrol: "#3b82f6", 
  diesel: "#10b981", 
  premium_petrol: "#f59e0b", 
  cng: "#8b5cf6" 
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

interface DashboardClientProps {
  initialData: {
    sales: any[];
    expensesData: any[];
    fuel: any[];
    attendance: any[];
    employees: any[];
    alerts: any[];
    activityLogs: any[];
  };
}

export default function ExecutiveDashboardClient({ initialData }: DashboardClientProps) {
  const [loading, setLoading] = useState(() => {
    const hasData = initialData && (
      (initialData.sales && initialData.sales.length > 0) ||
      (initialData.fuel && initialData.fuel.length > 0) ||
      (initialData.activityLogs && initialData.activityLogs.length > 0)
    );
    return !hasData;
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  
  const [stats, setStats] = useState(() => {
    const sales = initialData.sales;
    const expensesData = initialData.expensesData;
    const att = initialData.attendance;
    const emps = initialData.employees;

    const revenue = sales?.reduce((a, s) => a + Number(s.total_amount), 0) ?? 0;
    const fuelSold = sales?.reduce((a, s) => a + Number(s.volume), 0) ?? 0;
    const transactions = sales?.length ?? 0;
    const totalExpenses = expensesData?.reduce((a, e) => a + Number(e.amount), 0) ?? 0;

    return { 
      revenue, 
      expenses: totalExpenses, 
      profit: revenue - totalExpenses, 
      transactions, 
      fuelSold, 
      present: att?.filter(a => a.status === "present" || a.status === "late").length ?? 0, 
      total: emps?.length ?? 0 
    };
  });

  const [tanks, setTanks] = useState(initialData.fuel);
  const [alerts, setAlerts] = useState(initialData.alerts);
  const [activityLogs, setActivityLogs] = useState(initialData.activityLogs);
  
  const [hourlySales, setHourlySales] = useState(() => {
    const hours: any[] = [];
    for (let i = 7; i >= 0; i--) {
      const h = new Date(); h.setHours(h.getHours() - i, 0, 0, 0);
      const hNext = new Date(h); hNext.setHours(h.getHours() + 1);
      const hSales = initialData.sales?.filter(s => new Date(s.created_at) >= h && new Date(s.created_at) < hNext) ?? [];
      hours.push({ time: `${h.getHours()}:00`, revenue: hSales.reduce((a, s) => a + Number(s.total_amount), 0) });
    }
    return hours;
  });

  const [fuelBreakdown, setFuelBreakdown] = useState(() => {
    const fuelMap: Record<string, number> = {};
    initialData.sales?.forEach(s => { fuelMap[s.fuel_type] = (fuelMap[s.fuel_type] ?? 0) + Number(s.total_amount); });
    return Object.keys(fuelMap).map(k => ({ name: k.replace("_", " ").toUpperCase(), value: fuelMap[k], fill: FUEL_COLORS[k] || "#888" }));
  });

  const supabase = createClient();

  const fetchAll = useCallback(async (isSilent = false) => {
    const today = new Date().toISOString().split("T")[0];
    if (!isSilent) setLoading(true);
    try {
      const [
        { data: sales },
        { data: expensesData },
        { data: fuel },
        { data: att },
        { data: emps },
        { data: alertsData },
        { data: logs }
      ] = await Promise.all([
        supabase.from("sales").select("*").gte("created_at", `${today}T00:00:00Z`),
        supabase.from("expenses").select("amount").gte("date", today),
        supabase.from("fuel_stock").select("*"),
        supabase.from("attendance").select("status").eq("date", today),
        supabase.from("employees").select("id"),
        supabase.from("alerts").select("*").eq("is_resolved", false).order("created_at", { ascending: false }).limit(5),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8)
      ]);

      const revenue = sales?.reduce((a, s) => a + Number(s.total_amount), 0) ?? 0;
      const fuelSold = sales?.reduce((a, s) => a + Number(s.volume), 0) ?? 0;
      const transactions = sales?.length ?? 0;
      const totalExpenses = expensesData?.reduce((a, e) => a + Number(e.amount), 0) ?? 0;

      if (fuel) setTanks(fuel);
      if (alertsData) setAlerts(alertsData);
      if (logs) setActivityLogs(logs);

      // Hourly breakdown
      const hours: any[] = [];
      for (let i = 7; i >= 0; i--) {
        const h = new Date(); h.setHours(h.getHours() - i, 0, 0, 0);
        const hNext = new Date(h); hNext.setHours(h.getHours() + 1);
        const hSales = sales?.filter(s => new Date(s.created_at) >= h && new Date(s.created_at) < hNext) ?? [];
        hours.push({ time: `${h.getHours()}:00`, revenue: hSales.reduce((a, s) => a + Number(s.total_amount), 0) });
      }
      setHourlySales(hours);

      // Fuel breakdown
      const fuelMap: Record<string, number> = {};
      sales?.forEach(s => { fuelMap[s.fuel_type] = (fuelMap[s.fuel_type] ?? 0) + Number(s.total_amount); });
      setFuelBreakdown(Object.keys(fuelMap).map(k => ({ name: k.replace("_", " ").toUpperCase(), value: fuelMap[k], fill: FUEL_COLORS[k] || "#888" })));

      setStats({ 
        revenue, 
        expenses: totalExpenses, 
        profit: revenue - totalExpenses, 
        transactions, 
        fuelSold, 
        present: att?.filter(a => a.status === "present" || a.status === "late").length ?? 0, 
        total: emps?.length ?? 0 
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const hasData = initialData && (
      (initialData.sales && initialData.sales.length > 0) ||
      (initialData.fuel && initialData.fuel.length > 0) ||
      (initialData.activityLogs && initialData.activityLogs.length > 0)
    );
    if (!hasData) {
      fetchAll(true);
    }

    let timeoutId: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchAll(true);
      }, 1000);
    };

    const channel = supabase.channel("dashboard_realtime_v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "fuel_stock" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, debouncedFetch)
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const fetchAiInsight = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Generate 3 enterprise-grade business intelligence insights based on today's petrol bunk data. Focus on anomalies and profit optimization.",
          context: { stats, tanks }
        })
      });
      const data = await res.json();
      if (data.response) setAiInsights(data.response.split('\n').filter((l: string) => l.trim() !== ''));
    } catch { toast.error("AI engine temporarily unavailable"); }
    setAiLoading(false);
  };

  const healthScore = Math.min(100, Math.round(
    (stats.transactions > 0 ? 30 : 0) +
    (stats.profit > 0 ? 30 : 0) +
    (tanks.every(t => t.current_stock > t.min_alert_level) ? 20 : 5) +
    (alerts.length === 0 ? 20 : Math.max(0, 20 - alerts.length * 4))
  ));

  const MetricCard = ({ label, value, icon: Icon, color, trend, sub }: any) => (
    <motion.div variants={item}>
      <Card className="glass-panel group premium-card-hover relative overflow-hidden">
        <div className={cn("absolute top-0 left-0 w-1 h-full opacity-50", color.replace('text-', 'bg-'))} />
        <CardContent className="p-4 sm:p-6">
          <div className="flex justify-between items-start">
            <div className={cn("p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.05] transition-transform group-hover:scale-110", color)}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            {trend && (
              <div className={cn("flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] font-black uppercase px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full", trend > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10")}>
                {trend > 0 ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                {Math.abs(trend)}%
              </div>
            )}
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-[0.15em] sm:tracking-[0.2em]">{label}</p>
            <div className="flex items-baseline gap-1 sm:gap-2 mt-0.5 sm:mt-1">
              <h3 className="text-lg sm:text-3xl font-black text-white tracking-tight sm:tracking-tighter truncate">
                {loading ? <Skeleton className="h-6 sm:h-9 w-20 sm:w-28 bg-white/5" /> : value}
              </h3>
            </div>
            {sub && <p className="text-[9px] sm:text-[10px] text-white/20 font-bold uppercase mt-0.5 sm:mt-1 truncate">{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <DashboardLayout>
      <motion.div 
        initial="hidden"
        animate="show"
        variants={container}
        className="space-y-8 max-w-[1600px] mx-auto pb-20"
      >
        {/* Top Header Section */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-1 bg-primary rounded-full shadow-[0_0_15px_rgba(37,99,235,1)]" />
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter premium-gradient-text">
                Executive <span className="text-primary">Command</span>
              </h1>
            </div>
            <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-xs flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" /> Live Operational Intelligence Engine
            </p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <div className="glass-panel px-3 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border-white/[0.05] flex items-center gap-2.5 sm:gap-4 bg-white/[0.02]">
              <div className="text-right border-r border-white/10 pr-2.5 sm:pr-4 mr-1 sm:mr-2">
                <p className="text-[8px] sm:text-[10px] font-black text-white/30 uppercase tracking-widest">Health Index</p>
                <p className={cn("text-base sm:text-xl font-black", healthScore > 70 ? "text-emerald-400" : "text-amber-400")}>{healthScore}%</p>
              </div>
              <div className="flex -space-x-1.5 sm:-space-x-2">
                {[1,2,3].map(i => (
                  <Avatar key={i} className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-background">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${i}`} />
                  </Avatar>
                ))}
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-[8px] sm:text-[10px] font-black text-primary">
                  +{stats.total > 3 ? stats.total - 3 : 0}
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => fetchAll()} className="h-14 w-14 rounded-2xl border-white/5 hover:bg-white/5 text-white">
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </Button>
          </div>
        </motion.div>

        {/* Primary Intelligence Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <MetricCard label="Daily Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon={Zap} color="text-emerald-400" trend={12} sub="Realtime sales flow" />
          <MetricCard label="Operating Profit" value={`₹${stats.profit.toLocaleString()}`} icon={TrendingUp} color="text-primary" trend={8} sub="Net margin after costs" />
          <MetricCard label="Fuel Volume" value={`${stats.fuelSold.toFixed(1)}L`} icon={Fuel} color="text-amber-400" sub="Total discharge volume" />
          <MetricCard label="Risk Assessment" value={alerts.length === 0 ? "Clear" : `${alerts.length} Threats`} icon={ShieldAlert} color={alerts.length > 0 ? "text-red-400" : "text-emerald-400"} sub="AI system monitoring" />
        </div>

        {/* Middle Section: Insights & Tanks */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* AI Intelligence Hub */}
          <motion.div variants={item} className="lg:col-span-4 h-full">
            <Card className="glass-panel border-primary/20 bg-primary/[0.02] h-full relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <BrainCircuit className="w-48 h-48 text-primary" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl font-black flex items-center gap-3 text-primary">
                  <Sparkles className="w-6 h-6 animate-pulse" /> Neural Intelligence
                </CardTitle>
                <CardDescription className="text-white/40 uppercase text-[10px] font-bold tracking-widest">Gemini Operational Analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 min-h-[280px]">
                  {aiLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full bg-primary/10" />
                      <Skeleton className="h-16 w-full bg-primary/10" />
                      <Skeleton className="h-16 w-full bg-primary/10" />
                    </div>
                  ) : aiInsights.length > 0 ? (
                    aiInsights.map((insight, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ delay: i * 0.1 }}
                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex gap-3 group/item hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 group-hover/item:scale-150 transition-transform" />
                        <p className="text-sm text-white/70 leading-relaxed font-medium">{insight}</p>
                      </motion.div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
                      <Target className="w-12 h-12 mb-4" />
                      <p className="text-xs font-bold uppercase">Awaiting Neural Link</p>
                      <p className="text-[10px] mt-1">Initiate AI analysis for today's data</p>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={fetchAiInsight} 
                  disabled={aiLoading} 
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:shadow-[0_0_50px_rgba(37,99,235,0.5)] transition-all rounded-2xl"
                >
                  {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Initiate AI Scan"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Operational Core (Tanks & Feed) */}
          <motion.div variants={item} className="lg:col-span-8 flex flex-col gap-6">
            <Card className="glass-panel border-white/5 flex-1">
              <CardHeader className="flex flex-row items-center justify-between pb-6">
                <div>
                  <CardTitle className="text-xl font-black flex items-center gap-3">
                    <Gauge className="w-6 h-6 text-amber-400" /> Operational Core
                  </CardTitle>
                  <CardDescription className="text-white/40 uppercase text-[10px] font-bold tracking-widest">Live Inventory Monitoring</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-500 uppercase">Sensors Active</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loading ? (
                    Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full bg-white/5 rounded-2xl" />)
                  ) : tanks.map(tank => {
                    const pct = Math.min(100, Math.round((tank.current_stock / tank.capacity) * 100));
                    const color = FUEL_COLORS[tank.fuel_type] || "#3b82f6";
                    return (
                      <div key={tank.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] group hover:bg-white/[0.04] transition-all">
                        <div className="flex justify-between items-end mb-4">
                          <div>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{tank.fuel_type.replace('_', ' ')}</p>
                            <h4 className="text-2xl font-black text-white tracking-tighter mt-1">{Number(tank.current_stock).toLocaleString()}<span className="text-xs text-white/20 ml-1">Litres</span></h4>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-black" style={{ color }}>{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full rounded-full relative" 
                            style={{ backgroundColor: color }}
                          >
                            <div className="absolute inset-0 bg-white/30 animate-pulse" />
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-panel border-white/5 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Revenue Velocity</CardTitle>
                </CardHeader>
                <CardContent className="h-[180px]">
                  <RevenueVelocityChart data={hourlySales} />
                </CardContent>
              </Card>

              <Card className="glass-panel border-white/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-emerald-400">Activity Pulse</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activityLogs.slice(0, 4).map((log, i) => (
                    <div key={log.id} className="flex items-center gap-3 border-b border-white/[0.03] pb-3 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white/80 truncate">{log.action}</p>
                        <p className="text-[10px] text-white/20 font-bold uppercase mt-0.5">{new Date(log.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4" />
      <path d="m16.2 7.8 2.9-2.9" />
      <path d="M18 12h4" />
      <path d="m16.2 16.2 2.9 2.9" />
      <path d="M12 18v4" />
      <path d="m4.9 19.1 2.9-2.9" />
      <path d="M2 12h4" />
      <path d="m4.9 4.9 2.9 2.9" />
    </svg>
  );
}

function Avatar({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("inline-flex items-center justify-center shrink-0 overflow-hidden rounded-full", className)}>{children}</div>;
}

function AvatarImage({ src, className }: { src: string, className?: string }) {
  return <img src={src} className={cn("aspect-square h-full w-full", className)} />;
}

function AvatarFallback({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("flex h-full w-full items-center justify-center rounded-full", className)}>{children}</div>;
}
