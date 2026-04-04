import { Router } from 'express';
import { calendarController } from '../controllers/calendar.controller';

const router = Router();

router.get('/calendars', calendarController.getCalendars);
router.post('/appointments', calendarController.createAppointments);
// ... Adicionar outros endpoints conforme necessário do index.ts original

export default router;
