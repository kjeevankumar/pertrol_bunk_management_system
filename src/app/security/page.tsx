"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, ShieldAlert, Search, RefreshCw, LogIn, LogOut, Plus, Pencil, Trash2, Download, Eye, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const ACTION_ICONS: Record<string, any> = {
  login: LogIn, logout: LogOut, create: Plus, update: Pencil,
  delete: Trash2, export: Download, ai_query: Eye, view: Eye, resolve: CheckCircle2,
};

const ACTION_COLORS: Record<string, string> = {
  login: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  logout: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  create: "text-primary bg-primary/10 border-primary/20",
  update: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  delete: "text-red-400 bg-red-500/10 border-red-500/20",
  export: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  ai_query: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  view: "text-white/50 bg-white/5 border-white/10",
};

const SEVERITY_STYLE: Record<string, string> = {
  low: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  medium: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  high: "text-red-400 bg-red-500/10 border-red-500/20",
  critical: "text-red-300 bg-red-600/20 border-red-500/40",
};

export default function SecurityPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [failedLogins, setFailedLogins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"audit" | "alerts" | "failed">("alerts");

  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const [{ data: logs }, { data: alerts }, { data: failed }] = await Promise.all([
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("security_alerts").select("*").order("created_at", { ascending: false }),
      supabase.from("failed_logins").select("*").order("attempted_at", { ascending: false }).limit(50),
    ]);
    if (logs) setAuditLogs(logs);
    if (alerts) setSecurityAlerts(alerts);
    if (failed) setFailedLogins(failed);
    setLoading(false);
  };

  const resolveAlert = async (id: string) => {
    const { error } = await supabase.from("security_alerts")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      toast.success("Alert resolved");
      setSecurityAlerts(prev => prev.map(a => a.id === id ? { ...a, is_resolved: true } : a));
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel("security_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "security_alerts" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredLogs = auditLogs.filter(l =>
    l.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.module_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.performed_by_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unresolvedAlerts = securityAlerts.filter(a => !a.is_resolved);

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Security & Audit <ShieldCheck className="w-6 h-6 text-primary" />
            </h1>
            <p className="text-muted-foreground mt-1">Enterprise audit trail, security alerts, and access monitoring.</p>
          </div>
          <Button onClick={fetchData} variant="outline" className="border-white/10 hover:bg-white/5 text-white">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Alerts", value: unresolvedAlerts.length, icon: AlertTriangle, color: unresolvedAlerts.length > 0 ? "text-red-400" : "text-emerald-400", bg: unresolvedAlerts.length > 0 ? "bg-red-500/10" : "bg-emerald-500/10" },
            { label: "Audit Events", value: auditLogs.length, icon: ShieldCheck, color: "text-primary", bg: "bg-primary/10" },
            { label: "Failed Logins", value: failedLogins.length, icon: ShieldAlert, color: "text-orange-400", bg: "bg-orange-500/10" },
            { label: "Security Score", value: `${Math.max(0, 100 - unresolvedAlerts.length * 10 - failedLogins.length * 2)}%`, icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          ].map(c => (
            <Card key={c.label} className="glass-panel border-white/5">
              <CardContent className="p-5 flex items-center gap-3">
                <div className={`p-2.5 ${c.bg} rounded-xl`}><c.icon className={`w-5 h-5 ${c.color}`} /></div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">{c.label}</p>
                  {loading ? <Skeleton className="h-7 w-16 mt-1 bg-white/10" /> : <h3 className={`text-2xl font-black mt-1 ${c.color}`}>{c.value}</h3>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5 w-fit">
          {([["alerts", "Security Alerts"], ["audit", "Audit Log"], ["failed", "Failed Logins"]] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? "bg-primary text-white shadow-[0_0_10px_rgba(0,102,255,0.3)]" : "text-muted-foreground hover:text-white"}`}>
              {label}
              {tab === "alerts" && unresolvedAlerts.length > 0 && (
                <span className="ml-2 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unresolvedAlerts.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Security Alerts Tab */}
        {activeTab === "alerts" && (
          <div className="space-y-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 bg-white/5 rounded-xl" />)
            ) : securityAlerts.length === 0 ? (
              <Card className="glass-panel border-white/5">
                <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                  <ShieldCheck className="w-12 h-12 text-emerald-500/40 mb-3" />
                  <p className="text-white font-semibold">All Systems Secure</p>
                  <p className="text-muted-foreground text-sm mt-1">No security alerts detected.</p>
                </CardContent>
              </Card>
            ) : securityAlerts.map(alert => (
              <div key={alert.id} className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition-all ${alert.is_resolved ? "opacity-50 border-white/5 bg-white/2" : SEVERITY_STYLE[alert.severity] ?? "border-white/10"}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${SEVERITY_STYLE[alert.severity]?.split(" ")[0] ?? "text-white"}`} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white">{alert.title}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${SEVERITY_STYLE[alert.severity]}`}>{alert.severity}</span>
                      {alert.is_resolved && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white/40 border border-white/10">RESOLVED</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                    <p className="text-[11px] text-muted-foreground/50 mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                  </div>
                </div>
                {!alert.is_resolved && (
                  <Button size="sm" onClick={() => resolveAlert(alert.id)} className="shrink-0 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/40 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Resolve
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === "audit" && (
          <Card className="glass-panel border-white/5">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-white/5 pb-4">
              <div>
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>Immutable record of all system actions</CardDescription>
              </div>
              <div className="relative sm:ml-auto sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search logs..." className="pl-9 bg-black/40 border-white/10 text-white" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-black/20 sticky top-0 backdrop-blur-md">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Timestamp</TableHead>
                    <TableHead className="text-muted-foreground">Action</TableHead>
                    <TableHead className="text-muted-foreground">Module</TableHead>
                    <TableHead className="text-muted-foreground">Description</TableHead>
                    <TableHead className="text-muted-foreground">User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(6).fill(0).map((_, i) => (
                      <TableRow key={i} className="border-white/5">
                        <TableCell><Skeleton className="h-4 w-32 bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48 bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28 bg-white/5" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No audit logs found. Actions across the platform will appear here.
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.map(log => {
                    const ActionIcon = ACTION_ICONS[log.action_type] ?? Eye;
                    const colorClass = ACTION_COLORS[log.action_type] ?? "text-white/50 bg-white/5 border-white/10";
                    return (
                      <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="text-muted-foreground text-xs font-mono whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className={`flex items-center gap-1.5 w-fit px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${colorClass}`}>
                            <ActionIcon className="w-3 h-3" />
                            {log.action_type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium text-white/70 capitalize">{log.module_name ?? "—"}</span>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-sm text-white truncate">{log.description}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.performed_by_email ?? "system"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Failed Logins Tab */}
        {activeTab === "failed" && (
          <Card className="glass-panel border-white/5">
            <CardHeader>
              <CardTitle className="text-red-400">Failed Login Attempts</CardTitle>
              <CardDescription>Potential unauthorized access attempts detected by the system</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Timestamp</TableHead>
                    <TableHead className="text-muted-foreground">Email Attempted</TableHead>
                    <TableHead className="text-muted-foreground">Reason</TableHead>
                    <TableHead className="text-muted-foreground">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <TableRow key={i} className="border-white/5">
                        <TableCell><Skeleton className="h-4 w-32 bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40 bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48 bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24 bg-white/5" /></TableCell>
                      </TableRow>
                    ))
                  ) : failedLogins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">No failed login attempts recorded.</p>
                      </TableCell>
                    </TableRow>
                  ) : failedLogins.map(fl => (
                    <TableRow key={fl.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="text-muted-foreground text-xs">{new Date(fl.attempted_at).toLocaleString()}</TableCell>
                      <TableCell className="font-medium text-orange-400">{fl.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fl.reason}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{fl.ip_address ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
