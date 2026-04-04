import { Request, Response, NextFunction } from 'express';

/**
 * SER-05: Autenticação do Painel Administrativo
 * Verifica a API Key mestre para permitir acesso às rotas de provisionamento.
 */

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

  if (!ADMIN_API_KEY) {
    console.error('[AdminAuth] ADMIN_API_KEY não configurada no servidor!');
    return res.status(500).json({ error: 'Configuração de segurança do servidor incompleta.' });
  }

  if (!authHeader || authHeader !== `Bearer ${ADMIN_API_KEY}`) {
    console.warn('[AdminAuth] Tentativa de acesso não autorizado ao painel admin.');
    return res.status(403).json({ error: 'Acesso negado. Chave administrativa inválida.' });
  }

  next();
};
