import { Router } from 'express';
import configRoutes from './config.routes';
import whatsappRoutes from './whatsapp.routes';
import aiRoutes from './ai.routes';
import crmRoutes from './crm.routes';
import calendarRoutes from './calendar.routes';
import nocRoutes from './noc.routes';
import instagramRoutes from '../instagram/routes';
import growthRoutes from '../instagram/growth/routes';
import whitelabelsRoutes from './admin/whitelabels.routes';

import { authMiddleware } from '../middleware/auth';

const router = Router();

// ROTA TESTE DE INFRAESTRUTURA (Livre para Uptime Kuma / Health Checkers)
router.get('/health-check', (req, res) => {
  res.json({ status: 'up', forensic_boot_id: (global as any).FORENSIC_BOOT_ID || 'PENDING' });
});

// ========================================================
// 🛡️ ROTAS ADMINISTRATIVAS (MASTER KEY)
// Gerenciamento Whitelabel e Provisionamento Vercel
// ========================================================
router.use('/admin/whitelabels', whitelabelsRoutes);

// ========================================================
// 🛡️ BARREIRA DE SEGURANÇA GLOBAL (VITE_MASTER_API_KEY -> JWT)
// Todas as rotas abaixo requerem um token válido do Supabase Auth.
// ========================================================
router.use(authMiddleware);

// Registro de Domínios
router.use('/config', configRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/ai', aiRoutes);
router.use('/crm', crmRoutes);
router.use('/calendar', calendarRoutes);
router.use('/noc', nocRoutes);

// Instagram (Mantendo as rotas originais como estavam no index.ts)
router.use('/instagram', instagramRoutes);
router.use('/instagram', growthRoutes);

export default router;
