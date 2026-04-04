import { generateEmbedding } from './embeddings';
import { supabase } from './supabase';
import { GoogleGenAI } from '@google/genai';

/**
 * 🏎️ SCRIPT DE VERIFICAÇÃO LAMBORGHINI (Fase 1, 2 e 3)
 * Este script testa se as funções de IA e Banco de Dados estão operacionais.
 */

async function testLamborghini() {
  console.log('--- 🏎️ INICIANDO TESTE DINÂMICO LAMBORGHINI ---');

  // 1. Teste de Identidade e Banco
  console.log('1. Verificando Tabelas de Inteligência...');
  const { data: leads, error: leadErr } = await supabase.from('leads').select('sentiment, ai_label').limit(1);
  if (leadErr) {
    console.error('❌ Erro ao acessar campos de Inteligência na tabela leads:', leadErr.message);
  } else {
    console.log('✅ Tabela leads possui os novos campos de Inteligência!');
  }

  // 2. Teste de Embeddings (Cérebro Digital)
  console.log('2. Testando Geração de Vetores (Gemini)...');
  const testText = "Como posso aumentar as vendas da minha clínica usando o seu CRM?";
  const embedding = await generateEmbedding(testText);
  if (embedding && embedding.length > 0) {
    console.log(`✅ Sucesso! Vetor gerado com ${embedding.length} dimensões.`);
  } else {
    console.error('❌ Falha ao gerar embedding. Verifique sua GEMINI_API_KEY no banco ou .env');
  }

  // 3. Teste de Busca Semântica
  console.log('3. Verificando RPC de Busca por Similaridade...');
  const { error: rpcErr } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: Array(768).fill(0),
    match_threshold: 0.5,
    match_count: 1,
    p_agent_id: '00000000-0000-0000-0000-000000000000' // UUID fake
  });
  
  if (rpcErr && rpcErr.message.includes('function match_knowledge_chunks')) {
     console.error('❌ RPC match_knowledge_chunks não encontrada. Executou a migração v3?');
  } else {
     console.log('✅ RPC de Busca Semântica detectada no Supabase!');
  }

  console.log('--- 🏎️ TESTE FINALIZADO ---');
}

testLamborghini().catch(console.error);
