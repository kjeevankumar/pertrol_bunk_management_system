"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Bell, AlertTriangle, Zap, Settings, ShieldAlert,
  Terminal, Activity, Clock, Plus, Play, Pause,
  CheckCircle2, XCircle, Search, Filter, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const SEVERITY_COLORS: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function AlertCommandCenter() {
  const [rules, setRules] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"rules" | "automation">("rules");
  
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: rulesData },
        { data: logsData }
      ] = await Promise.all([
        supabase.from('alert_rules').select('*').order('created_at', { ascending: false }),
        supabase.from('automation_logs').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      if (rulesData) setRules(rulesData);
      if (logsData) setLogs(logsData);
    } catch (error) {
      console.error("Failed to fetch alerts data:", error);
      toast.error("Failed to sync automation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleRule = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('alert_rules')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (!error) {
      setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !currentStatus } : r));
      toast.success(`Rule ${!currentStatus ? 'activated' : 'deactivated'}`);
    }
  };

  const runAutomationManually = async (type: string) => {
    toast.promise(
      fetch("/api/ai/process", { method: "POST" }),
      {
        loading: `Executing ${type.replace('_', ' ')} workflow...`,
        success: "Automation workflow completed successfully",
        error: "Workflow execution failed"
      }
    );
    fetchData();
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Operational Automation <Zap className="w-7 h-7 text-primary" />
            </h1>
            <p className="text-muted-foreground mt-1">Configure alert thresholds and automated business workflows.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchData} className="border-white/10 hover:bg-white/5 text-white">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold">
              <Plus className="w-4 h-4 mr-2" /> New Alert Rule
            </Button>
          </div>
        </div>

        {/* Top Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Active Rules", value: rules.filter(r => r.is_active).length, icon: Settings, color: "text-primary" },
            { label: "Automations Today", value: logs.length, icon: Zap, color: "text-amber-400" },
            { label: "Critical Triggers", value: 0, icon: AlertTriangle, color: "text-red-400" },
            { label: "System Uptime", value: "99.9%", icon: Activity, color: "text-emerald-400" },
          ].map((stat) => (
            <Card key={stat.label} className="glass-panel border-white/5 bg-white/2">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-xl font-black text-white">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4">
            <button 
              onClick={() => setActiveTab("rules")}
              className={`text-sm font-black uppercase tracking-widest pb-2 transition-all ${activeTab === 'rules' ? 'text-primary border-b-2 border-primary' : 'text-white/40 hover:text-white'}`}
            >
              Alert Rules
            </button>
            <button 
              onClick={() => setActiveTab("automation")}
              className={`text-sm font-black uppercase tracking-widest pb-2 transition-all ${activeTab === 'automation' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white'}`}
            >
              Automation Logs
            </button>
          </div>

          {activeTab === 'rules' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {loading ? (
                Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-40 w-full bg-white/5 rounded-2xl" />)
              ) : rules.map((rule) => (
                <Card key={rule.id} className={cn(
                  "glass-panel border-white/5 overflow-hidden transition-all group",
                  !rule.is_active && "opacity-50"
                )}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase border", SEVERITY_COLORS[rule.severity])}>
                            {rule.severity} Priority
                          </span>
                          <span className="text-[10px] font-bold text-white/30 uppercase">ID: {rule.id.substring(0, 8)}</span>
                        </div>
                        <h3 className="text-lg font-black text-white">{rule.rule_name}</h3>
                      </div>
                      <Switch 
                        checked={rule.is_active} 
                        onCheckedChange={() => toggleRule(rule.id, rule.is_active)}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                    
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Condition:</span>
                        <code className="text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">{JSON.stringify(rule.trigger_condition)}</code>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Last Trigger:</span>
                        <span className="text-white">Never</span>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                      <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black text-white/40 hover:text-white">
                        Edit Rule
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => runAutomationManually(rule.rule_name)}
                        className="text-[10px] uppercase font-black text-primary hover:bg-primary/5 ml-auto"
                      >
                        <Play className="w-3 h-3 mr-1" /> Test Trigger
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass-panel border-white/5 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent bg-white/2">
                    <TableHead className="text-muted-foreground text-xs uppercase font-black">Timestamp</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase font-black">Automation Type</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase font-black">Action Performed</TableHead>
                    <TableHead className="text-muted-foreground text-xs uppercase font-black">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20 opacity-30">
                        <Terminal className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-sm font-bold uppercase">No automation events recorded</p>
                      </TableCell>
                    </TableRow>
                  ) : logs.map((log) => (
                    <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="text-[10px] font-mono text-white/40">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase">
                          {log.automation_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-white/80">{log.action_performed}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {log.status === 'success' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className={cn(
                            "text-[10px] font-black uppercase",
                            log.status === 'success' ? 'text-emerald-500' : 'text-red-500'
                          )}>{log.status}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
