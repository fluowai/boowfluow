import { supabase } from '../../supabase';

export interface AgentBinding {
  id: string;
  instance_id: string;
  agent_id: string;
  is_active: boolean;
  reply_mode: 'auto' | 'hybrid' | 'manual';
  only_business_hours: boolean;
  reply_in_groups: boolean;
  reply_in_private: boolean;
  allowed_chat_ids: string[];
  blocked_chat_ids: string[];
  priority: number;
  cooldown_seconds: number;
  max_messages_before_human: number;
  agent?: AgentConfig;
}

export interface AgentConfig {
  id: string;
  name: string;
  system_prompt: string;
  model: string;
}

class AgentBindingCache {
  private bindings: Map<string, AgentBinding> = new Map();
  private lastFetched: number = 0;
  private readonly CACHE_TTL_MS = 60000; // 1 min Cache

  /**
   * Obtém o binding atual de uma instância. Se o cache expirou, busca no banco.
   * Não emite chamadas excessivas ao BD.
   */
  async getBindingForInstance(instanceId: string): Promise<AgentBinding | null> {
    const now = Date.now();
    if (now - this.lastFetched > this.CACHE_TTL_MS) {
      await this.refreshCache();
    }
    
    let binding = this.bindings.get(instanceId) || null;
    
    // [FALLBACK PARA SCHEMA ANTIGO]
    // Se não existir vínculo de 3 camadas, procura se a instância tem active_agent_id direto nela
    if (!binding) {
       try {
         const { getAgentByInstanceId } = require('../../supabase');
         const legacyAgent = await getAgentByInstanceId(instanceId);
         if (legacyAgent) {
            binding = {
               id: 'legacy-binding-' + instanceId,
               instance_id: instanceId,
               agent_id: legacyAgent.id,
               is_active: true,
               reply_mode: 'auto',
               only_business_hours: false, // Default legado
               reply_in_groups: false,
               reply_in_private: true,
               allowed_chat_ids: [],
               blocked_chat_ids: [],
               priority: 1,
               cooldown_seconds: 5, // Cooldown menor para fluidez no legado
               max_messages_before_human: 50,
               agent: {
                  id: legacyAgent.id,
                  name: legacyAgent.name,
                  system_prompt: legacyAgent.system_prompt,
                  model: legacyAgent.model
               }
            };
            // Guarda em cache pra não ter que refazer a busca lenta de fallback a toda mensagem
            this.bindings.set(instanceId, binding);
         }
       } catch (fallbackErr) {
          console.error('[AgentCache] Falha no fallback legado:', fallbackErr);
       }
    }
    
    return binding;
  }

  /**
   * Atualiza todo o cache do Supabase com os vínculos ATIVOS
   */
  async refreshCache(): Promise<void> {
    try {
      const { data: bindingsData, error } = await supabase
        .from('agent_instance_bindings')
        .select(`
          *,
          agents:agent_id (*)
        `)
        .eq('is_active', true);

      if (error) {
        // Se a tabela ainda não existir, ignorar silenciosamente e não atualizar o cache
        if (error.code === '42P01') {
           console.warn('[AgentCache] Tabela agent_instance_bindings ainda não criada.');
           this.lastFetched = Date.now();
           return;
        }
        throw error;
      }

      this.bindings.clear();
      
      if (bindingsData) {
        for (const item of bindingsData) {
          const binding: AgentBinding = {
            id: item.id,
            instance_id: item.instance_id,
            agent_id: item.agent_id,
            is_active: item.is_active,
            reply_mode: item.reply_mode,
            only_business_hours: item.only_business_hours,
            reply_in_groups: item.reply_in_groups,
            reply_in_private: item.reply_in_private,
            allowed_chat_ids: item.allowed_chat_ids || [],
            blocked_chat_ids: item.blocked_chat_ids || [],
            priority: item.priority || 1,
            cooldown_seconds: item.cooldown_seconds || 10,
            max_messages_before_human: item.max_messages_before_human || 50,
            agent: item.agents && !Array.isArray(item.agents) ? {
              id: item.agents.id,
              name: item.agents.name,
              system_prompt: item.agents.system_prompt,
              model: item.agents.model,
            } : undefined
          };
          this.bindings.set(item.instance_id, binding);
        }
      }
      
      this.lastFetched = Date.now();
    } catch (err: any) {
      console.error('[AgentCache] Error refreshing binding cache:', err.message);
    }
  }

  /**
   * Limpa o cache para forçar recarregamento na próxima vez
   */
  invalidate() {
    this.lastFetched = 0;
  }
}

export const agentBindingCache = new AgentBindingCache();
