"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2, MapPin } from "lucide-react";

export default function BranchesPage() {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 h-full max-w-7xl mx-auto flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <Building2 className="w-8 h-8 text-primary" /> Multi-Branch Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage operations across all your petrol bunk locations.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Add Branch
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Mocked Branch Card */}
          <Card className="glass-panel border-white/5">
            <CardHeader className="pb-3 border-b border-white/5">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-bold text-white">Downtown Station #1</CardTitle>
                <div className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-xs font-semibold rounded-md border border-emerald-500/20">Active</div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5" />
                <p>123 Business Avenue, Downtown District</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Total Sales Today</p>
                  <p className="text-lg font-semibold text-white">₹1.4L</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Active Staff</p>
                  <p className="text-lg font-semibold text-white">8/12</p>
                </div>
              </div>
              <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">Manage Branch</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
