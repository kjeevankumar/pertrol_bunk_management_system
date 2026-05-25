"use client";

import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, Send, Brain, ShieldAlert, TrendingUp, Activity, 
  RefreshCw, Bot, User, Loader2, Zap, Target, Gauge,
  ArrowUpRight, ArrowDownRight, Info, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [operationalData, setOperationalData] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const supabase = createClient();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchOperationalSnapshot = async () => {
    setIsDataLoading(true);
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const [
        { data: sales },
        { data: expenses },
        { data: fuel },
        { data: attendance },
        { data: existingInsights }
      ] = await Promise.all([
        supabase.from('sales').select('*').gte('created_at', today),
        supabase.from('expenses').select('*').gte('date', today),
        supabase.from('fuel_stock').select('*'),
        supabase.from('attendance').select('*').eq('date', today),
        supabase.from('ai_insights').select('*').order('generated_at', { ascending: false }).limit(5)
      ]);

      const snapshot = {
        sales: {
          total_count: sales?.length || 0,
          total_revenue: sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0,
        },
        expenses: {
          total_today: expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
        },
        fuel: fuel?.map(f => ({ type: f.fuel_type, stock: f.current_stock, capacity: f.capacity })),
        attendance: {
          present: attendance?.filter(a => a.status === 'present').length || 0,
          late: attendance?.filter(a => a.status === 'late').length || 0,
        }
      };

      setOperationalData(snapshot);
      if (existingInsights) setInsights(existingInsights);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    setMessages([
      { 
        role: 'assistant', 
        content: "Hello Manager. I am the SmartFuel AI Intelligence Engine. I have analyzed today's operations. How can I assist you with business intelligence or risk assessment today?", 
        timestamp: new Date() 
      }
    ]);
    fetchOperationalSnapshot();
    
    // Subscribe to new insights
    const channel = supabase.channel('ai_realtime_page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_insights' }, (payload) => {
        setInsights(prev => [payload.new, ...prev].slice(0, 5));
        toast.info("New AI Insight Generated", { description: payload.new.title });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
          context: operationalData
        })
      });

      const data = await res.json();
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response, timestamp: new Date() }]);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (err: any) {
      toast.error("AI Assistant unavailable", { description: err.message });
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting to my intelligence core. Please try again in a moment.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateHealth = () => {
    if (!operationalData) return { op: 0, rev: 0, risk: 0 };
    const op = Math.min(100, ((operationalData.attendance?.present || 0) / 5) * 100);
    const rev = Math.min(100, ((operationalData.sales?.total_revenue || 0) / 50000) * 100);
    const risk = (operationalData.attendance?.late || 0) > 2 ? 60 : 10;
    return { op: Math.round(op), rev: Math.round(rev), risk: Math.round(risk) };
  };

  const scores = calculateHealth();

  return (
    <DashboardLayout>
      <div className="p-3 sm:p-4 lg:p-8 space-y-4 md:space-y-8 max-w-7xl mx-auto h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              AI Command Center <Brain className="w-6 h-6 md:w-7 md:h-7 text-primary animate-pulse" />
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Real-time operational intelligence and business forecasting.</p>
          </div>
          <Button variant="outline" onClick={fetchOperationalSnapshot} className="border-white/10 hover:bg-white/5 text-white h-9 sm:h-10 text-xs sm:text-sm">
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Refresh Data
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
          {/* Left Panel: Health & Insights */}
          <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2 custom-scrollbar no-scrollbar md:block hidden">
            <Card className="glass-panel border-white/5 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                  <Gauge className="w-4 h-4" /> Operational Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Business Efficiency", score: scores.op, color: "bg-emerald-500" },
                  { label: "Revenue Performance", score: scores.rev, color: "bg-blue-500" },
                  { label: "Risk Indicator", score: scores.risk, color: "bg-amber-500" },
                ].map((s) => (
                  <div key={s.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-white/60">{s.label}</span>
                      <span className="text-white">{s.score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${s.score}%` }}
                        className={`h-full ${s.color}`} 
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-white/40 uppercase tracking-widest flex items-center gap-2 px-1">
                <Zap className="w-3 h-3" /> Live Intelligence Feed
              </h3>
              <AnimatePresence mode="popLayout">
                {isDataLoading ? (
                  Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full bg-white/5 rounded-xl" />)
                ) : insights.length === 0 ? (
                  <div className="text-center py-10 opacity-30">
                    <Info className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-xs">No active insights</p>
                  </div>
                ) : insights.map((insight, i) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className={`glass-panel border-white/5 relative overflow-hidden group hover:border-primary/30 transition-colors`}>
                      <div className={`absolute top-0 left-0 w-1 h-full ${
                        insight.severity === 'critical' ? 'bg-red-500' : 
                        insight.severity === 'high' ? 'bg-orange-500' : 'bg-primary'
                      }`} />
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[10px] font-bold text-primary uppercase">{insight.insight_type}</p>
                          <span className="text-[8px] text-white/30 uppercase">{new Date(insight.generated_at).toLocaleTimeString()}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{insight.title}</h4>
                        <p className="text-xs text-white/60 line-clamp-2">{insight.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Panel: Chat Interface */}
          <Card className="lg:col-span-8 glass-panel border-white/5 flex flex-col overflow-hidden bg-black/20">
            <CardHeader className="border-b border-white/5 p-3 sm:p-6 py-3 sm:py-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm sm:text-base font-black">AI Operations Assistant</CardTitle>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[9px] sm:text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Realtime Context Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 md:space-y-6 custom-scrollbar bg-[url('/grid.svg')] bg-center bg-fixed">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0 flex items-center justify-center border ${
                      msg.role === 'user' ? 'bg-white/5 border-white/10' : 'bg-primary/10 border-primary/20'
                    }`}>
                      {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-white/60" /> : <Bot className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <div className={`rounded-2xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white font-medium rounded-tr-none shadow-lg' 
                        : 'glass-panel border-white/10 text-white/90 rounded-tl-none shadow-xl'
                    }`}>
                      {msg.content}
                      <div className={`text-[8px] sm:text-[9px] mt-1.5 opacity-40 font-bold uppercase tracking-widest ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 sm:gap-3 max-w-[90%] sm:max-w-[85%]">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0 flex items-center justify-center border bg-primary/10 border-primary/20">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="glass-panel border-white/10 p-3 sm:p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                      <span className="text-[11px] sm:text-xs text-white/60 font-medium">Analyzing operational data...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </CardContent>

            <div className="p-3 sm:p-4 border-t border-white/5 bg-black/40 shrink-0">
              <form onSubmit={handleSendMessage} className="relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about operations..."
                  className="bg-white/5 border-white/10 h-11 sm:h-14 pl-4 pr-12 rounded-xl sm:rounded-2xl focus-visible:ring-primary focus-visible:border-primary/50 text-xs sm:text-sm text-white placeholder:text-white/20"
                />
                <Button 
                  type="submit" 
                  disabled={isLoading || !input.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-primary hover:bg-primary/90 text-white p-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                {[
                  "Show suspicious sales",
                  "Analyze fuel trends",
                  "Predict tomorrow demand",
                  "Summarize today",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); }}
                    className="text-[9px] sm:text-[10px] font-semibold bg-white/[0.02] border border-white/10 text-white/70 hover:text-primary hover:border-primary/45 px-2.5 py-1.5 rounded-full transition-all whitespace-nowrap uppercase tracking-wider"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
