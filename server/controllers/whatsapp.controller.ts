import { Request, Response } from 'express';
import { whatsappSrv } from '../services/whatsapp.service';
import { getDbInstanceId, processMessageMedia, getDbChats, getDbMessages, getChatMetadata, upsertChatMetadata, isInstanceOwnedByUser } from '../supabase';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export const whatsappController = {
  async getInstances(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const allInstances = whatsappSrv.getInstances();
      
      // Filtra apenas as instâncias que pertencem ao usuário no Banco de Dados
      const { data: userInstances } = await supabaseAdmin
        .from('whatsapp_instances')
        .select('name')
        .eq('user_id', userId);
        
      const allowedNames = (userInstances || []).map(i => i.name);
      const filtered = allInstances.filter(inst => allowedNames.includes(inst.instanceName));
      
      res.json({ instances: filtered });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async connect(req: Request, res: Response) {
    try {
      const { instanceName } = req.body;
      const userId = (req as any).userId;
      const name = instanceName || 'default';

      if (!(await isInstanceOwnedByUser(name, userId))) {
        return res.status(403).json({ success: false, error: 'Acesso Negado: Você não é dono desta instância.' });
      }

      const snapshot = await whatsappSrv.connect(name);
      res.json({ 
        success: true, 
        message: 'Initialing connection...', 
        instanceName: name,
        snapshot: snapshot || whatsappSrv.getInstanceSnapshot(name) 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async disconnect(req: Request, res: Response) {
    try {
      const { instanceName } = req.body;
      const userId = (req as any).userId;
      const name = instanceName || 'default';

      if (!(await isInstanceOwnedByUser(name, userId))) {
        return res.status(403).json({ success: false, error: 'Acesso Negado' });
      }

      await whatsappSrv.disconnect(name);
      res.json({ success: true, message: 'Disconnected from WhatsApp', instanceName: name });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getStatus(req: Request, res: Response) {
    const { instanceName } = req.query;
    const userId = (req as any).userId;
    const name = (instanceName as string) || 'default';

    if (!(await isInstanceOwnedByUser(name, userId))) {
      return res.status(403).json({ error: 'Não autorizado' });
    }

    res.json(whatsappSrv.getConnectionInfo(name));
  },

  async health(req: Request, res: Response) {
    try {
      const instances = whatsappSrv.getInstances();
      const mapHealth = (inst: any) => ({
        instanceId: inst.instanceId,
        instanceName: inst.instanceName,
        status: inst.status,
        health: inst.health?.status || 'unknown',
        uptime: inst.health?.startedAt ? (Date.now() - new Date(inst.health.startedAt).getTime()) : 0,
        reconnects: inst.health?.reconnectCount || 0,
        errors: inst.health?.errorCount || 0,
        lastActivity: inst.health?.lastEventAt
      });
      res.json({ success: true, report: instances.map(mapHealth) });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async sendText(req: Request, res: Response) {
    try {
      const { instanceName, jid, text } = req.body;
      const userId = (req as any).userId;
      const name = instanceName || 'default';

      if (!(await isInstanceOwnedByUser(name, userId))) {
        return res.status(403).json({ success: false, error: 'Não autorizado para esta instância.' });
      }

      if (!jid || !text) return res.status(400).json({ success: false, error: 'Missing jid or text' });
      const message = await whatsappSrv.sendTextMessage(name, jid, text);
      res.json({ success: true, message });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async sendMedia(req: Request, res: Response) {
    try {
      const { instanceName, jid, base64, mimetype, filename, caption } = req.body;
      const userId = (req as any).userId;
      const name = instanceName || 'default';

      if (!(await isInstanceOwnedByUser(name, userId))) {
        return res.status(403).json({ success: false, error: 'Não autorizado' });
      }

      if (!jid || !base64 || !mimetype) return res.status(400).json({ success: false, error: 'Missing jid, base64, or mimetype' });
      const message = await whatsappSrv.sendMediaBase64(name, jid, base64, mimetype, filename, caption);
      res.json({ success: true, message });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getContacts(req: Request, res: Response) {
    try {
      const { instanceName } = req.query;
      const userId = (req as any).userId;
      const name = (instanceName as string) || 'default';

      if (!(await isInstanceOwnedByUser(name, userId))) {
        return res.status(403).json({ success: false, error: 'Não autorizado' });
      }

      const contacts = await whatsappSrv.getContacts(name);
      res.json({ success: true, contacts });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getChats(req: Request, res: Response) {
    try {
      const { instanceName } = req.query;
      const userId = (req as any).userId;
      const name = (instanceName as string) || 'default';

      if (!(await isInstanceOwnedByUser(name, userId))) {
        return res.status(403).json({ success: false, error: 'Não autorizado' });
      }
      
      const chats = await getDbChats(name);
      res.json({ success: true, chats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getMessages(req: Request, res: Response) {
    try {
      const { instanceName, limit } = req.query;
      const userId = (req as any).userId;
      const name = (instanceName as string) || 'default';

      if (!(await isInstanceOwnedByUser(name, userId))) {
        return res.status(403).json({ success: false, error: 'Não autorizado' });
      }

      const msgLimit = limit ? parseInt(limit as string) : 50;
      const messages = await getDbMessages(name, req.params.jid, msgLimit);
      res.json({ success: true, messages });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getProfile(req: Request, res: Response) {
    try {
      const { instanceName } = req.query;
      const userId = (req as any).userId;
      const name = (instanceName as string) || 'default';

      if (!(await isInstanceOwnedByUser(name, userId))) {
        return res.status(403).json({ success: false, error: 'Não autorizado' });
      }

      const picture = await whatsappSrv.getProfilePicture(name, req.params.jid);
      res.json({ success: true, picture });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async retrieveMedia(req: Request, res: Response) {
    try {
      const { instanceName, jid, messageId, type } = req.body;
      const userId = (req as any).userId;
      if (!instanceName || !jid || !messageId) {
        return res.status(400).json({ success: false, error: 'Faltando parâmetros' });
      }

      const dbId = await getDbInstanceId(instanceName, userId);
      if (!dbId) return res.status(403).json({ success: false, error: 'Instância não encontrada ou acesso proibido' });

      const result = await processMessageMedia({
        instanceName,
        dbId,
        jid,
        msgIdSerialized: messageId,
        msgType: type || 'image'
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getMetadata(req: Request, res: Response) {
    try {
      const { instanceName } = req.query;
      const userId = (req as any).userId;
      const name = (instanceName as string) || 'default';

      if (!(await isInstanceOwnedByUser(name, userId))) {
        return res.status(403).json({ success: false, error: 'Não autorizado' });
      }

      const metadata = await getChatMetadata(name);
      res.json({ success: true, metadata });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async upsertMetadata(req: Request, res: Response) {
    try {
      const { instanceName, jid, is_favorite, custom_name } = req.body;
      const userId = (req as any).userId;
      const name = (instanceName as string) || 'default';

      if (!(await isInstanceOwnedByUser(name, userId))) {
        return res.status(403).json({ success: false, error: 'Não autorizado' });
      }

      const success = await upsertChatMetadata(name, jid, { is_favorite, custom_name });
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async sync(req: Request, res: Response) {
    try {
      const { instanceName } = req.body;
      const userId = (req as any).userId;
      if (!instanceName) {
        return res.status(400).json({ success: false, error: 'instanceName é obrigatório' });
      }

      if (!(await isInstanceOwnedByUser(instanceName, userId))) {
        return res.status(403).json({ success: false, error: 'Não autorizado' });
      }

      console.log(`[Sync] Iniciando sincronização manual para: ${instanceName}`);

      // Verifica se a instância existe e está conectada
      const snapshot = whatsappSrv.getInstanceSnapshot(instanceName);
      if (snapshot.status !== 'connected') {
        return res.status(400).json({
          success: false,
          error: `Instância ${instanceName} não está conectada (status: ${snapshot.status})`
        });
      }

      // Dispara sync em background (não bloqueia a resposta)
      (async () => {
        const { syncMessageToSupabase } = await import('../supabase');
        const { whatsappService } = await import('../whatsapp');
        
        const chats = await whatsappService.getChats(instanceName);
        let totalSynced = 0;

        // Sincroniza os 30 chats mais recentes em background
        const topChats = chats.slice(0, 30);
        for (const chat of topChats) {
          try {
            const messages = await whatsappService.getMessages(
              instanceName,
              chat.id._serialized,
              30
            );
            for (const msg of messages) {
              const saved = await syncMessageToSupabase(instanceName, msg, msg.fromMe);
              if (saved) totalSynced++;
            }
          } catch (e) {
            console.warn(`[Sync] Erro ao sincronizar ${chat.id._serialized}:`, e);
          }
          await new Promise(r => setTimeout(r, 300));
        }
        console.log(`[Sync] Concluído para ${instanceName}. Total: ${totalSynced} mensagens.`);
      })().catch(err => console.error('[Sync] Erro no background:', err));

      // Responde imediatamente sem aguardar o background
      return res.json({
        success: true,
        message: `Sincronização iniciada para ${instanceName}. Processando em background.`,
        totalSynced: 0
      });

    } catch (error: any) {
      console.error('[Sync] Erro crítico:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};
