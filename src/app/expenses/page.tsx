"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { 
  Wallet, Plus, TrendingUp, TrendingDown, DollarSign, 
  BarChart3, PieChart, Activity, Sparkles, Filter, 
  Download, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart as RePieChart, Pie 
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  "Fuel Transport", "Electricity", "Water", "Maintenance", 
  "Salaries", "Repairs", "Equipment", "Miscellaneous"
];

const PAYMENT_METHODS = ["cash", "card", "upi", "bank_transfer", "credit"];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e', '#14b8a6'];

export default function FinancialIntelligence() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    revenueToday: 0,
    expensesToday: 0,
    netProfit: 0,
    monthlyProfit: 0,
    expenseRatio: 0,
    operationalCost: 0,
    profitMargin: 0
  });

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    expense_title: "",
    category: "",
    amount: "",
    vendor_name: "",
    payment_method: "cash",
    description: "",
    date: ""
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfToday = new Date(now.setHours(0,0,0,0)).toISOString();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { data: expensesData }, 
        { data: salesData },
        { data: catsData }
      ] = await Promise.all([
        supabase.from("expenses").select("*").order("date", { ascending: false }),
        supabase.from("sales").select("*").gte("created_at", startOfMonth),
        supabase.from("expense_categories").select("*")
      ]);

      if (expensesData) setExpenses(expensesData);
      if (salesData) setSales(salesData);
      if (catsData) setCategories(catsData);

      // Calculate Stats
      const todayStr = new Date().toISOString().split('T')[0];
      const revenueToday = salesData?.filter(s => s.created_at.startsWith(todayStr))
        .reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
      
      const expensesToday = expensesData?.filter(e => e.date === todayStr)
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const monthlyRevenue = salesData?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
      const monthlyExpenses = expensesData?.filter(e => e.date >= startOfMonth.split('T')[0])
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const netProfit = revenueToday - expensesToday;
      const monthlyProfit = monthlyRevenue - monthlyExpenses;
      const profitMargin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;
      const expenseRatio = monthlyRevenue > 0 ? (monthlyExpenses / monthlyRevenue) * 100 : 0;

      setStats({
        revenueToday,
        expensesToday,
        netProfit,
        monthlyProfit,
        expenseRatio,
        operationalCost: monthlyExpenses,
        profitMargin
      });
    } catch (error) {
      console.error("Failed to fetch expenses data:", error);
      toast.error("Failed to sync financial data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setFormData(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
    fetchData();

    const channel = supabase.channel('financial_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: branch } = await supabase.from('branches').select('id').limit(1).single();
      
      const { error } = await supabase.from("expenses").insert({
        branch_id: branch?.id || null,
        category: formData.category,
        amount: Number(formData.amount),
        description: formData.description,
        date: formData.date,
        expense_title: formData.expense_title,
        vendor_name: formData.vendor_name,
        payment_method: formData.payment_method,
        recorded_by: user?.id || null
      });

      if (error) throw error;

      await logAudit({
        action_type: "create",
        module_name: "expenses",
        description: `Added expense: ${formData.expense_title} (₹${formData.amount})`,
        updated_data: formData
      });

      toast.success("Expense added successfully");
      setIsAddOpen(false);
      setFormData({
        expense_title: "",
        category: "",
        amount: "",
        vendor_name: "",
        payment_method: "cash",
        description: "",
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err: any) {
      toast.error("Failed to add expense", { description: err.message });
    }
  };

  const generateAiInsights = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Analyze these financial stats for a petrol bunk and provide 4 actionable enterprise-level insights on profit optimization and cost control.",
          context: { stats, topExpenses: expenses.slice(0, 5) }
        })
      });
      const data = await res.json();
      if (data.response) {
        setAiInsights(data.response.split('\n').filter((l: string) => l.trim() !== ''));
      }
    } catch {
      toast.error("AI Insights failed to load");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Chart Data
  const expensesByCategory = expenses.reduce((acc: any, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
    return acc;
  }, {});

  const pieData = Object.keys(expensesByCategory).map(key => ({
    name: key,
    value: expensesByCategory[key]
  }));

  const dailyTrend = expenses.slice(0, 10).reverse().map(e => ({
    date: e.date,
    amount: Number(e.amount)
  }));

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-4 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2"
            >
              Financial Intelligence <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </motion.h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Real-time enterprise profit monitoring and expense analytics.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button variant="outline" onClick={fetchData} className="h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-4 border-white/10 hover:bg-white/5 text-white">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger render={<Button className="h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:scale-105" />}>
                  <Plus className="w-4 h-4 mr-2" /> Log Expense
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-[500px] glass-panel border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black">Record Enterprise Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddExpense} className="grid grid-cols-2 gap-4 mt-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="title">Expense Title</Label>
                    <Input id="title" required value={formData.expense_title} onChange={e => setFormData({...formData, expense_title: e.target.value})} className="bg-white/5 border-white/10" placeholder="e.g. Maintenance for Tank A" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <select 
                      id="category" required 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-white h-10"
                    >
                      <option value="" className="bg-slate-900">Select category...</option>
                      {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input id="amount" type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="bg-white/5 border-white/10" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor / Payee</Label>
                    <Input id="vendor" required value={formData.vendor_name} onChange={e => setFormData({...formData, vendor_name: e.target.value})} className="bg-white/5 border-white/10" placeholder="e.g. Bharat Petroleum" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="method">Payment Method</Label>
                    <select 
                      id="method" required 
                      value={formData.payment_method} 
                      onChange={e => setFormData({...formData, payment_method: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-white h-10"
                    >
                      {PAYMENT_METHODS.map(m => <option key={m} value={m} className="bg-slate-900">{m.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-white/5 border-white/10" placeholder="Additional details..." />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="bg-white/5 border-white/10" />
                  </div>
                  <Button type="submit" className="col-span-2 bg-emerald-600 hover:bg-emerald-700 font-bold mt-2">Record Transaction</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Revenue (Today)", value: `₹${stats.revenueToday.toLocaleString()}`, icon: ArrowUpRight, color: "text-emerald-400", trend: "+12%" },
            { label: "Expenses (Today)", value: `₹${stats.expensesToday.toLocaleString()}`, icon: ArrowDownRight, color: "text-red-400", trend: "-5%" },
            { label: "Net Profit (Today)", value: `₹${stats.netProfit.toLocaleString()}`, icon: TrendingUp, color: "text-primary", trend: "+8%" },
            { label: "Monthly Profit", value: `₹${stats.monthlyProfit.toLocaleString()}`, icon: BarChart3, color: "text-amber-400", trend: "+15%" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="min-w-0"
            >
              <Card className="glass-panel border-white/5 overflow-hidden group h-full">
                <div className={`absolute top-0 left-0 w-1 h-full ${stat.color.replace('text-', 'bg-')}`} />
                <CardContent className="p-3 sm:p-5 flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wide truncate">{stat.label}</p>
                    <stat.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${stat.color} shrink-0`} />
                  </div>
                  <div className="mt-1.5 sm:mt-2 flex items-baseline flex-wrap gap-1 sm:gap-2 min-w-0">
                    <h3 className="text-base sm:text-2xl font-black text-white truncate">{loading ? <Skeleton className="h-5 sm:h-8 w-16 sm:w-24 bg-white/10" /> : stat.value}</h3>
                    <span className={`text-[9px] sm:text-[10px] font-bold ${stat.color} shrink-0`}>{stat.trend}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Middle Section: Charts & AI */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Profit Chart */}
          <Card className="lg:col-span-2 glass-panel border-white/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" /> Profit & Expense Flow
                </CardTitle>
                <CardDescription>Daily financial movement tracking</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-white"><Filter className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-white"><Download className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrend}>
                    <defs>
                      <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={11} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    />
                    <YAxis 
                      stroke="rgba(255,255,255,0.3)" 
                      fontSize={11} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₹${val/1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* AI Intelligence Panel */}
          <Card className="glass-panel border-primary/20 bg-primary/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-24 h-24 text-primary" />
            </div>
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                <Sparkles className="w-5 h-5" /> AI Financial Intel
              </CardTitle>
              <CardDescription>Intelligent cost & profit optimization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 min-h-[200px]">
                {isAiLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full bg-white/5" />
                    <Skeleton className="h-4 w-[90%] bg-white/5" />
                    <Skeleton className="h-4 w-[95%] bg-white/5" />
                  </div>
                ) : aiInsights.length > 0 ? (
                  aiInsights.map((insight, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex gap-2 text-sm text-white/80"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <p>{insight}</p>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-40">
                    <Activity className="w-12 h-12 mb-2" />
                    <p className="text-xs">No insights generated yet</p>
                  </div>
                )}
              </div>
              <Button 
                onClick={generateAiInsights} 
                disabled={isAiLoading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold"
              >
                {isAiLoading ? "Analyzing Data..." : "Generate AI Insights"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section: Categories & Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Expense Distribution */}
          <Card className="glass-panel border-white/5">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <PieChart className="w-4 h-4 text-amber-400" /> Cost Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {pieData.slice(0, 4).map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-bold text-white">₹{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Financial Ledger */}
          <Card className="lg:col-span-3 glass-panel border-white/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Financial Ledger</CardTitle>
                <CardDescription>Comprehensive expenditure audit trail</CardDescription>
              </div>
              <div className="flex gap-2">
                <Input placeholder="Search vendor or title..." className="w-48 bg-white/5 border-white/10 text-xs h-9" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-muted-foreground text-xs uppercase">Date</TableHead>
                      <TableHead className="text-muted-foreground text-xs uppercase">Title & Category</TableHead>
                      <TableHead className="text-muted-foreground text-xs uppercase hidden md:table-cell">Vendor</TableHead>
                      <TableHead className="text-muted-foreground text-xs uppercase hidden sm:table-cell">Method</TableHead>
                      <TableHead className="text-right text-muted-foreground text-xs uppercase">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array(5).fill(0).map((_, i) => (
                        <TableRow key={i} className="border-white/5">
                          <TableCell><Skeleton className="h-4 w-12 bg-white/5" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32 bg-white/5" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20 bg-white/5" /></TableCell>
                          <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16 bg-white/5" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 ml-auto bg-white/5" /></TableCell>
                        </TableRow>
                      ))
                    ) : expenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No transactions recorded.</TableCell>
                      </TableRow>
                    ) : expenses.map((exp) => (
                      <TableRow key={exp.id} onClick={() => setSelectedExpense(exp)} className="cursor-pointer border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-bold text-white">{exp.expense_title || exp.description}</p>
                            <p className="text-[10px] text-muted-foreground uppercase">{exp.category}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-white/70 hidden md:table-cell">
                          {exp.vendor_name || "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-muted-foreground border border-white/10 uppercase">
                            {exp.payment_method}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-black text-red-400">
                          ₹{Number(exp.amount).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <SheetContent className="glass-panel border-white/10 text-white w-full sm:max-w-[450px]">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold text-white">Expense Detail</SheetTitle>
            <SheetDescription className="text-muted-foreground text-sm">
              Expenditure audit statement for transaction record
            </SheetDescription>
          </SheetHeader>
          {selectedExpense && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="p-3 bg-red-500/10 rounded-xl"><DollarSign className="w-6 h-6 text-red-400" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Total Cost</p>
                  <h3 className="text-3xl font-black text-red-400 mt-1">₹{Number(selectedExpense.amount).toLocaleString()}</h3>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white/50 uppercase tracking-wider">Transaction Info</h4>
                <div className="divide-y divide-white/5">
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">Expense Title</span>
                    <span className="text-white font-semibold">{selectedExpense.expense_title || "—"}</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">Category</span>
                    <span className="text-white font-semibold uppercase">{selectedExpense.category}</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">Vendor / Payee</span>
                    <span className="text-white font-semibold">{selectedExpense.vendor_name || "—"}</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="text-white font-semibold uppercase">{selectedExpense.payment_method}</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">Transaction Date</span>
                    <span className="text-white font-semibold">{new Date(selectedExpense.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {selectedExpense.description && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-white/50 uppercase tracking-wider">Description</h4>
                  <p className="text-sm text-white/80 leading-relaxed bg-white/5 rounded-xl p-3 border border-white/10">{selectedExpense.description}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
        </div>
      </div>
    </DashboardLayout>
  );
}
