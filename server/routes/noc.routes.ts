import { Router } from 'express';
import { nocController } from '../controllers/noc.controller';

const router = Router();

router.get('/status', nocController.getStatus);
router.get('/alerts', nocController.getAlerts);
router.get('/metrics', nocController.getMetrics);

router.post('/alerts', nocController.createAlert);
router.post('/test-ping', nocController.testPing);
router.post('/analyze-errors', nocController.analyzeErrors);

export default router;
