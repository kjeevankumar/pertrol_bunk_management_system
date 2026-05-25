"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  History, Search, Download, 
  Terminal, ShieldCheck, User,
  ChevronLeft, ChevronRight, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { downloadCSV } from "@/lib/export-utils";

const ENTITY_COLORS: Record<string, string> = {
  sales: "text-emerald-400 bg-emerald-500/10",
  fuel: "text-amber-400 bg-amber-500/10",
  attendance: "text-primary bg-primary/10",
  payroll: "text-purple-400 bg-purple-500/10",
  expenses: "text-red-400 bg-red-500/10",
  security: "text-orange-400 bg-orange-500/10",
  ai: "text-blue-400 bg-blue-500/10",
  system: "text-white/40 bg-white/5",
};

interface ActivityClientProps {
  initialLogs: any[];
}

export default function ActivityClient({ initialLogs }: ActivityClientProps) {
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isInitialMount, setIsInitialMount] = useState(true);
  const supabase = createClient();

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('activity_logs')
      .select('*, users(email)')
      .order('created_at', { ascending: false })
      .range(page * 20, (page + 1) * 20 - 1);

    if (searchQuery) {
      query = query.ilike('action', `%${searchQuery}%`);
    }

    const { data } = await query;
    if (data) setLogs(data);
    setLoading(false);
  };

  const handleExport = () => {
    downloadCSV(logs, "smartfuel_audit_ledger");
  };

  useEffect(() => {
    if (isInitialMount) {
      setIsInitialMount(false);
      if (initialLogs && initialLogs.length > 0) {
        return;
      }
    }
    fetchLogs();
  }, [page, searchQuery]);

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Audit Ledger <History className="w-7 h-7 text-primary" />
            </h1>
            <p className="text-muted-foreground mt-1">Immutable record of all branch operations and security events.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleExport}
              disabled={logs.length === 0}
              className="border-white/10 text-white hover:bg-white/5"
            >
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button onClick={fetchLogs} className="bg-primary hover:bg-primary/90 text-white font-bold">
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <Input 
              placeholder="Search action logs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-white/2 border-white/5 focus:bg-white/5 transition-all" 
            />
          </div>
          <div className="flex gap-2">
            {['sales', 'fuel', 'security', 'ai'].map(type => (
              <Button key={type} onClick={() => setSearchQuery(type)} variant="outline" size="sm" className="border-white/5 bg-white/2 text-[10px] uppercase font-black tracking-widest text-white/40 hover:text-white">
                {type}
              </Button>
            ))}
          </div>
        </div>

        {/* Log Table */}
        <Card className="glass-panel border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent bg-white/2">
                  <TableHead className="text-[10px] uppercase font-black text-muted-foreground">Timestamp</TableHead>
                  <TableHead className="text-[10px] uppercase font-black text-muted-foreground">Entity</TableHead>
                  <TableHead className="text-[10px] uppercase font-black text-muted-foreground">Operator</TableHead>
                  <TableHead className="text-[10px] uppercase font-black text-muted-foreground">Action Performed</TableHead>
                  <TableHead className="text-right text-[10px] uppercase font-black text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array(10).fill(0).map((_, i) => (
                    <TableRow key={i} className="border-white/5">
                      <TableCell colSpan={5}><Skeleton className="h-10 w-full bg-white/5" /></TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 opacity-30">
                      <Terminal className="w-12 h-12 mx-auto mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest">No activity recorded</p>
                    </TableCell>
                  </TableRow>
                ) : logs.map((log) => (
                  <TableRow key={log.id} className="border-white/5 hover:bg-white/2 transition-colors">
                    <TableCell className="text-[10px] font-mono text-white/30 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-black uppercase border border-white/5",
                        ENTITY_COLORS[log.entity_type] || "text-white/40 bg-white/5"
                      )}>
                        {log.entity_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-white/60">
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-primary" />
                        {log.users?.email || 'System Engine'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-white font-medium">
                      {log.action}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black uppercase">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
            <p className="text-[10px] text-white/20 uppercase font-black tracking-widest">Page {page + 1} of Ledger</p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="border-white/10 text-white h-8"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled={logs.length < 20}
                onClick={() => setPage(p => p + 1)}
                className="border-white/10 text-white h-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
