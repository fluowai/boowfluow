import { Router } from 'express';
import { crmController } from '../controllers/crm.controller';

const router = Router();

router.get('/agent-bindings', crmController.getAgentBindings);
router.post('/agent-bindings/refresh', crmController.refreshAgentCache);

export default router;
