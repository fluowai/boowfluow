import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';

/**
 * SER-04: Resolutor de Whitelabel por Domínio
 * Captura o host e identifica o cliente correspondente no config store.
 */

export const whitelabelResolver = async (req: Request, res: Response, next: NextFunction) => {
  // 1. Identifica o domínio (preferência para Header X-Forwarded-Host do Vercel/Railway)
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || '';
  
  if (!host) {
    return res.status(400).json({ error: 'Host não identificado.' });
  }

  // Ignora o domínio do Admin ou Localhost para não forçar whitelabel neles
  const adminDomain = process.env.ADMIN_DOMAIN || 'admin.antigravity.com';
  if (host === adminDomain || host.includes('localhost')) {
    return next();
  }

  try {
    // 2. Busca no projeto central do Supabase
    const { data, error } = await supabaseAdmin
      .from('whitelabels')
      .select('*')
      .eq('domain', host)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      console.warn(`[WhitelabelResolver] Domínio não cadastrado ou suspenso: ${host}`);
      return res.status(404).json({ error: 'Configuração whitelabel não encontrada para este domínio.' });
    }

    // 3. Injeta no objeto req para uso posterior nos controllers e lib supabase
    (req as any).whitelabel = {
      id: data.id,
      slug: data.slug,
      domain: data.domain,
      supabase_url: data.supabase_url,
      supabase_anon_key: data.supabase_anon_key,
      theme: data.theme
    };

    next();
  } catch (err) {
    console.error(`[WhitelabelResolver] Erro crítico ao resolver host ${host}:`, err);
    return res.status(500).json({ error: 'Erro interno na resolução de domínio.' });
  }
};
