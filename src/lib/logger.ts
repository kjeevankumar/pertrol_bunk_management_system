import { createClient } from "@/lib/supabase/client";

export type EntityType = 
  | 'sales' 
  | 'fuel' 
  | 'attendance' 
  | 'payroll' 
  | 'expenses' 
  | 'security' 
  | 'ai' 
  | 'system';

export async function logActivity(
  action: string, 
  entityType: EntityType, 
  details: any = {}, 
  entityId?: string
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  try {
    const { error } = await supabase.from('activity_logs').insert({
      user_id: user?.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: {
        ...details,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
      }
    });
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Logging Failure:', err);
    return { success: false, error: err };
  }
}
