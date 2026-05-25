import { Suspense } from "react";
import ExecutiveDashboardClient from "./ExecutiveDashboardClient";
import { createClient } from "@/lib/supabase/server";

export const unstable_instant = false;

export default async function ExecutiveDashboard() {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  let initialData = {
    sales: [] as any[],
    expensesData: [] as any[],
    fuel: [] as any[],
    attendance: [] as any[],
    employees: [] as any[],
    alerts: [] as any[],
    activityLogs: [] as any[]
  };

  try {
    const [
      { data: sales },
      { data: expensesData },
      { data: fuel },
      { data: att },
      { data: emps },
      { data: alertsData },
      { data: logs }
    ] = await Promise.all([
      supabase.from("sales").select("*").gte("created_at", `${today}T00:00:00Z`),
      supabase.from("expenses").select("amount").gte("date", today),
      supabase.from("fuel_stock").select("*"),
      supabase.from("attendance").select("status").eq("date", today),
      supabase.from("employees").select("id"),
      supabase.from("alerts").select("*").eq("is_resolved", false).order("created_at", { ascending: false }).limit(5),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8)
    ]);

    initialData = {
      sales: sales || [],
      expensesData: expensesData || [],
      fuel: fuel || [],
      attendance: att || [],
      employees: emps || [],
      alerts: alertsData || [],
      activityLogs: logs || []
    };
  } catch (error) {
    console.error("Error prefetching dashboard data:", error);
  }

  return (
    <Suspense fallback={null}>
      <ExecutiveDashboardClient initialData={initialData} />
    </Suspense>
  );
}
