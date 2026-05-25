import { Suspense } from "react";
import SalesClient from "./SalesClient";
import { createClient } from "@/lib/supabase/server";

export const unstable_instant = false;

export default async function SalesPage() {
  const supabase = await createClient();
  let initialSales: any[] = [];

  try {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("sales").select("*").gte("created_at", `${today}T00:00:00Z`).order("created_at", { ascending: false });
    if (data) initialSales = data;
  } catch (error) {
    console.error("Error prefetching sales data:", error);
  }

  return (
    <Suspense fallback={null}>
      <SalesClient initialSales={initialSales} />
    </Suspense>
  );
}
