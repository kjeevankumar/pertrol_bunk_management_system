"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, AlertCircle, 
  Search, Filter, RefreshCw, Eye, CheckCircle2, XCircle,
  TrendingDown, Fingerprint, Activity, Zap, History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, AreaChart, Area 
} from "recharts";

const RISK_COLORS: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  critical: "text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
};

export default function FraudDetection() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [riskScore, setRiskScore] = useState(12); // Simulated base risk
  
  const supabase = createClient();

  const fetchFraudAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fraud_alerts')
        .select('*')
        .order('detected_at', { ascending: false });

      if (data) {
        setAlerts(data);
        const activeHigh = data.filter(a => a.status === 'pending' && (a.risk_level === 'high' || a.risk_level === 'critical')).length;
        setRiskScore(Math.min(100, 10 + (activeHigh * 25)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFraudAlerts();

    const channel = supabase.channel('fraud_realtime_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fraud_alerts' }, fetchFraudAlerts)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleResolve = async (id: string, status: 'resolved' | 'false_positive') => {
    const { error } = await supabase
      .from('fraud_alerts')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      toast.success(`Alert marked as ${status.replace('_', ' ')}`);
      fetchFraudAlerts();
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'pending' || a.status === 'under_investigation');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved' || a.status === 'false_positive');

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Fraud Detection Engine <ShieldAlert className="w-7 h-7 text-red-500" />
            </h1>
            <p className="text-muted-foreground mt-1">Enterprise-grade anomaly detection and operational risk monitoring.</p>
          </div>
          <Button variant="outline" onClick={fetchFraudAlerts} className="border-white/10 hover:bg-white/5 text-white">
            <RefreshCw className="w-4 h-4 mr-2" /> Scan Systems
          </Button>
        </div>

        {/* Top Risk Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-panel border-red-500/20 bg-red-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Fingerprint className="w-20 h-20 text-red-500" />
            </div>
            <CardContent className="p-6">
              <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Global Risk Score</p>
              <div className="mt-4 flex items-end gap-3">
                <h2 className={`text-6xl font-black ${riskScore > 50 ? 'text-red-500' : 'text-amber-500'}`}>{riskScore}%</h2>
                <div className="mb-2">
                  <p className="text-xs font-bold text-white/60">SYSTEM STATUS:</p>
                  <p className={`text-xs font-black uppercase ${riskScore > 50 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                    {riskScore > 50 ? 'Critical Vulnerability' : 'Operational Stable'}
                  </p>
                </div>
              </div>
              <div className="mt-6 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${riskScore}%` }}
                  className={`h-full ${riskScore > 50 ? 'bg-red-500' : 'bg-amber-500'}`} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/5 bg-white/2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Anomalies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-white">{activeAlerts.length}</h2>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-4 uppercase font-bold">Scanning 1,400+ daily operational vectors</p>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/5 bg-white/2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Integrity Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-emerald-400">98.2%</h2>
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <p className="text-[10px] text-white/40 mt-4 uppercase font-bold">Operational loss within 0.05% margin</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts & Investigation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-4 border-b border-white/5 pb-4">
              <button 
                onClick={() => setActiveTab("active")}
                className={`text-sm font-black uppercase tracking-widest pb-2 transition-all ${activeTab === 'active' ? 'text-red-500 border-b-2 border-red-500' : 'text-white/40 hover:text-white'}`}
              >
                Active Threats ({activeAlerts.length})
              </button>
              <button 
                onClick={() => setActiveTab("history")}
                className={`text-sm font-black uppercase tracking-widest pb-2 transition-all ${activeTab === 'history' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white'}`}
              >
                Resolved History
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              {loading ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full bg-white/5 rounded-2xl" />)
              ) : (activeTab === 'active' ? activeAlerts : resolvedAlerts).length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-20 text-center opacity-30"
                >
                  <ShieldCheck className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-bold">No threats detected</p>
                  <p className="text-sm">Operations are running within security parameters.</p>
                </motion.div>
              ) : (activeTab === 'active' ? activeAlerts : resolvedAlerts).map((alert, i) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className={`glass-panel border-white/5 overflow-hidden group hover:border-white/10 transition-all ${alert.risk_level === 'critical' ? 'bg-red-500/5' : ''}`}>
                    <div className="flex flex-col md:flex-row md:items-center gap-6 p-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${RISK_COLORS[alert.risk_level]}`}>
                        <AlertTriangle className="w-7 h-7" />
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${RISK_COLORS[alert.risk_level]}`}>
                            {alert.risk_level} Risk
                          </span>
                          <span className="text-[10px] font-bold text-white/30 uppercase">{alert.fraud_type.replace('_', ' ')}</span>
                        </div>
                        <h3 className="text-lg font-black text-white">{alert.description}</h3>
                        <p className="text-xs text-white/40 flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-primary" /> AI Signature: {alert.evidence?.reasoning || "Anomalous operational pattern detected."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {alert.status === 'pending' || alert.status === 'under_investigation' ? (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => handleResolve(alert.id, 'resolved')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase h-9"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleResolve(alert.id, 'false_positive')}
                              className="text-white/40 hover:text-red-400 font-bold text-[10px] uppercase h-9"
                            >
                              <XCircle className="w-3 h-3 mr-1" /> False Positive
                            </Button>
                          </>
                        ) : (
                          <div className="text-[10px] font-black uppercase px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/60">
                            {alert.status.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Side Panel: Forensic Stats */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="glass-panel border-white/5 overflow-hidden">
              <CardHeader className="bg-white/2 pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" /> Operational Loss Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { day: 'Mon', loss: 200 },
                      { day: 'Tue', loss: 450 },
                      { day: 'Wed', loss: 300 },
                      { day: 'Thu', loss: 800 },
                      { day: 'Fri', loss: 600 },
                      { day: 'Sat', loss: 1200 },
                      { day: 'Sun', loss: 900 },
                    ]}>
                      <defs>
                        <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" hide />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                        itemStyle={{ color: '#ef4444' }}
                      />
                      <Area type="monotone" dataKey="loss" stroke="#ef4444" fillOpacity={1} fill="url(#colorLoss)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/5 bg-white/2">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" /> Intelligence Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { time: "20:15", log: "Sales vector analysis complete" },
                  { time: "19:42", log: "Attendance pattern verified" },
                  { time: "18:05", log: "Fuel sensor drift detected" },
                  { time: "16:30", log: "New forensic model deployed" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 text-[10px] border-b border-white/5 pb-2 last:border-0">
                    <span className="text-white/20 font-mono">[{item.time}]</span>
                    <span className="text-white/60 uppercase font-bold tracking-tighter">{item.log}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
