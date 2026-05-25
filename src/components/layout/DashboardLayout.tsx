"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Fuel, Users, Wallet, Settings, Bell, Search,
  Menu, X, Sparkles, BarChart3, Building2, FileText, LogOut,
  CalendarDays, Banknote, ShieldAlert, Lock, ChevronRight,
  Plus, Smartphone, Command, HelpCircle, History
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { NotificationCenter } from "./NotificationCenter";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { name: "Executive Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Fuel Operations", href: "/fuel", icon: Fuel },
  { name: "Revenue Analytics", href: "/sales", icon: BarChart3 },
  { name: "Workforce", href: "/employees", icon: Users },
  { name: "Attendance", href: "/shifts", icon: CalendarDays },
  { name: "Payroll Intel", href: "/payroll", icon: Banknote },
  { name: "Financials", href: "/expenses", icon: Wallet },
  { name: "Fraud Guard", href: "/fraud", icon: ShieldAlert },
  { name: "AI Assistant", href: "/ai", icon: Sparkles, premium: true },
  { name: "Security Console", href: "/security", icon: Lock },
  { name: "Alert Center", href: "/alerts", icon: Bell },
  { name: "Audit Ledger", href: "/activity", icon: History },
  { name: "System Settings", href: "/settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [userEmail, setUserEmail] = useState("admin@smartfuel.os");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const fetchCounts = async () => {
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false);
    setAlertCount(count ?? 0);
  };

  useEffect(() => {
    fetchCounts();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email);
    });

    const channel = supabase.channel('layout_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchCounts)
      .subscribe();

    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-20 flex items-center justify-between px-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(255,255,255,0.15)] transition-transform group-hover:scale-110">
            <Fuel className="w-6 h-6 text-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black text-xl tracking-tight leading-none">SmartFuel<span className="text-zinc-300">OS</span></span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1">Enterprise</span>
          </div>
        </Link>
        <Button variant="ghost" size="icon" className="lg:hidden text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl h-9 w-9" onClick={() => setMobileOpen(false)}>
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.name} href={item.href} onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative group",
                  isActive
                    ? "bg-white/[0.05] text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                    : "text-muted-foreground hover:text-white hover:bg-white/[0.03]"
                )}>
                {isActive && (
                  <motion.div layoutId="nav-active" className="absolute left-0 w-1 h-5 sm:h-6 bg-white rounded-full" />
                )}
                <Icon className={cn("w-5 h-5 transition-all duration-300", isActive ? "text-white scale-110" : "group-hover:text-white group-hover:scale-110")} />
                <span className="flex-1 truncate">{item.name}</span>
                {item.premium && (
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400 animate-pulse" />
                )}
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-white/50" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        <div className="glass-panel-heavy p-4 rounded-2xl border-white/[0.05] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10 border-2 border-primary/20 p-0.5 bg-background">
                <AvatarImage src="https://i.pravatar.cc/150?u=admin" className="rounded-full" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">SF</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white uppercase tracking-wider truncate">Manager</p>
              <p className="text-[10px] text-white/40 truncate">{userEmail}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-red-500 hover:bg-red-500/10" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background selection:bg-primary/20">
      {/* Mobile navigation drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm md:hidden" 
            onClick={() => setMobileOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <motion.aside 
        initial={false}
        animate={{ x: mobileOpen ? 0 : -320 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 z-[70] w-72 bg-[#09090b] border-r border-white/[0.05] flex flex-col lg:hidden"
      >
        <SidebarContent />
      </motion.aside>

      {/* Desktop sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-white/[0.05] bg-[#09090b] flex-col hidden lg:flex relative">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -z-10 pointer-events-none" />

        {/* Header */}
        <header className={cn(
          "h-16 flex items-center justify-between px-6 lg:px-10 border-b border-white/[0.03] transition-all duration-300 z-50",
          scrolled ? "bg-background/80 backdrop-blur-2xl shadow-xl" : "bg-transparent"
        )}>
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" className="lg:hidden text-white" onClick={() => setMobileOpen(v => !v)}>
              <Menu className="w-6 h-6" />
            </Button>
            
            <div className="relative group hidden sm:block">
              <div className="absolute inset-0 bg-primary/20 blur-md opacity-0 group-focus-within:opacity-100 transition-opacity rounded-full" />
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <Input 
                placeholder="Command Search..." 
                className="pl-11 pr-4 bg-white/[0.03] border-white/5 focus-visible:ring-primary/50 text-sm h-10 w-72 rounded-full transition-all focus:w-80 focus:bg-white/[0.05]" 
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 pointer-events-none">
                <kbd className="h-5 px-1.5 rounded border border-white/10 bg-white/5 text-[10px] font-bold text-white/40 flex items-center">⌘</kbd>
                <kbd className="h-5 px-1.5 rounded border border-white/10 bg-white/5 text-[10px] font-bold text-white/40 flex items-center">K</kbd>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full">
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Mobile Sync Active</span>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-white/40 hover:text-white rounded-xl hover:bg-white/5 h-10 w-10"
                onClick={() => setNotificationOpen(true)}
              >
                <Bell className="w-5 h-5" />
                {alertCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full text-[9px] font-black flex items-center justify-center text-white shadow-[0_0_10px_rgba(37,99,235,0.8)]"
                  >
                    {alertCount > 9 ? '9+' : alertCount}
                  </motion.span>
                )}
              </Button>
              
              <Button variant="ghost" size="icon" className="text-white/40 hover:text-white rounded-xl hover:bg-white/5 h-10 w-10">
                <Command className="w-5 h-5" />
              </Button>
            </div>

            <div className="h-6 w-px bg-white/5 mx-2" />

            <Link href="/ai" className="hidden sm:block">
              <Button className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl h-10 px-5 shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all">
                <Sparkles className="w-4 h-4 mr-2" /> AI Assistant
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-1 overflow-auto bg-transparent relative custom-scrollbar">
          {/* Shimmer overlay for page transitions */}
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-3.5 sm:p-6 md:p-8 lg:p-10"
          >
            {children}
          </motion.div>
        </div>

        {/* Mobile Bottom Navigation (Only on mobile) */}
        <nav className="lg:hidden h-16 bg-background/80 backdrop-blur-2xl border-t border-white/[0.05] flex items-center justify-around px-2 z-50 shrink-0">
          {[
            { icon: LayoutDashboard, href: "/dashboard", label: "Home" },
            { icon: Fuel, href: "/fuel", label: "Fuel" },
            { icon: BarChart3, href: "/sales", label: "Stats" },
            { icon: Sparkles, href: "/ai", label: "AI" },
            { icon: Bell, href: "/alerts", label: "Alerts" },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.label} href={item.href} className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all",
                isActive ? "text-primary" : "text-white/40"
              )}>
                <Icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </main>

      <NotificationCenter open={notificationOpen} onClose={() => setNotificationOpen(false)} />
    </div>
  );
}
