import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { agentBindingCache } from '../modules/agents/agentBindingCache';

export const crmController = {
  async getAgentBindings(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { data, error } = await supabase
        .from('agent_instance_bindings')
        .select('*, agents(*)')
        .eq('user_id', userId);
      
      if (error) throw error;
      res.json({ success: true, bindings: data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async refreshAgentCache(req: Request, res: Response) {
    try {
      await agentBindingCache.refreshCache();
      res.json({ success: true, message: 'Agent bindings cache refreshed' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
