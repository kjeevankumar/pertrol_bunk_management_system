"use client";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Fuel, Sparkles, ChevronRight, Play, ArrowRight, Globe, ShieldCheck, Activity, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-12 overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-500 tracking-wide uppercase">SmartFuel OS</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Smart Fuel Station <br />Management Platform
          </h1>
          
          <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
            Manage fuel operations, employees, sales, and analytics from one intelligent dashboard.
          </p>
          
          <div className="flex flex-wrap gap-4 pt-4">
            <Link href="/login">
              <Button className="h-12 px-8 rounded-xl bg-black hover:bg-gray-800 text-white font-medium text-base shadow-sm transition-all">
                Login
              </Button>
            </Link>
            <Button variant="outline" className="h-12 px-8 rounded-xl border-gray-200 bg-white text-gray-900 font-medium text-base hover:bg-gray-50 shadow-sm transition-all">
              Request Demo
            </Button>
          </div>
        </motion.div>

        {/* Right Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="relative rounded-2xl border border-gray-200 p-2 shadow-2xl bg-white aspect-[4/3] overflow-hidden">
             <div className="h-full w-full bg-gray-50 rounded-xl border border-gray-100 flex flex-col overflow-hidden">
                {/* Mockup Header */}
                <div className="h-12 border-b border-gray-200 bg-white flex items-center px-4 gap-4">
                   <div className="flex gap-1.5">
                     <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                     <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                     <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                   </div>
                   <div className="h-4 w-32 bg-gray-100 rounded ml-4" />
                </div>
                {/* Mockup Body */}
                <div className="flex-1 p-6 flex flex-col gap-4">
                   <div className="grid grid-cols-3 gap-4">
                      <div className="h-20 bg-white rounded-xl border border-gray-200 shadow-sm" />
                      <div className="h-20 bg-white rounded-xl border border-gray-200 shadow-sm" />
                      <div className="h-20 bg-white rounded-xl border border-gray-200 shadow-sm" />
                   </div>
                   <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm mt-2" />
                </div>
             </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
