"use client";

import { useState, useEffect } from "react";
import { 
  Bell, X, Zap, Fuel, TrendingUp, Users, Wallet, ShieldAlert,
  Info, AlertTriangle, AlertCircle, CheckCircle2, MoreHorizontal,
  Settings, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = {
  fuel: Fuel,
  sales: TrendingUp,
  employee: Users,
  financial: Wallet,
  fraud: ShieldAlert,
  system: Zap,
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
};

export function NotificationCenter({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    if (open) fetchNotifications();

    const channel = supabase.channel('realtime_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchNotifications)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const clearAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    fetchNotifications();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-[70] w-full max-w-[400px] bg-card/80 backdrop-blur-2xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col"
          >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-background/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-black text-white">Alert Center</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={clearAll} className="text-white/40 hover:text-white" title="Mark all as read">
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <div key={i} className="h-24 w-full bg-white/5 animate-pulse rounded-xl" />
                  ))
                ) : notifications.length === 0 ? (
                  <div className="py-20 text-center opacity-30">
                    <Bell className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-sm font-bold uppercase tracking-widest">No New Alerts</p>
                    <p className="text-xs mt-1">Operational status is clear.</p>
                  </div>
                ) : notifications.map((n) => {
                  const Icon = ICONS[n.source_module || 'system'] || Zap;
                  return (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-4 rounded-2xl border transition-all relative group",
                        n.is_read ? "bg-white/[0.02] border-white/5 opacity-60" : "bg-white/[0.05] border-white/10 shadow-lg",
                        !n.is_read && SEVERITY_STYLES[n.severity]?.split(' ')[2]
                      )}
                    >
                      {!n.is_read && (
                        <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_#0066ff]" />
                      )}
                      <div className="flex gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                          SEVERITY_STYLES[n.severity] || "bg-white/5 border-white/10 text-white/60"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{n.source_module || 'SYSTEM'}</span>
                            <span className="text-[9px] text-white/20 font-bold uppercase">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white">{n.title}</h4>
                          <p className="text-xs text-white/60 leading-relaxed">{n.message || n.description}</p>
                          
                          {!n.is_read && (
                            <button 
                              onClick={() => markAsRead(n.id)}
                              className="text-[10px] font-bold text-primary hover:text-primary/80 mt-2 uppercase tracking-tighter"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-background/50">
              <Button variant="outline" className="w-full border-white/10 text-white/60 hover:text-white hover:bg-white/5 text-xs font-bold uppercase" onClick={onClose}>
                View All Operations History
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
