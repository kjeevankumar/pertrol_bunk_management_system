"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import dynamic from "next/dynamic";

const FuelDistributionChart = dynamic(
  () => import("@/components/dashboard/DashboardCharts").then(mod => mod.FuelDistributionChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[220px] w-full bg-white/5 rounded-2xl" />
  }
);

const PaymentSplitChart = dynamic(
  () => import("@/components/dashboard/DashboardCharts").then(mod => mod.PaymentSplitChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[200px] w-[200px] mx-auto bg-white/5 rounded-full" />
  }
);

import { TrendingUp, Plus, IndianRupee, Fuel, CreditCard, Banknote, Smartphone, CheckCircle2, Loader2, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const saleSchema = z.object({
  fuel_type: z.string().min(1, "Select fuel type"),
  volume: z.coerce.number().positive("Must be positive"),
  total_amount: z.coerce.number().positive("Must be positive"),
  payment_method: z.string().min(1, "Select payment method"),
});
type SaleForm = z.infer<typeof saleSchema>;

const FUEL_COLORS: Record<string, string> = {
  petrol: "#3b82f6",
  diesel: "#10b981",
  premium_petrol: "#f59e0b",
  cng: "#8b5cf6",
};

interface SalesClientProps {
  initialSales: any[];
}

export default function SalesClient({ initialSales }: SalesClientProps) {
  const [sales, setSales] = useState<any[]>(initialSales);
  const [loading, setLoading] = useState(() => {
    const hasData = initialSales && initialSales.length > 0;
    return !hasData;
  });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [closingSummary, setClosingSummary] = useState<any>(null);
  const [isClosingOpen, setIsClosingOpen] = useState(false);
  const supabase = createClient();

  const form = useForm<SaleForm>({ resolver: zodResolver(saleSchema) as any, defaultValues: { fuel_type: "", volume: 0, total_amount: 0, payment_method: "" } });

  const fetchSales = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("sales").select("*").gte("created_at", `${today}T00:00:00Z`).order("created_at", { ascending: false });
      if (data) setSales(data);
    } catch (error) {
      console.error("Failed to fetch sales data:", error);
      toast.error("Failed to sync sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hasData = initialSales && initialSales.length > 0;
    if (!hasData) {
      fetchSales(true);
    }

    let timeoutId: NodeJS.Timeout;
    const debouncedFetch = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        fetchSales(true);
      }, 1000);
    };

    const channel = supabase.channel("realtime_sales_page")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, debouncedFetch)
      .subscribe();

    return () => {
      clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, []);

  // Derived analytics
  const totalRevenue = sales.reduce((s, x) => s + Number(x.total_amount), 0);
  const totalVolume = sales.reduce((s, x) => s + Number(x.volume), 0);
  const avgSale = sales.length ? totalRevenue / sales.length : 0;
  const cashSales = sales.filter(s => s.payment_method === "cash").reduce((a, s) => a + Number(s.total_amount), 0);
  const upiSales = sales.filter(s => s.payment_method === "upi").reduce((a, s) => a + Number(s.total_amount), 0);
  const cardSales = sales.filter(s => s.payment_method === "card").reduce((a, s) => a + Number(s.total_amount), 0);

  const fuelBreakdown = ["petrol", "diesel", "premium_petrol", "cng"].map(ft => ({
    name: ft.replace("_", " ").toUpperCase(),
    value: sales.filter(s => s.fuel_type === ft).reduce((a, s) => a + Number(s.total_amount), 0),
    fill: FUEL_COLORS[ft],
  })).filter(f => f.value > 0);

  const paymentData = [
    { name: "Cash", value: cashSales, fill: "#10b981" },
    { name: "UPI", value: upiSales, fill: "#3b82f6" },
    { name: "Card", value: cardSales, fill: "#8b5cf6" },
  ].filter(p => p.value > 0);

  const handleAddSale = async (data: SaleForm) => {
    try {
      const { data: branches } = await supabase.from("branches").select("id").limit(1);
      const branchId = branches?.[0]?.id ?? null;
      const pricePerUnit = data.volume > 0 ? data.total_amount / data.volume : 0;

      const { error } = await supabase.from("sales").insert({
        branch_id: branchId,
        fuel_type: data.fuel_type,
        volume: data.volume,
        total_amount: data.total_amount,
        price_per_unit: pricePerUnit,
        payment_method: data.payment_method,
      });
      if (error) throw new Error(error.message);

      // Reduce fuel stock
      const { data: stock } = await supabase.from("fuel_stock").select("id, current_stock").eq("fuel_type", data.fuel_type).limit(1);
      if (stock && stock[0]) {
        const newStock = Math.max(0, Number(stock[0].current_stock) - data.volume);
        await supabase.from("fuel_stock").update({ current_stock: newStock, updated_at: new Date().toISOString() }).eq("id", stock[0].id);
      }

      await supabase.from("activity_logs").insert({ action: `Sale: ₹${data.total_amount} (${data.fuel_type})`, entity_type: "sales" });
      toast.success("Sale recorded!", { description: `₹${data.total_amount.toLocaleString()} via ${data.payment_method.toUpperCase()}` });
      setIsAddOpen(false);
      form.reset();
    } catch (err: any) {
      toast.error("Failed", { description: err.message });
    }
  };

  const handleDayClose = async () => {
    setIsClosing(true);
    try {
      const { data: branches } = await supabase.from("branches").select("id").limit(1);
      const branchId = branches?.[0]?.id ?? null;
      const today = new Date().toISOString().split("T")[0];
      const { data: expenses } = await supabase.from("expenses").select("amount").gte("date", today);
      const totalExpenses = expenses?.reduce((a, e) => a + Number(e.amount), 0) ?? 0;
      const profit = totalRevenue - totalExpenses;
      const variance = cashSales - cashSales; // In real life: actualCash - expectedCash

      // Call Gemini AI for summary
      let aiSummary = `Total revenue ₹${totalRevenue.toLocaleString()} across ${sales.length} transactions. Profit: ₹${profit.toLocaleString()}.`;
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: "Generate a brief professional daily closing summary for this petrol station.",
            context: { totalRevenue, totalVolume, totalExpenses, profit, transactions: sales.length, paymentBreakdown: { cashSales, upiSales, cardSales } }
          }),
        });
        const aiData = await res.json();
        if (aiData.response) aiSummary = aiData.response;
      } catch { /* Gemini optional */ }

      const { error } = await supabase.from("daily_closing").insert({
        branch_id: branchId,
        closing_date: today,
        total_sales: totalRevenue,
        total_cash: cashSales,
        total_upi: upiSales,
        total_card: cardSales,
        expected_cash: cashSales,
        actual_cash: cashSales,
        variance,
        total_expenses: totalExpenses,
        profit,
        ai_summary: aiSummary,
      });
      if (error) throw new Error(error.message);

      setClosingSummary({ totalRevenue, profit, totalExpenses, transactions: sales.length, aiSummary });
      setIsClosingOpen(true);
      toast.success("Day closed successfully!");
    } catch (err: any) {
      toast.error("Failed to close day", { description: err.message });
    }
    setIsClosing(false);
  };

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-4 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Sales & Revenue <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Realtime revenue intelligence and transaction monitoring.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger render={<Button className="h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-4 bg-primary hover:bg-primary/90 text-white font-bold shadow-[0_0_15px_rgba(0,102,255,0.3)]" />}>
                <Plus className="w-4 h-4 mr-2" /> Add Sale
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-[420px] glass-panel border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Record New Sale</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleAddSale)} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Fuel Type</Label>
                    <select {...form.register("fuel_type")} className="w-full bg-background/50 border border-white/10 rounded-md p-2 text-white">
                      <option value="">Select fuel...</option>
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="premium_petrol">Premium Petrol</option>
                      <option value="cng">CNG</option>
                    </select>
                    {form.formState.errors.fuel_type && <p className="text-red-400 text-xs">{form.formState.errors.fuel_type.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Volume (L)</Label>
                      <Input type="number" step="0.01" {...form.register("volume")} className="bg-background/50 border-white/10" placeholder="e.g. 20.5" />
                      {form.formState.errors.volume && <p className="text-red-400 text-xs">{form.formState.errors.volume.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (₹)</Label>
                      <Input type="number" step="0.01" {...form.register("total_amount")} className="bg-background/50 border-white/10" placeholder="e.g. 2100" />
                      {form.formState.errors.total_amount && <p className="text-red-400 text-xs">{form.formState.errors.total_amount.message}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <select {...form.register("payment_method")} className="w-full bg-background/50 border border-white/10 rounded-md p-2 text-white">
                      <option value="">Select method...</option>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="credit">Credit</option>
                    </select>
                    {form.formState.errors.payment_method && <p className="text-red-400 text-xs">{form.formState.errors.payment_method.message}</p>}
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 font-bold mt-2">Save Sale</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={handleDayClose} disabled={isClosing} className="h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-4 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
              {isClosing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {isClosing ? "Closing..." : "Close Day"}
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Revenue Today", value: `₹${totalRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
            { label: "Transactions", value: loading ? "—" : sales.length.toString(), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
            { label: "Volume Sold (L)", value: totalVolume.toFixed(1), icon: Fuel, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
            { label: "Avg Sale Value", value: `₹${avgSale.toFixed(0)}`, icon: CreditCard, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
          ].map((card) => (
            <Card key={card.label} className={`glass-panel border ${card.border}`}>
              <CardContent className="p-3 sm:p-5 flex items-center gap-2 sm:gap-3">
                <div className={`p-2 sm:p-2.5 ${card.bg} rounded-lg sm:rounded-xl shrink-0`}>
                  <card.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wide truncate">{card.label}</p>
                  {loading ? <Skeleton className="h-5 sm:h-7 w-16 sm:w-20 mt-1 bg-white/10" /> : <h3 className={`text-base sm:text-2xl font-black mt-0.5 sm:mt-1 ${card.color} truncate`}>{card.value}</h3>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payment Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Cash", value: cashSales, icon: Banknote, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "UPI", value: upiSales, icon: Smartphone, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Card", value: cardSales, icon: CreditCard, color: "text-purple-400", bg: "bg-purple-500/10" },
          ].map((p) => (
            <Card key={p.label} className="glass-panel border-white/5">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${p.bg} rounded-lg`}><p.icon className={`w-4 h-4 ${p.color}`} /></div>
                  <span className="text-white font-semibold">{p.label}</span>
                </div>
                {loading ? <Skeleton className="h-6 w-24 bg-white/10" /> : <span className={`text-lg font-black ${p.color}`}>₹{p.value.toLocaleString()}</span>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-panel border-white/5 lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue by Fuel Type</CardTitle>
              <CardDescription>Today's sales distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {fuelBreakdown.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No sales recorded today.</div>
              ) : (
                <FuelDistributionChart data={fuelBreakdown} />
              )}
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/5">
            <CardHeader>
              <CardTitle>Payment Split</CardTitle>
              <CardDescription>Today's method distribution</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {paymentData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">No payments today.</div>
              ) : (
                <PaymentSplitChart data={paymentData} />
              )}
              <div className="flex gap-4 mt-2">
                {paymentData.map(p => (
                  <div key={p.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }}></span>{p.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Transaction Feed */}
        <Card className="glass-panel border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Live Transaction Feed
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </CardTitle>
            <CardDescription>Realtime sales log for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground hidden sm:table-cell">Time</TableHead>
                    <TableHead className="text-muted-foreground">Fuel</TableHead>
                    <TableHead className="text-muted-foreground">Volume (L)</TableHead>
                    <TableHead className="text-muted-foreground">Payment</TableHead>
                    <TableHead className="text-right text-muted-foreground">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(4).fill(0).map((_, i) => (
                      <TableRow key={i} className="border-white/5">
                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16 bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20 bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-14 bg-white/5" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 ml-auto bg-white/5" /></TableCell>
                      </TableRow>
                    ))
                  ) : sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No sales recorded today. Click "Add Sale" to begin.</TableCell>
                    </TableRow>
                  ) : sales.map(sale => (
                    <TableRow key={sale.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">{new Date(sale.created_at).toLocaleTimeString()}</TableCell>
                      <TableCell>
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase border" style={{ color: FUEL_COLORS[sale.fuel_type] ?? "#fff", borderColor: (FUEL_COLORS[sale.fuel_type] ?? "#fff") + "40", backgroundColor: (FUEL_COLORS[sale.fuel_type] ?? "#fff") + "15" }}>
                          {sale.fuel_type.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-white">{Number(sale.volume).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${sale.payment_method === "cash" ? "bg-emerald-500/10 text-emerald-400" : sale.payment_method === "upi" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}>
                          {sale.payment_method}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-400">₹{Number(sale.total_amount).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Day Closing Summary Modal */}
        <Dialog open={isClosingOpen} onOpenChange={setIsClosingOpen}>
          <DialogContent className="sm:max-w-[520px] glass-panel border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" /> Daily Closing Report
              </DialogTitle>
            </DialogHeader>
            {closingSummary && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                    <p className="text-xs text-emerald-400 font-semibold uppercase mb-1">Total Revenue</p>
                    <p className="text-2xl font-black text-white">₹{closingSummary.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-center">
                    <p className="text-xs text-primary font-semibold uppercase mb-1">Net Profit</p>
                    <p className="text-2xl font-black text-white">₹{closingSummary.profit.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                    <p className="text-xs text-muted-foreground font-semibold uppercase mb-1">Transactions</p>
                    <p className="text-2xl font-black text-white">{closingSummary.transactions}</p>
                  </div>
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                    <p className="text-xs text-red-400 font-semibold uppercase mb-1">Total Expenses</p>
                    <p className="text-2xl font-black text-white">₹{closingSummary.totalExpenses.toLocaleString()}</p>
                  </div>
                </div>
                {closingSummary.aiSummary && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <p className="text-xs text-primary font-semibold uppercase mb-2">AI Operational Summary</p>
                    <p className="text-sm text-white/80 leading-relaxed">{closingSummary.aiSummary}</p>
                  </div>
                )}
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold" onClick={() => setIsClosingOpen(false)}>
                  <Download className="w-4 h-4 mr-2" /> Confirm & Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
