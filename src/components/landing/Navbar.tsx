"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Fuel, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 inset-x-0 z-[100] transition-all duration-300 px-6 py-4",
      scrolled ? "bg-white/80 backdrop-blur-md border-b border-gray-200 py-3" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
            <Fuel className="w-5 h-5 text-white" />
          </div>
          <span className="text-gray-900 font-bold text-xl tracking-tight">SmartFuel<span className="text-gray-500">OS</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {['Product', 'Intelligence', 'Enterprise', 'Pricing'].map(item => (
            <Link key={item} href={`#${item.toLowerCase()}`} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              {item}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors hidden sm:block">
            Log In
          </Link>
          <Link href="/login">
            <Button className="bg-black hover:bg-gray-800 text-white font-medium px-6 rounded-xl shadow-sm transition-all">
              Get Started <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
