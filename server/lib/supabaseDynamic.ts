import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * SER-03: Cliente Supabase Dinâmico (Multi-tenant)
 * Gera clients sob demanda para cada whitelabel identificado.
 * Cache em memória para evitar recriação excessiva do client por requisição.
 */

const clientCache: Map<string, SupabaseClient> = new Map();

export function getDynamicSupabaseClient(url: string, anonKey: string): SupabaseClient {
  const cacheKey = `${url}:${anonKey}`;
  
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }

  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false, // Importante: no backend não persistimos sessão
      autoRefreshToken: false,
    },
  });

  clientCache.set(cacheKey, client);
  return client;
}
