import { createClient } from "@/lib/supabase/client";

type AuditAction =
  | "login" | "logout" | "create" | "update" | "delete"
  | "export" | "ai_query" | "view" | "resolve" | "failed_login";

interface AuditPayload {
  action_type: AuditAction;
  module_name: string;
  description: string;
  previous_data?: object | null;
  updated_data?: object | null;
}

export async function logAudit(payload: AuditPayload) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("audit_logs").insert({
      action_type: payload.action_type,
      module_name: payload.module_name,
      description: payload.description,
      performed_by: user?.id ?? null,
      performed_by_email: user?.email ?? "system",
      previous_data: payload.previous_data ?? null,
      updated_data: payload.updated_data ?? null,
      user_agent: typeof window !== "undefined" ? window.navigator.userAgent.substring(0, 200) : null,
    });
  } catch {
    // Never throw from audit logging — it's a side effect
    console.warn("Audit log failed silently");
  }
}

export async function logSecurityAlert(title: string, description: string, severity: "low" | "medium" | "high" | "critical" = "medium") {
  try {
    const supabase = createClient();
    const { data: branches } = await supabase.from("branches").select("id").limit(1);
    await supabase.from("security_alerts").insert({
      branch_id: branches?.[0]?.id ?? null,
      alert_type: "anomaly",
      severity,
      title,
      description,
    });
  } catch {
    console.warn("Security alert log failed silently");
  }
}

export async function logFailedLogin(email: string, reason: string) {
  try {
    const supabase = createClient();
    await supabase.from("failed_logins").insert({ email, reason });

    // Auto-create security alert after 3 failed attempts
    const { count } = await supabase
      .from("failed_logins")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("attempted_at", new Date(Date.now() - 15 * 60 * 1000).toISOString()); // last 15 mins

    if ((count ?? 0) >= 3) {
      await logSecurityAlert(
        "Repeated Failed Login Attempts",
        `${count} failed login attempts for ${email} in the last 15 minutes. Possible brute-force attack.`,
        "high"
      );
    }
  } catch {
    console.warn("Failed login log failed silently");
  }
}
