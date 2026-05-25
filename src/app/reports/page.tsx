"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { FileText, Download, TrendingUp, IndianRupee, Fuel, Calendar, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [closings, setClosings] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalProfit: 0, totalFuel: 0, totalTransactions: 0 });
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: sales } = await supabase.from("sales").select("*").gte("created_at", thirtyDaysAgo.toISOString());
    const { data: expenses } = await supabase.from("expenses").select("*").gte("date", thirtyDaysAgo.toISOString().split("T")[0]);
    const { data: closingData } = await supabase.from("daily_closing").select("*").order("closing_date", { ascending: false }).limit(10);
    if (closingData) setClosings(closingData);

    const dailyMap: Record<string, { revenue: number; volume: number; count: number }> = {};
    sales?.forEach(s => {
      const day = s.created_at.substring(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { revenue: 0, volume: 0, count: 0 };
      dailyMap[day].revenue += Number(s.total_amount);
      dailyMap[day].volume += Number(s.volume);
      dailyMap[day].count += 1;
    });
    const sorted = Object.keys(dailyMap).sort().map(d => ({
      date: new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      revenue: Math.round(dailyMap[d].revenue),
      volume: Math.round(dailyMap[d].volume),
      transactions: dailyMap[d].count,
    }));
    setMonthlyData(sorted);

    const totalRevenue = sales?.reduce((a, s) => a + Number(s.total_amount), 0) ?? 0;
    const totalExpenses = expenses?.reduce((a, e) => a + Number(e.amount), 0) ?? 0;
    setSummary({ totalRevenue, totalProfit: totalRevenue - totalExpenses, totalFuel: sales?.reduce((a, s) => a + Number(s.volume), 0) ?? 0, totalTransactions: sales?.length ?? 0 });
    setLoading(false);
  };

  const generateAiReport = async () => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Generate a comprehensive monthly business performance report. Include revenue analysis, trends, and strategic recommendations with clear sections.", context: { summary, dataPoints: monthlyData.length } })
      });
      const data = await res.json();
      if (data.response) setAiReport(data.response);
    } catch { toast.error("AI report generation failed"); }
    setAiLoading(false);
  };

  const exportCSV = () => {
    const rows = [["Date", "Revenue (Rs)", "Volume (L)", "Transactions"], ...monthlyData.map(d => [d.date, d.revenue, d.volume, d.transactions])];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "smartfuel_report.csv"; a.click();
    toast.success("CSV exported");
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">Reports <FileText className="w-6 h-6 text-primary" /></h1>
            <p className="text-muted-foreground mt-1">30-day business intelligence and performance analytics.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchData} className="border-white/10 hover:bg-white/5 text-white"><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
            <Button onClick={exportCSV} className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white"><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
            <Button onClick={generateAiReport} disabled={aiLoading} className="bg-primary hover:bg-primary/90 font-bold">{aiLoading ? "Generating..." : "AI Report"}</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "30-Day Revenue", value: `Rs.${summary.totalRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Net Profit", value: `Rs.${summary.totalProfit.toLocaleString()}`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
            { label: "Fuel Sold (L)", value: summary.totalFuel.toFixed(0), icon: Fuel, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Transactions", value: summary.totalTransactions.toString(), icon: Calendar, color: "text-purple-400", bg: "bg-purple-500/10" },
          ].map(c => (
            <Card key={c.label} className="glass-panel border-white/5">
              <CardContent className="p-5 flex items-center gap-3">
                <div className={`p-2.5 ${c.bg} rounded-xl`}><c.icon className={`w-5 h-5 ${c.color}`} /></div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">{c.label}</p>
                  {loading ? <Skeleton className="h-7 w-20 mt-1 bg-white/10" /> : <h3 className={`text-xl font-black mt-1 ${c.color}`}>{c.value}</h3>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="glass-panel border-white/5">
          <CardHeader><CardTitle>30-Day Revenue Trend</CardTitle><CardDescription>Daily sales over the last month</CardDescription></CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No sales in the last 30 days.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(5,5,15,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px" }} itemStyle={{ color: "#fff" }} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#repGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-panel border-white/5">
            <CardHeader><CardTitle>Daily Transactions</CardTitle></CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data.</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: "rgba(5,5,15,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px" }} itemStyle={{ color: "#fff" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar dataKey="transactions" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/5">
            <CardHeader><CardTitle>Daily Closing Reports</CardTitle><CardDescription>Recent end-of-day summaries</CardDescription></CardHeader>
            <CardContent className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {closings.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">No closing reports yet. Use "Close Day" in Sales.</p>
              ) : closings.map(c => (
                <div key={c.id} className="p-3 rounded-lg border border-white/5 bg-white/3 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-white">{c.closing_date}</p>
                    <p className="text-xs text-muted-foreground">Revenue: Rs.{Number(c.total_sales).toLocaleString()}</p>
                  </div>
                  <p className={`text-sm font-black ${Number(c.profit) >= 0 ? "text-emerald-400" : "text-red-400"}`}>Rs.{Number(c.profit).toLocaleString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {aiReport && (
          <Card className="glass-panel border-primary/20 bg-primary/5">
            <CardHeader><CardTitle className="text-primary">AI Monthly Report</CardTitle><CardDescription>Generated by Gemini AI from your real data</CardDescription></CardHeader>
            <CardContent>
              <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap bg-black/30 rounded-lg p-4 border border-white/5">{aiReport}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
