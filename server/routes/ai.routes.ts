import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';

const router = Router();

router.post('/sandbox-test', aiController.sandboxTest);

export default router;
