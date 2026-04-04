import { Router } from 'express';
import { whatsappController } from '../controllers/whatsapp.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/instances', authMiddleware, whatsappController.getInstances);
router.get('/status', authMiddleware, whatsappController.getStatus);
router.get('/health', authMiddleware, whatsappController.health);
router.get('/contacts', authMiddleware, whatsappController.getContacts);
router.get('/chats', authMiddleware, whatsappController.getChats);
router.get('/messages/:jid', authMiddleware, whatsappController.getMessages);
router.get('/profile/:jid', authMiddleware, whatsappController.getProfile);
router.get('/chat-metadata', authMiddleware, whatsappController.getMetadata);

router.post('/connect', authMiddleware, whatsappController.connect);
router.post('/disconnect', authMiddleware, whatsappController.disconnect);
router.post('/send', authMiddleware, whatsappController.sendText);
router.post('/send-media', authMiddleware, whatsappController.sendMedia);
router.post('/retrieve-media', authMiddleware, whatsappController.retrieveMedia);
router.post('/chat-metadata', authMiddleware, whatsappController.upsertMetadata);
router.post('/sync', authMiddleware, whatsappController.sync);

export default router;
