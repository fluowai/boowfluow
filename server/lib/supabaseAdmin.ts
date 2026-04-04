import { createClient } from '@supabase/supabase-js';

// SUPABASE ADMIN CLIENT (Service Role)
// Este cliente ignora as políticas de RLS e deve ser usado com extremo cuidado apenas no backend.

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[SupabaseAdmin] SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente!');
}

export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
