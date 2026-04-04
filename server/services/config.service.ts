import { supabase } from '../supabase';

export const configService = {
  async getAll() {
    const { data, error } = await supabase.from('system_config').select('*').order('key');
    if (error) throw error;
    return data;
  },

  async bulkSave(configs: { key: string, value: string }[]) {
     console.log(`[Config Bulk Save] Recebendo ${configs.length} itens para salvar...`);
     for (const conf of configs) {
       const { error } = await supabase
         .from('system_config')
         .upsert({ key: conf.key, value: conf.value }, { onConflict: 'key' });
       
       if (error) {
         console.error(`[Config Bulk Save Error] Key: ${conf.key}`, error.message);
         throw error;
       }
     }
     console.log(`[Config Bulk Save] Sucesso!`);
     return { success: true };
  },

  async initDefaults() {
    const defaults = [
      { key: 'gemini_api_key', value: process.env.GEMINI_API_KEY || '', label: 'Google Gemini AI Key', category: 'ai_providers', is_secret: true },
      { key: 'openai_api_key', value: process.env.OPENAI_API_KEY || '', label: 'OpenAI API Key', category: 'ai_providers', is_secret: true },
      { key: 'claude_api_key', value: process.env.CLAUDE_API_KEY || '', label: 'Anthropic Claude Key', category: 'ai_providers', is_secret: true },
      { key: 'groq_api_key', value: process.env.GROQ_API_KEY || '', label: 'Groq (Llama 3) Key', category: 'ai_providers', is_secret: true },
      { key: 'active_ai_provider', value: 'gemini', label: 'Provedor de IA Ativo', category: 'general', is_secret: false }
    ];

    for (const d of defaults) {
      await supabase.from('system_config').upsert(d, { onConflict: 'key' });
    }
    return { success: true, message: 'Configurações inicializadas a partir do ambiente (.env).' };
  }
};
