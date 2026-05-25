"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fuel, Loader2, ShieldCheck, TrendingUp, Zap, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { logAudit, logFailedLogin } from "@/lib/audit";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        await logFailedLogin(email, error.message);
        toast.error("Authentication failed", { description: error.message });
      } else {
        await logAudit({ action_type: "login", module_name: "auth", description: `User ${email} logged in successfully` });
        toast.success("Access granted");
        router.push("/dashboard"); 
        router.refresh();
      }
    } catch { toast.error("An unexpected error occurred"); }
    finally { setIsLoading(false); }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      document.cookie = "demo-session=true; path=/; max-age=86400; SameSite=Lax";
      toast.success("Access granted (Demo Mode)");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Failed to initialize demo session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel-heavy border-white/10 p-8 sm:p-10 text-white relative z-10">
        
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(0,102,255,0.2)]">
            <Fuel className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Manager Login</h1>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Sign in to access SmartFuel OS dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground text-sm font-medium">Email or Username</Label>
            <Input
              id="email" type="text" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="e.g. kjeevankumar944"
              className="bg-black/40 border-white/10 text-white focus-visible:ring-primary focus-visible:border-primary h-11 rounded-lg placeholder:text-black/40"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-muted-foreground text-sm font-medium">Password</Label>
            </div>
            <div className="relative">
              <Input
                id="password" type={showPassword ? "text" : "password"} required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-black/40 border-white/10 text-white focus-visible:ring-primary focus-visible:border-primary h-11 rounded-lg pr-11 placeholder:text-black/40"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit" disabled={isLoading}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg mt-4 shadow-[0_0_15px_rgba(0,102,255,0.3)] transition-all active:scale-[0.98]"
          >
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Authenticating...</> : "Sign In"}
          </Button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-white/20 text-[10px] uppercase font-bold tracking-widest">Or</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <Button
            type="button" onClick={handleDemoLogin} disabled={isLoading}
            className="w-full h-11 bg-white/[0.02] hover:bg-white/[0.06] border border-white/10 text-white font-semibold rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
            <span>Access Demo Dashboard</span>
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-muted-foreground">Access provided by SmartFuel OS administrator.</p>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-primary/80 uppercase tracking-widest mt-2 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure Enterprise Connection</span>
          </div>
        </div>
      </div>
    </div>
  );
}
