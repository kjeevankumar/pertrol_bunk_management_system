"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { 
  Fuel, Sparkles, TrendingUp, ShieldAlert, Zap, 
  ChevronRight, BrainCircuit, Activity, BarChart3,
  Target, ShieldCheck, Globe, Database, Smartphone,
  Play, Pause, RotateCcw, Volume2, Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const SLIDES = [
  {
    title: "Operational Command",
    subtitle: "Realtime visibility at every nozzle.",
    description: "Every liter dispensed is tracked across the neural grid. Our proprietary protocol ensures sub-second synchronization between the pump and the executive dashboard.",
    icon: Fuel,
    color: "primary",
    stat: "0.3s Latency",
    preview: "dashboard"
  },
  {
    title: "AI Fraud Guard",
    subtitle: "Zero tolerance for revenue leakage.",
    description: "Advanced pattern recognition identifies tampering and unauthorized transactions before they impact your margins. 99.8% detection accuracy across all fuel types.",
    icon: ShieldAlert,
    color: "red-500",
    stat: "₹1.2M Saved / Year",
    preview: "fraud"
  },
  {
    title: "Neural Forecasting",
    subtitle: "Predicting demand before it arrives.",
    description: "Gemini-powered intelligence analyzes historical sales, local weather, and market trends to optimize your stock replenishment schedules automatically.",
    icon: BrainCircuit,
    color: "emerald-400",
    stat: "94% Accuracy",
    preview: "ai"
  }
];

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setCurrentSlide(s => (s + 1) % SLIDES.length);
            return 0;
          }
          return prev + 0.5;
        });
      }, 50);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying]);

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;

  return (
    <main className="h-screen w-screen bg-[#050505] overflow-hidden flex flex-col font-sans selection:bg-primary/20">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full translate-x-1/4 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-emerald-500/5 blur-[150px] rounded-full -translate-x-1/4 translate-y-1/4" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-50" />
      </div>

      {/* Header */}
      <header className="relative z-10 h-20 flex items-center justify-between px-10 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Fuel className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black text-xl tracking-tighter leading-none">SmartFuel<span className="text-primary">OS</span></span>
            <span className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mt-1">Investor Preview</span>
          </div>
        </Link>

        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
             <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Neural Stream Active</span>
           </div>
           <Link href="/">
             <Button variant="ghost" className="text-white/40 hover:text-white uppercase font-black tracking-widest text-[10px]">Exit Presentation</Button>
           </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative z-10 grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side: Information */}
        <div className="flex flex-col justify-center px-12 lg:px-24 space-y-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl">
                 <Icon className={cn("w-5 h-5", `text-${slide.color}`)} />
                 <span className="text-xs font-black text-white uppercase tracking-widest">{slide.title}</span>
              </div>
              
              <h1 className="text-6xl lg:text-7xl font-black text-white leading-tight tracking-tighter">
                {slide.subtitle}
              </h1>
              
              <p className="text-xl text-white/40 leading-relaxed font-medium max-w-xl">
                {slide.description}
              </p>

              <div className="pt-4">
                <div className="p-6 glass-panel border-white/5 bg-white/2 rounded-3xl inline-block">
                   <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">Key Performance Indicator</p>
                   <h3 className="text-4xl font-black text-white tracking-tighter">{slide.stat}</h3>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Progress Indicators */}
          <div className="flex gap-4">
            {SLIDES.map((_, i) => (
              <div 
                key={i} 
                onClick={() => { setCurrentSlide(i); setProgress(0); }}
                className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden cursor-pointer group"
              >
                <motion.div 
                  initial={false}
                  animate={{ 
                    width: i === currentSlide ? `${progress}%` : i < currentSlide ? '100%' : '0%' 
                  }}
                  className={cn("h-full bg-primary transition-colors", i === currentSlide ? "opacity-100" : "opacity-30")}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Visual Demo */}
        <div className="flex items-center justify-center bg-black/40 relative overflow-hidden">
           <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 1.1, rotateY: -20 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full h-full max-w-2xl aspect-square p-12"
              >
                <div className="w-full h-full glass-panel-heavy border-white/10 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
                  <div className="h-12 border-b border-white/10 flex items-center justify-between px-6 bg-black/20">
                     <div className="flex gap-1.5">
                       <div className="w-2 h-2 rounded-full bg-red-500/30" />
                       <div className="w-2 h-2 rounded-full bg-amber-500/30" />
                       <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
                     </div>
                     <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">SmartFuel Intelligence Hub v4.2</span>
                  </div>
                  
                  <div className="flex-1 p-8 flex flex-col items-center justify-center">
                    {slide.preview === "dashboard" && (
                       <div className="w-full space-y-8">
                         <div className="grid grid-cols-2 gap-6">
                            {[1,2].map(i => (
                              <div key={i} className="h-24 bg-primary/5 border border-primary/10 rounded-3xl flex flex-col items-center justify-center animate-pulse">
                                <div className="w-12 h-1.5 bg-primary/20 rounded mb-2" />
                                <div className="w-20 h-4 bg-primary/40 rounded" />
                              </div>
                            ))}
                         </div>
                         <div className="h-48 bg-white/2 border border-white/5 rounded-[2rem] flex flex-col p-6">
                            <div className="flex justify-between items-center mb-6">
                               <div className="h-3 w-32 bg-white/10 rounded" />
                               <div className="h-3 w-12 bg-emerald-500/20 rounded" />
                            </div>
                            <div className="flex-1 flex items-end gap-2">
                               {[40, 70, 45, 90, 65, 80, 55, 100].map((h, i) => (
                                 <motion.div 
                                   key={i}
                                   initial={{ height: 0 }}
                                   animate={{ height: `${h}%` }}
                                   transition={{ delay: i * 0.1 }}
                                   className="flex-1 bg-gradient-to-t from-primary/5 to-primary/40 rounded-t-lg" 
                                 />
                               ))}
                            </div>
                         </div>
                       </div>
                    )}

                    {slide.preview === "fraud" && (
                       <div className="relative w-full h-full flex items-center justify-center">
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute w-64 h-64 bg-red-500/10 blur-[60px] rounded-full"
                          />
                          <div className="relative glass-panel border-red-500/20 p-8 rounded-[2rem] text-center space-y-6 max-w-sm">
                             <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto border border-red-500/30">
                               <ShieldAlert className="w-8 h-8 text-red-500" />
                             </div>
                             <div className="space-y-2">
                               <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Security Breach Detected</p>
                               <h4 className="text-xl font-bold text-white uppercase tracking-tighter leading-tight">Nozzle 4 Flow Anomaly</h4>
                               <p className="text-xs text-white/40 font-medium">Unusual pattern detected at 14:23. Digital lock engaged.</p>
                             </div>
                             <Button className="w-full bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest h-10 rounded-xl">Override System</Button>
                          </div>
                       </div>
                    )}

                    {slide.preview === "ai" && (
                       <div className="w-full space-y-6">
                          <div className="flex items-center gap-4 p-4 glass-panel border-emerald-500/20 bg-emerald-500/5 rounded-3xl">
                             <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center"><BrainCircuit className="w-6 h-6 text-emerald-400" /></div>
                             <div className="space-y-1">
                               <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Neural Recommendation</p>
                               <p className="text-sm text-white font-bold">Refill Diesel Tank 2 by 18:00 today.</p>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             {[
                               { label: "Predictive Fill", icon: Zap },
                               { label: "Cost Optimizer", icon: TrendingUp },
                               { label: "Margin Guard", icon: ShieldCheck },
                               { label: "Supply Sync", icon: Globe }
                             ].map((item, i) => (
                               <div key={i} className="p-4 glass-panel border-white/5 bg-white/2 rounded-2xl space-y-3">
                                  <item.icon className="w-4 h-4 text-white/40" />
                                  <p className="text-[10px] font-black text-white uppercase tracking-widest leading-tight">{item.label}</p>
                                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: '70%' }}
                                      className="h-full bg-emerald-500/40" 
                                    />
                                  </div>
                               </div>
                             ))}
                          </div>
                       </div>
                    )}
                  </div>
                </div>
              </motion.div>
           </AnimatePresence>
        </div>
      </div>

      {/* Footer Controls */}
      <footer className="relative z-10 h-24 border-t border-white/5 bg-black/80 backdrop-blur-2xl px-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)} className="h-12 w-12 rounded-xl text-white hover:bg-white/5">
             {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
           </Button>
           <Button variant="ghost" size="icon" onClick={() => setProgress(0)} className="h-12 w-12 rounded-xl text-white/40 hover:text-white hover:bg-white/5">
             <RotateCcw className="w-5 h-5" />
           </Button>
           <div className="h-6 w-px bg-white/5 mx-2" />
           <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Slide {currentSlide + 1} of {SLIDES.length}</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 mr-6 text-white/20">
             <Volume2 className="w-4 h-4" />
             <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
               <div className="w-2/3 h-full bg-white/20" />
             </div>
           </div>
           <Link href="/dashboard">
             <Button className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(37,99,235,0.3)]">
               Live Operational Demo
             </Button>
           </Link>
           <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-white/40 hover:text-white">
             <Maximize2 className="w-5 h-5" />
           </Button>
        </div>
      </footer>
    </main>
  );
}
