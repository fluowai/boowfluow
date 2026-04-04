import { Request, Response } from 'express';
import { aiService } from '../services/ai.service';
import { supabase } from '../supabase';
import { resolveAgentPersonality } from '../utils/agentHelpers';

export const aiController = {
  async sandboxTest(req: Request, res: Response) {
    const startTime = Date.now();
    try {
      const { agentId, message, variables: sessionVars, history } = req.body;
      const userId = (req as any).userId;
      if (!agentId || !message) return res.status(400).json({ error: 'Faltando agentId ou message' });

      const { data: agent, error: aErr } = await supabase
        .from('whatsapp_agents')
        .select('*')
        .eq('id', agentId)
        .eq('user_id', userId)
        .single();
      
      if (aErr || !agent) return res.status(403).json({ error: 'Agente não encontrado ou acesso não autorizado.' });

      let finalPersonality = await resolveAgentPersonality(agent);
      
      if (sessionVars) {
        sessionVars.forEach((v: any) => {
          const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g');
          finalPersonality = finalPersonality.replace(regex, v.value || `[${v.key}]`);
        });
      }

      const ai = await aiService.getAIResponse(message, finalPersonality, agent.knowledge, agent.provider, history || [], agentId);
      const latency = Date.now() - startTime;

      res.json({ 
        success: true, 
        response: ai.text,
        provider: ai.provider,
        model: ai.model,
        latency,
        usedPersonality: finalPersonality.substring(0, 100) + '...'
      });
    } catch (error) {
      console.error('Erro no Sandbox:', error);
      res.status(500).json({ error: 'Erro interno no Sandbox' });
    }
  }
};
