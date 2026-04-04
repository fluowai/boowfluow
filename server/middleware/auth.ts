import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';

/**
 * Middleware de autenticação real via JWT.
 * Valida o token contra o Supabase Auth e injeta o userId no request.
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso não autorizado. Cabeçalho Bearer ausente.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      console.warn('[Auth] Tentativa de acesso com token inválido.');
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    // Injeta o ID e o Papel do usuário para uso posterior nos controllers (Isolamento Multi-tenant e RBAC)
    (req as any).userId = user.id;
    (req as any).userRole = user.user_metadata?.role || 'agent';
    
    next();
  } catch (err) {
    console.error('[Auth] Erro crítico na validação do JWT:', err);
    return res.status(500).json({ error: 'Erro interno ao validar autenticação.' });
  }
};
