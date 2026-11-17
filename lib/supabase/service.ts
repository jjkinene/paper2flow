import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for the extraction pipeline.
 * Bypasses Row Level Security — only use in trusted server-side code.
 */
export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
