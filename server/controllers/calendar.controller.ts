import { Request, Response } from 'express';
import { supabase } from '../supabase';

export const calendarController = {
  async getCalendars(req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      res.json({ success: true, calendars: data });
    } catch (error: any) {
      console.error('[Calendar API] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createAppointments(req: Request, res: Response) {
    try {
      const { data, error } = await supabase.from('appointments').insert([req.body]).select('*, calendars(name, color)').single();
      if (error) throw error;
      (global as any).io.emit('calendar:new_appointment', { appointment: data });
      res.json({ success: true, appointment: data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
