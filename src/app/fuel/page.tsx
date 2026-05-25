import { Suspense } from "react";
import FuelManagementClient from "./FuelManagementClient";
import { createClient } from "@/lib/supabase/server";

export const unstable_instant = false;

export default async function FuelPage() {
  const supabase = await createClient();
  let initialData = {
    tanks: [] as any[],
    refills: [] as any[],
    activityLogs: [] as any[]
  };

  try {
    const [
      { data: tankData },
      { data: refillData },
      { data: logs }
    ] = await Promise.all([
      supabase.from("fuel_stock").select("*").order("created_at"),
      supabase.from("fuel_refills").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("fuel_activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
    ]);

    initialData = {
      tanks: tankData || [],
      refills: refillData || [],
      activityLogs: logs || []
    };
  } catch (error) {
    console.error("Error prefetching fuel data:", error);
  }

  return (
    <Suspense fallback={null}>
      <FuelManagementClient initialData={initialData} />
    </Suspense>
  );
}
