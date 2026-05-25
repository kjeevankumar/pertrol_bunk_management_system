"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Shield, Bell, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
        setProfile(data);
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 h-full max-w-5xl mx-auto flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="w-8 h-8 text-primary" /> System Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure your enterprise account, security, and preferences.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start bg-white/5 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.05)] border border-white/10">
              <User className="w-4 h-4 mr-2" /> Profile
            </Button>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white hover:bg-white/5">
              <Shield className="w-4 h-4 mr-2" /> Security
            </Button>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white hover:bg-white/5">
              <Bell className="w-4 h-4 mr-2" /> Notifications
            </Button>
          </div>

          <div className="md:col-span-3 space-y-6">
            <Card className="glass-panel border-white/5">
              <CardHeader>
                <CardTitle className="text-white">Profile Details</CardTitle>
                <CardDescription>Update your personal information and enterprise roles.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Account Role</Label>
                    <Input className="bg-card/50 border-white/10 text-primary font-bold uppercase tracking-wider" value={profile?.role || 'ADMIN'} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">User ID</Label>
                    <Input className="bg-card/50 border-white/10 text-white/50" value={user?.id?.substring(0, 8) || ''} disabled />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Email Address</Label>
                  <Input type="email" className="bg-card/50 border-white/10 text-white" value={user?.email || ''} disabled />
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold mt-4">Save Changes</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
