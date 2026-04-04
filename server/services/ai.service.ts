import { supabase } from '../supabase';
import { generateEmbedding } from '../embeddings';
import { GoogleGenAI } from '@google/genai';

export const aiService = {
  async getAIResponse(prompt: string, personality?: string, knowledge?: string, forcedProvider?: string, history: any[] = [], agentId?: string) {
    try {
      const { data: config } = await supabase.from('system_config').select('*');
      
      let activeProvider = forcedProvider || config?.find(c => c.key === 'active_ai_provider')?.value || 'gemini';
      
      const geminiKey = config?.find(c => c.key === 'gemini_api_key')?.value || process.env.GEMINI_API_KEY;
      const openaiKey = config?.find(c => c.key === 'openai_api_key')?.value || process.env.OPENAI_API_KEY;
      const groqKey = config?.find(c => c.key === 'groq_api_key')?.value || process.env.GROQ_API_KEY;

      let semanticContext = '';
      if (agentId) {
         const queryEmbedding = await generateEmbedding(prompt);
         if (queryEmbedding) {
            const { data: chunks, error: rpcError } = await supabase.rpc('match_knowledge_chunks', {
               query_embedding: queryEmbedding,
               match_threshold: 0.5,
               match_count: 5,
               p_agent_id: agentId
            });

            if (!rpcError && chunks && chunks.length > 0) {
               semanticContext = "\n\nCONHECIMENTO TÉCNICO ENCONTRADO:\n" + chunks.map((c: any) => `- ${c.content}`).join('\n');
            }
         }
      }

      const fullKnowledge = (knowledge || '') + semanticContext;

      let attendeeName = 'seu assistente';
      let companyName = 'nossa empresa';
      
      if (agentId) {
        const { data: dbVars } = await supabase.from('agent_variables').select('key, value').eq('agent_id', agentId);
        attendeeName = dbVars?.find(v => v.key === 'nome_atendente')?.value || attendeeName;
        companyName = dbVars?.find(v => ['nome_empresa', 'nome_escritorio', 'nome_clinica', 'empresa'].includes(v.key))?.value || companyName;
      }

      const systemInstruction = `Você é um humano real atendendo no WhatsApp, de forma ética, educada e direta.

PROTOCOLO DE INTRODUÇÃO (REGRAS DE OURO):
1. APRESENTAÇÃO: Só se apresente ("Meu nome é ${attendeeName}") se for o INÍCIO ABSOLUTO da conversa ou se o cliente perguntar quem é você. 
2. NOME DO CLIENTE: Nunca pergunte o nome do cliente se ele já tiver se identificado ou se o nome dele já aparecer no histórico. Se souber o nome, use-o com moderação.
3. CONTEXTO: Analise o histórico detalhadamente para não repetir perguntas já respondidas.

REGRAS DE ESTILO:
- RESPOSTAS CURTAS: No máximo 2 frases.
- UMA POR VEZ: Faça apenas UMA pergunta por vez.
- TOM HUMANO: Evite termos robóticos como "Em que posso ajudar?". Seja prestativo mas natural.

CONTEXTO DO AGENTE:
${personality || ''}
${knowledge ? `\nBASE DE CONHECIMENTO:\n${knowledge}` : ''}`;

      const messages = [
        ...history,
        { role: 'user', content: prompt }
      ];

      let finalSystemInstruction = systemInstruction;
      
      // Lógica de reforço anti-repetição baseada no histórico
      if (history.length > 0) {
        const hasIntroduced = history.some(m => m.role === 'assistant' && (m.content.includes(attendeeName) || m.content.includes('Meu nome é')));
        if (hasIntroduced) {
          finalSystemInstruction += `\n\n⚠️ OBSERVAÇÃO CRÍTICA: Você JÁ se apresentou. NÃO repita sua apresentação inicial. Prossiga com o assunto.`;
        }
        
        // Verifica se o cliente já disse o nome (heurística simples)
        const clientNameMatch = history.find(m => m.role === 'user' && (m.content.toLowerCase().includes('meu nome é') || m.content.toLowerCase().includes('me chamo')) );
        if (clientNameMatch) {
          finalSystemInstruction += `\n\n⚠️ OBSERVAÇÃO: O cliente já informou o nome dele. NÃO pergunte novamente.`;
        }
      }

      if (activeProvider === 'gemini') {
        const model = 'gemini-1.5-flash';
        if (!geminiKey) throw new Error('Chave Gemini ausente.');
        const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: finalSystemInstruction }] },
            contents: messages.map(m => ({ 
              role: m.role === 'assistant' ? 'model' : 'user', 
              parts: [{ text: m.content }] 
            })),
            generationConfig: { maxOutputTokens: 150, temperature: 0.5 }
          })
        });
        const data: any = await res.json();
        return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.', provider: 'gemini', model };
      }

      if (activeProvider === 'openai') {
        const model = 'gpt-4o-mini';
        if (!openaiKey) throw new Error('Chave OpenAI ausente.');
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: finalSystemInstruction }, ...messages],
            max_tokens: 150,
            temperature: 0.5
          })
        });
        const data: any = await res.json();
        return { text: data.choices?.[0]?.message?.content || 'Sem resposta.', provider: 'openai', model };
      }

      if (activeProvider === 'groq') {
         if (!groqKey) throw new Error('Chave Groq ausente.');
         const model = 'llama-3.1-8b-instant';
         const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
           body: JSON.stringify({
             model,
             messages: [{ role: 'system', content: finalSystemInstruction }, ...messages],
             max_tokens: 150,
             temperature: 0.5
           })
         });
         const data: any = await res.json();
         return { text: data.choices?.[0]?.message?.content || 'Sem resposta do Groq.', provider: 'groq', model };
      }

      return { text: 'Provedor desconhecido.', provider: 'unknown', model: 'none' };
    } catch (error) {
      console.error('AI Global Error:', error);
      return { text: 'Erro crítico na IA.', provider: 'error', model: 'error' };
    }
  }
};
