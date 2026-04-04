import { Request, Response } from 'express';
import { supabase } from '../supabase';

import { Request, Response } from 'express';
import { supabase } from '../supabase';
import { whatsappService } from '../whatsapp';

export const nocController = {
  async getStatus(req: Request, res: Response) {
    try {
      const userRole = (req as any).userRole;
      if (!['mega_super_admin', 'super_admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Acesso Negado' });
      }

      const instances = whatsappService.getAllInstances();
      const mapped = instances.map((inst: any) => ({
        instanceName: inst.instanceName,
        status: inst.status,
        health: inst.health?.status || 'unknown',
        lastEventAt: inst.health?.lastEventAt || null,
        reconnectAttempts: inst.reconnectAttempts || 0
      }));

      const summary = {
        total: mapped.length,
        connected: mapped.filter(i => i.status === 'connected').length,
        disconnected: mapped.filter(i => i.status === 'disconnected').length,
        error: mapped.filter(i => i.status === 'error').length
      };

      res.json({ status: 'ok', timestamp: new Date().toISOString(), instances: mapped, summary });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getAlerts(req: Request, res: Response) {
    try {
      const userRole = (req as any).userRole;
      if (!['mega_super_admin', 'super_admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Acesso Negado' });
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const statusFilter = (req.query.status as string) || 'all';

      let query = supabase
        .from('noc_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error && !error.message?.includes('does not exist')) throw error;

      res.json({ success: true, alerts: data || [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async createAlert(req: Request, res: Response) {
    try {
      const { type, title, message, instanceName } = req.body;
      const payload = {
        type, title, message,
        instance_name: instanceName || null,
        status: 'active',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('noc_alerts').insert([payload]).select().single();
      const io = (global as any).io;
      if (io && data) io.emit('noc:new_alert', data);

      res.json({ success: true, alert: data || payload });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async testPing(req: Request, res: Response) {
    try {
      const { instanceName } = req.body;
      const snapshot = whatsappService.getInstanceSnapshot(instanceName);

      if (!snapshot || snapshot.status === 'idle') {
        return res.json({ success: false, error: 'Instância não encontrada', state: 'IDLE' });
      }

      res.json({
        success: snapshot.status === 'connected',
        state: snapshot.status?.toUpperCase(),
        health: snapshot.health?.status || 'unknown',
        uptime: snapshot.lastReadyAt ? Math.round((Date.now() - new Date(snapshot.lastReadyAt).getTime()) / 1000) : null
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async getMetrics(req: Request, res: Response) {
    try {
      const userRole = (req as any).userRole;
      if (!['mega_super_admin', 'super_admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Acesso Negado' });
      }

      const mem = process.memoryUsage();
      res.json({
        status: 'ok',
        uptime_seconds: Math.round(process.uptime()),
        memory: { rss_mb: Math.round(mem.rss / 1024 / 1024), heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024) },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  async analyzeErrors(req: Request, res: Response) {
    try {
      const userRole = (req as any).userRole;
      if (!['mega_super_admin', 'super_admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Acesso Negado: Apenas Super Admins podem realizar análise profunda de logs.' });
      }

      const { logs } = req.body;
      if (!logs || !Array.isArray(logs) || logs.length === 0) {
        return res.status(400).json({ error: 'Nenhum log fornecido para análise.' });
      }

      const { data: configs } = await supabase.from('system_config').select('*').in('key', ['groq_api_key']);
      const groqKey = configs?.find((c: any) => c.key === 'groq_api_key')?.value || process.env.GROQ_API_KEY;
      
      if (!groqKey) return res.status(403).json({ error: 'Chave API da Groq não encontrada.' });

      const logsText = logs.map((l: any) => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Você é um Engenheiro DevOps Especialista. Analise os logs e forneça um laudo técnico Markdown com Resumo, Causa Raiz e Solução.' },
            { role: 'user', content: `=== LOG DUMP TÉCNICO ===\n\n${logsText}` }
          ],
          temperature: 0.2,
          max_tokens: 1500
        })
      });

      const aiData = await response.json();
      return res.json({ analysis: aiData.choices?.[0]?.message?.content || 'Nenhuma análise gerada.' });

    } catch (error: any) {
      console.error('[NOC Groq] Erro ao analisar:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

