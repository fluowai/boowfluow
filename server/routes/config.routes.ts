import { Router } from 'express';
import { configController } from '../controllers/config.controller';

const router = Router();

router.get('/', configController.getAll);
router.post('/bulk', configController.bulkSave);
router.post('/init', configController.init);

export default router;
