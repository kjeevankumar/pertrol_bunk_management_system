"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full glass-panel-heavy p-10 rounded-3xl border-red-500/20 text-center space-y-6">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white tracking-tight">System Interruption</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            An unexpected error occurred within the SmartFuel OS core. The automated recovery system is standing by.
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => reset()}
            className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-12 rounded-xl"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> Attempt Recovery
          </Button>
          <Link href="/">
            <Button variant="ghost" className="w-full text-white/40 hover:text-white hover:bg-white/5 h-12 rounded-xl">
              <Home className="w-4 h-4 mr-2" /> Return to Command Center
            </Button>
          </Link>
        </div>

        <div className="pt-4 border-t border-white/5">
          <p className="text-[10px] font-mono text-white/20 break-all uppercase">Error Trace ID: {error.digest || 'unknown_engine_failure'}</p>
        </div>
      </div>
    </div>
  );
}
