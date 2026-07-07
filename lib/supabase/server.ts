// Optional service-role Supabase client for server routes (Stripe webhook, cron).
// Returns null when not configured so the app degrades gracefully.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseEnabled =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  if (client) return client;
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false } },
  );
  return client;
}
