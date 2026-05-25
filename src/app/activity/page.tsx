import { Suspense } from "react";
import ActivityClient from "./ActivityClient";
import { createClient } from "@/lib/supabase/server";

export const unstable_instant = false;

export default async function ActivityLogPage() {
  const supabase = await createClient();
  let initialLogs: any[] = [];
  try {
    const { data } = await supabase
      .from('activity_logs')
      .select('*, users(email)')
      .order('created_at', { ascending: false })
      .range(0, 19);
    if (data) initialLogs = data;
  } catch (error) {
    console.error("Error prefetching activity logs:", error);
  }

  return (
    <Suspense fallback={null}>
      <ActivityClient initialLogs={initialLogs} />
    </Suspense>
  );
}
