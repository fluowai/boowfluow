import fetch from 'node-fetch';
import { supabase } from '../../supabase';
import { ConversationContext } from './conversationContextService';
import { AgentBinding } from './agentBindingCache';

export interface AgentRuntimeResult {
  replyText: string | null;
  shouldReply: boolean;
  confidence: number;
  reason: string;
  error?: string;
}

export class AgentRuntimeService {
  /**
   * Comunica com o LLM provendo o prompt de sistema do agente 
   * em conjunto com a janela de conversa histórica.
   */
  async generateResponse(
    binding: AgentBinding, 
    context: ConversationContext
  ): Promise<AgentRuntimeResult> {
    try {
      const agent = binding.agent;
      if (!agent) {
        return { replyText: null, shouldReply: false, confidence: 0, reason: 'agent_not_found' };
      }

      // Buscar API Keys dinamicamente
      const { data: configs } = await supabase.from('system_config').select('key, value').in('key', ['openai_api_key', 'groq_api_key']);
      const groqKey = configs?.find((c: any) => c.key === 'groq_api_key')?.value || process.env.GROQ_API_KEY;
      const openaiKey = configs?.find((c: any) => c.key === 'openai_api_key')?.value || process.env.OPENAI_API_KEY;

      const useGroq = agent.model.includes('llama') || agent.model.includes('mixtral') || agent.model.includes('gemma');
      const apiKey = useGroq ? groqKey : (openaiKey || process.env.GEMINI_API_KEY); // fallback genérico
      const baseUrl = useGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';

      if (!apiKey) {
        return { replyText: null, shouldReply: false, confidence: 0, reason: 'missing_api_key', error: 'Nenhuma chave configurada' };
      }

      // Montar Prompt de Sistema com Injeção de Variáveis
      let systemMessageContent = agent.system_prompt
        .replace(/{contact_name}/g, context.contactName)
        .replace(/{contact_phone}/g, context.contactPhone)
        .replace(/{current_time}/g, new Date().toLocaleString('pt-BR'));

      // Verifica se o Bot já enviou alguma mensagem prévia no histórico
      const hasSpokenBefore = context.messages.some(m => m.role === 'assistant');
      if (hasSpokenBefore) {
        systemMessageContent += `\n\n[MEMÓRIA DO SISTEMA - IMPORTANTE]: Você JÁ ESTÁ conversando com o usuário. O histórico acima contém o começo da conversa. NÃO crie uma nova apresentação (ex: "Olá, me chamo...", "Sou o consultor..."), NÃO repita seu próprio nome e NÃO repita o script inicial. Apenas continue naturalmente a partir da última fala do usuário, respeitando as perguntas já feitas.`;
      }

      const messagesForLLM: {
        role: 'system' | 'user' | 'assistant';
        content: string;
        name?: string;
      }[] = [
        { role: 'system', content: systemMessageContent }
      ];

      // Injeta o histórico
      messagesForLLM.push(...context.messages);

      let actualModel = agent.model || 'gpt-3.5-turbo';
      // Auto-fallback para modelos Groq descontinuados
      if (actualModel === 'llama3-70b-8192') actualModel = 'llama-3.3-70b-versatile';
      if (actualModel === 'llama3-8b-8192') actualModel = 'llama-3.1-8b-instant';

      // Detecta qual provedor o usuário selecionou ativamente
      const { data: dbVars } = await supabase.from('system_config').select('key, value').eq('key', 'active_ai_provider').single();
      const activeProvider = (dbVars?.value || 'gemini').toLowerCase();

      let reply: string | null = null;

      // ============================================
      // ROTA GEMINI (Padrão Google)
      // ============================================
      if (activeProvider === 'gemini') {
        const key = configs?.find((c: any) => c.key === 'gemini_api_key')?.value || process.env.GEMINI_API_KEY;
        if (!key) return { replyText: null, shouldReply: false, confidence: 0, reason: 'missing_api_key', error: 'Chave Gemini ausente' };

        const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`;
        
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemMessageContent }] },
            contents: context.messages.map(m => ({ 
              role: m.role === 'assistant' ? 'model' : 'user', 
              parts: [{ text: m.content }] 
            })),
            generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
          })
        });

        if (!response.ok) {
           const errDetails = await response.text();
           console.error(`[AgentRuntime Gemini] Error HTTP ${response.status}:`, errDetails);
           return { replyText: null, shouldReply: false, confidence: 0, reason: 'api_error', error: `HTTP ${response.status}` };
        }
        
        const data: any = await response.json();
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      } 
      // ============================================
      // ROTA OPENAI / GROQ
      // ============================================
      else {
        const useGroq = activeProvider === 'groq' || actualModel.includes('llama') || actualModel.includes('mixtral');
        const apiKey = useGroq ? groqKey : openaiKey;
        const baseUrl = useGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';

        if (!apiKey) return { replyText: null, shouldReply: false, confidence: 0, reason: 'missing_api_key', error: `Chave ${activeProvider} ausente` };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: actualModel,
            messages: messagesForLLM,
            temperature: 0.7,
            max_tokens: 300
          }),
          signal: controller.signal as any
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errDetails = await response.text();
          console.error(`[AgentRuntime] Error HTTP ${response.status}:`, errDetails);
          return { replyText: null, shouldReply: false, confidence: 0, reason: 'api_error', error: `HTTP ${response.status}` };
        }

        const data: any = await response.json();
        reply = data.choices?.[0]?.message?.content?.trim() || null;
      }

      if (!reply) {
         return { replyText: null, shouldReply: false, confidence: 0, reason: 'empty_response', error: 'LLM generated empty response' };
      }

      return {
        replyText: reply,
        shouldReply: true,
        confidence: 0.95,
        reason: 'success'
      };

    } catch (e: any) {
       console.error('[AgentRuntime] Falha na execução do agente:', e.message);
       return { replyText: null, shouldReply: false, confidence: 0, reason: 'runtime_exception', error: e.message };
    }
  }
}

export const agentRuntimeService = new AgentRuntimeService();
