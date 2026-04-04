import { GoogleGenAI } from '@google/genai';
import { supabase } from './supabase';

/**
 * Módulo de Embeddings Lamborghini (Fase 3)
 * Gera vetores para Busca Semântica e RAG 2.0
 */

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!text || text.trim().length === 0) return null;

  try {
    // 1. Busca chave Gemini do banco para maior flexibilidade
    const { data: config } = await supabase.from('system_config').select('value').eq('key', 'gemini_api_key').single();
    const apiKey = config?.value || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('[Embeddings] Gemini API Key não encontrada.');
      return null;
    }

    const genAI = new GoogleGenAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    // 2. Chama API de Embeddings (Suporta até 768 dimensões)
    const result = await model.embedContent(text.slice(0, 8000)); // Limite seguro de caracteres
    const embedding = result.embedding.values;

    return embedding;
  } catch (err) {
    console.error('[Embeddings] Erro ao gerar vetor:', err);
    return null;
  }
}

/**
 * Fragmenta um texto longo em chunks com sobreposição para melhor contexto no RAG.
 */
export function chunkText(text: string, size: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + size;
    chunks.push(text.slice(start, end));
    start += size - overlap;
  }

  return chunks;
}
