import { Request, Response } from 'express';
import { configService } from '../services/config.service';

export const configController = {
  async getAll(req: Request, res: Response) {
    try {
      const userRole = (req as any).userRole;
      if (!['mega_super_admin', 'super_admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Acesso Negado: Apenas Super Admins podem ver configurações globais.' });
      }

      const data = await configService.getAll();
      res.json(data);
    } catch (err) {
      console.error('Config Get Error:', err);
      res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
  },

  async bulkSave(req: Request, res: Response) {
    try {
      const userRole = (req as any).userRole;
      if (!['mega_super_admin', 'super_admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Acesso Negado: Apenas Super Admins podem alterar configurações globais.' });
      }

      const result = await configService.bulkSave(req.body);
      res.json(result);
    } catch (err: any) {
      console.error('Config Bulk Global Error:', err);
      res.status(500).json({ error: `Erro ao salvar configurações: ${err.message}` });
    }
  },

  async init(req: Request, res: Response) {
    try {
      const userRole = (req as any).userRole;
      if (!['mega_super_admin', 'super_admin'].includes(userRole)) {
        return res.status(403).json({ error: 'Acesso Negado: Apenas Super Admins podem inicializar o sistema.' });
      }

      const result = await configService.initDefaults();
      res.json(result);
    } catch (err: any) {
      console.error('Init Error:', err);
      res.status(500).json({ error: 'Erro ao inicializar. A tabela system_config existe no banco?' });
    }
  }
};
