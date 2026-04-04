import { supabase } from '../lib/supabase';
import { InstanceConnectionState, CanonicalMessage } from '../types/chat';
import { normalizeMessages } from '../lib/messageAdapter';

export async function getWhatsAppInstances(): Promise<InstanceConnectionState[]> {
  const { data, error } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar instâncias:', error);
    return [];
  }

  return data.map((row: any) => ({
    instanceId: row.name, // Usamos name como instanceId canônico
    instanceName: row.name,
    status: row.status || 'disconnected',
    bootState: row.boot_state || 'idle',
    qr: row.qr_data || null,
    needsQr: !!row.qr_data,
    phone: row.phone || null,
    active_agent_id: row.active_agent_id || null,
    lastReadyAt: row.last_ready_at || null,
    updatedAt: row.updated_at || new Date().toISOString(),
    
    // Defaulting fields not usually in DB but required by type
    hasSession: true, // Se existe no banco, geralmente tem sessão
    sessionInvalid: false,
    isInitializing: false,
    isReconnecting: false,
    isLocked: false,
    syncAllowed: row.status === 'connected'
  } as InstanceConnectionState));
}

export async function createWhatsAppInstance(name: string): Promise<Partial<InstanceConnectionState> | null> {
  const { data, error } = await supabase
    .from('whatsapp_instances')
    .insert([{ name, status: 'disconnected' }])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar instância:', error);
    return null;
  }

  return {
    instanceId: data.name,
    instanceName: data.name,
    status: data.status || 'disconnected',
    phone: data.phone,
    active_agent_id: data.active_agent_id
  };
}

export async function updateWhatsAppInstance(
  id: string, 
  updates: Partial<InstanceConnectionState>
): Promise<boolean> {
  const updateData: any = {};
  if (updates.instanceName) updateData.name = updates.instanceName;
  if (updates.status) updateData.status = updates.status;
  if (updates.phone) updateData.phone = updates.phone;
  if (updates.active_agent_id !== undefined) updateData.active_agent_id = updates.active_agent_id;

  const { error } = await supabase
    .from('whatsapp_instances')
    .update(updateData)
    .eq('name', id);

  if (error) {
    console.error('Erro ao atualizar instância:', error);
    return false;
  }

  return true;
}

// WhatsApp Agent Functions
export async function getAgents(): Promise<any[]> {
  const { data, error } = await supabase
    .from('whatsapp_agents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar agentes:', error);
    return [];
  }

  return data;
}

export async function createAgent(name: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('whatsapp_agents')
    .insert([{ name, status: 'active', personality: '', knowledge: '' }])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar agente:', error);
    return null;
  }

  return data;
}

export async function updateAgent(id: string, updates: any): Promise<boolean> {
  const { error } = await supabase
    .from('whatsapp_agents')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Erro ao atualizar agente:', error);
    return false;
  }

  return true;
}

export async function deleteWhatsAppInstance(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('whatsapp_instances')
    .delete()
    .eq('name', id);

  if (error) {
    console.error('Erro ao deletar instância:', error);
    return false;
  }

  return true;
}

export async function saveMessage(
  instanceId: string,
  jid: string,
  sender: string,
  content: string,
  isFromMe: boolean,
  type: string = 'chat',
  mediaUrl: string | null = null
): Promise<boolean> {
  const { error } = await supabase
    .from('whatsapp_messages')
    .insert([{
      instance_id: instanceId,
      jid,
      sender,
      content,
      is_from_me: isFromMe,
      type: type,
      media_url: mediaUrl
    }]);

  if (error) {
    console.error('Erro ao salvar mensagem:', error);
    return false;
  }

  return true;
}

// REMOVIDO: import duplicado de CanonicalMessage

export async function getMessagesFromSupabase(
  instanceId: string,
  jid: string,
  limit: number = 50
): Promise<CanonicalMessage[]> {
  try {
    // Se o instanceId não parecer um UUID, tentamos buscar pelo nome da instância
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(instanceId)) {
      const { data: inst } = await supabase.from('whatsapp_instances').select('id').eq('name', instanceId).single();
      if (inst?.id) {
        instanceId = inst.id;
      } else {
        console.warn(`Instância não encontrada no banco: ${instanceId}`);
        return [];
      }
    }

    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('instance_id', instanceId)
      .eq('jid', jid)
      .order('timestamp', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Erro ao carregar mensagens do banco:', error);
      return [];
    }

    return normalizeMessages(data);
  } catch (err) {
    console.error('Excessão em getMessagesFromSupabase:', err);
    return [];
  }
}

// Fetch Chat List from Supabase (Contacts + Groups)
export async function getChatsFromSupabase(instanceId: string): Promise<any[]> {
  try {
    // 1. Busca Contatos com Metadados de Qualidade
    // Usamos '*' para evitar erros de colunas inexistentes e focamos nos campos que realmente usamos.
    let contactsQuery = supabase
      .from('whatsapp_contacts')
      .select('*');

    // Se o instanceId não parecer um UUID, tentamos buscar pelo nome da instância
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(instanceId)) {
        const { data: inst } = await supabase.from('whatsapp_instances').select('id').eq('name', instanceId).single();
        if (inst) instanceId = inst.id;
    }

    const { data: contacts, error: errC } = await contactsQuery.eq('instance_id', instanceId);

    // 2. Busca Grupos
    const { data: groups, error: errG } = await supabase
      .from('whatsapp_groups')
      .select('*')
      .eq('instance_id', instanceId);

    if (errC || errG) {
      console.error('[Supabase DB] Error fetching chats cache:', errC || errG);
      return [];
    }

    // 3. Normaliza para o formato esperado pela Sidebar
    const chatList = [
      ...(contacts || []).map(c => {
        // [V4-FIX] identity_quality é numérico no DB (3=rich), então checamos ambos os formatos
        const isRich = c.identity_quality === 3 || c.identity_quality === 'rich' || (c.push_name && !c.push_name.includes('@') && /[a-zA-ZÀ-ÿ]/.test(c.push_name));
        const displayName = isRich ? c.push_name : (c.phone_normalized || c.jid.split('@')[0]);
        
        return {
          id: { _serialized: c.jid, user: c.phone_normalized || c.jid.split('@')[0] },
          name: displayName,
          pushname: isRich ? c.push_name : null,
          identityQuality: c.identity_quality || (isRich ? 'rich' : 'poor'),
          isGroup: false,
          profilePic: c.avatar_url,
          unreadCount: 0, 
          timestamp: Math.floor(new Date(c.updated_at).getTime() / 1000),
          lastMessage: null,
          isAiEnabled: c.is_ai_enabled !== false, // Default true
          needsHuman: c.needs_human || false
        };
      }),
      ...(groups || []).map(g => ({
        id: { _serialized: g.jid, user: (g.jid || '').split('@')[0] },
        name: g.group_name || 'Grupo',
        isGroup: true,
        profilePic: g.avatar_url,
        unreadCount: 0,
        timestamp: Math.floor(new Date(g.updated_at).getTime() / 1000),
        lastMessage: null,
        isAiEnabled: g.is_ai_enabled !== false,
        needsHuman: g.needs_human || false
      }))
    ];

    return chatList.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('[Supabase DB] Exception in getChatsFromSupabase:', error);
    return [];
  }
}

export async function getInstagramChatsFromSupabase(): Promise<any[]> {
  try {
    // Busca mensagens do Instagram e agrupa por thread_id para simular a lista de chats
    // Em um cenário real, teríamos uma tabela 'instagram_threads', mas aqui usamos a 'instagram_messages'
    const { data: messages, error } = await supabase
      .from('instagram_messages')
      .select('thread_id, sender_id, text, created_at, account_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar chats do Instagram:', error);
      return [];
    }

    // Agrupamento por thread_id
    const threadMap = new Map();
    messages.forEach((msg: any) => {
      if (!threadMap.has(msg.thread_id)) {
        threadMap.set(msg.thread_id, {
          id: { _serialized: msg.thread_id, user: msg.sender_id || 'Instagram User' },
          accountId: msg.account_id,
          name: msg.sender_id || 'Cliente Instagram',
          isGroup: false,
          isInstagram: true,
          profilePic: null,
          unreadCount: 0,
          timestamp: Math.floor(new Date(msg.created_at).getTime() / 1000),
          lastMessage: {
            body: msg.text,
            timestamp: Math.floor(new Date(msg.created_at).getTime() / 1000),
            fromMe: false // Simplificado
          }
        });
      }
    });

    return Array.from(threadMap.values());
  } catch (err) {
    console.error('Exception in getInstagramChatsFromSupabase:', err);
    return [];
  }
}

export async function getOrCreateConversation(
  instanceId: string,
  jid: string,
  name?: string
): Promise<string | null> {
  return jid; 
}

export async function updateChatAiStatus(
  instanceId: string, 
  jid: string, 
  isGroup: boolean, 
  updates: { is_ai_enabled?: boolean, needs_human?: boolean }
): Promise<boolean> {
  const table = isGroup ? 'whatsapp_groups' : 'whatsapp_contacts';
  const { error } = await supabase
    .from(table)
    .update(updates)
    .eq('instance_id', instanceId)
    .eq('jid', jid);
  
  if (error) {
    console.error(`[Supabase] Erro ao atualizar status da IA:`, error);
    return false;
  }
  return true;
}

// --- NOVOS MÉTODOS PARA O MÓDULO DE AGENTES PROFISSIONAL ---

export async function getInstagramMessagesFromSupabase(
  threadId: string,
  limit: number = 50
): Promise<CanonicalMessage[]> {
  try {
    const { data, error } = await supabase
      .from('instagram_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Erro ao carregar mensagens do Instagram:', error);
      return [];
    }

    // Normalização manual básica para Instagram (poderíamos usar o toCanonicalMessage se ajustado)
    return data.map(m => ({
      id: m.id,
      remoteJid: m.thread_id,
      phone_normalized: m.sender_id || '',
      body: m.content || m.text || '',
      renderedBody: m.content || m.text || '',
      type: 'chat',
      media_type: 'chat',
      timestamp: Math.floor(new Date(m.created_at).getTime() / 1000),
      fromMe: !!m.is_from_me,
      isGroup: false,
      isNewsletter: false,
      isInstagram: true,
      senderName: m.sender_id || 'Cliente',
      senderPhone: '',
      authorName: m.sender_id || 'Cliente',
      authorPhone: '',
      notifyName: '',
      mentions: [],
      media: { hasMedia: !!m.media_url, url: m.media_url, status: m.media_url ? 'ready' : 'none', mimetype: null, filename: null, filesize: null, caption: null },
      __normalized: true
    } as CanonicalMessage));
  } catch (err) {
    console.error('Exception in getInstagramMessagesFromSupabase:', err);
    return [];
  }
}

export async function getAgentTemplates(): Promise<any[]> {
  const { data, error } = await supabase
    .from('agent_templates')
    .select('*')
    .eq('status', 'active')
    .order('name');
  if (error) {
    console.error('Erro ao buscar templates:', error);
    return [];
  }
  return data;
}

export async function getAgentVariables(agentId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('agent_variables')
    .select('*')
    .eq('agent_id', agentId);
  if (error) return [];
  return data;
}

export async function getAgentKnowledgeFiles(agentId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('agent_knowledge_files')
    .select('*')
    .eq('agent_id', agentId);
  if (error) return [];
  return data;
}

export async function saveProfessionalAgent(agentData: any, variables: any[]): Promise<any | null> {
  // 1. Salvar Agent Base
  const { data: agent, error: aErr } = await supabase
    .from('whatsapp_agents')
    .insert([{
      name: agentData.name,
      personality: agentData.personality,
      description: agentData.description,
      objective: agentData.objective,
      template_id: agentData.template_id,
      prompt_final: agentData.personality,
      respond_to_groups: agentData.respond_to_groups || false,
      group_mode: agentData.group_mode || 'all',
      group_list: agentData.group_list || [],
      working_hours: agentData.working_hours || { enabled: false, timezone: 'America/Sao_Paulo', schedule: {} },
      voice_enabled: agentData.voice_enabled || false,
      status: 'active',
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (aErr) throw aErr;

  // 2. Salvar Variáveis se existirem
  if (variables && variables.length > 0) {
    const varsToInsert = variables.filter(v => v.key && v.value).map(v => ({
      agent_id: agent.id,
      key: v.key.replace(/[{}]/g, ''),
      value: v.value,
      label: v.label || v.key,
      type: v.type || 'text'
    }));

    if (varsToInsert.length > 0) {
      const { error: vErr } = await supabase
        .from('agent_variables')
        .insert(varsToInsert);
      
      if (vErr) console.error('Erro ao salvar algumas variáveis:', vErr);
    }
  }

  // 3. Criar Primeira Versão
  await supabase
    .from('agent_versions')
    .insert([{
      agent_id: agent.id,
      version_number: 1,
      snapshot: agent,
      note: 'Versão inicial de criação'
    }]);

  return agent;
}

export async function saveAgentKnowledgeFile(agentId: string, fileName: string, fileUrl: string, fileType: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('agent_knowledge_files')
    .insert([{
      agent_id: agentId,
      file_name: fileName,
      file_url: fileUrl,
      file_type: fileType,
      indexing_status: 'pending'
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateProfessionalAgent(agentId: string, agentData: any, variables: any[]): Promise<any | null> {
  // 1. Update Agent Base
  const { data: agent, error: aErr } = await supabase
    .from('whatsapp_agents')
    .update({
      name: agentData.name,
      personality: agentData.personality,
      description: agentData.description,
      objective: agentData.objective,
      prompt_final: agentData.personality,
      respond_to_groups: agentData.respond_to_groups,
      group_mode: agentData.group_mode,
      group_list: agentData.group_list,
      working_hours: agentData.working_hours,
      voice_enabled: agentData.voice_enabled,
      updated_at: new Date().toISOString()
    })
    .eq('id', agentId)
    .select()
    .single();

  if (aErr) throw aErr;

  // 2. Upsert Variáveis (Sincronização Atômica)
  if (variables && variables.length > 0) {
    const varsToUpsert = variables.filter(v => v.key && v.value).map(v => ({
      agent_id: agentId,
      key: v.key.replace(/[{}]/g, ''),
      value: v.value,
      label: v.label || v.key,
      type: v.type || 'text',
      updated_at: new Date().toISOString()
    }));

    if (varsToUpsert.length > 0) {
      await supabase
        .from('agent_variables')
        .upsert(varsToUpsert, { onConflict: 'agent_id, key' });
    }
  }

  // 3. Registrar Nova Versão
  const { data: lastVer } = await supabase
    .from('agent_versions')
    .select('version_number')
    .eq('agent_id', agentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();
    
  const nextVer = (lastVer?.version_number || 0) + 1;

  await supabase
    .from('agent_versions')
    .insert([{
      agent_id: agentId,
      version_number: nextVer,
      snapshot: agent,
      note: `Edição em ${new Date().toLocaleString()}`
    }]);

  return agent;
}

export async function getAgentFullMetadata(agentId: string): Promise<any> {
    const { data: agent } = await supabase.from('whatsapp_agents').select('*').eq('id', agentId).single();
    const { data: variables } = await supabase.from('agent_variables').select('*').eq('agent_id', agentId);
    const { data: knowledge } = await supabase.from('agent_knowledge_files').select('*').eq('agent_id', agentId);
    
    return {
        ...agent,
        variables: variables || [],
        knowledgeFiles: knowledge || []
    };
}

export async function deleteAgent(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('whatsapp_agents')
    .delete()
    .eq('id', id);
  return !error;
}

// --- KANBAN IA v2 METHODS ---

export async function getKanbans(): Promise<any[]> {
  const { data, error } = await supabase
    .from('kanbans')
    .select('*, whatsapp_agents(name)')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Erro ao buscar quadros:', error);
    return [];
  }
  return data;
}

export async function createKanban(name: string, agentId?: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('kanbans')
    .insert([{ name, assigned_agent_id: agentId }])
    .select()
    .single();
  return error ? null : data;
}

export async function getKanbanColumns(kanbanId?: string): Promise<any[]> {
  let query = supabase.from('kanban_columns').select('*');
  
  if (kanbanId) {
    query = query.eq('kanban_id', kanbanId);
  } else {
    // Se não passar ID, pega as do primeiro quadro encontrado
    const { data: firstBoard } = await supabase.from('kanbans').select('id').limit(1).single();
    if (firstBoard) query = query.eq('kanban_id', firstBoard.id);
  }

  const { data, error } = await query.order('order', { ascending: true });
  if (error) return [];
  return data;
}

export async function getLeadsByColumn(columnId: string, kanbanId?: string): Promise<any[]> {
  let query = supabase.from('leads').select('*, tags(*)');
  
  query = query.eq('kanban_column_id', columnId);
  if (kanbanId) query = query.eq('kanban_id', kanbanId);

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) return [];
  return data;
}

export async function getTags(): Promise<any[]> {
  const { data, error } = await supabase.from('tags').select('*').order('name');
  return error ? [] : data;
}

export async function getLeadTags(leadId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('lead_tags')
    .select('tags(*)')
    .eq('lead_id', leadId);
  return error ? [] : (data.map(d => d.tags) || []);
}

export async function updateLeadColumn(
  leadId: string, 
  columnId: string, 
  fromColumnId?: string, 
  type: 'manual' | 'ia' = 'manual',
  reason?: string,
  confidence?: number
): Promise<boolean> {
  // 1. Atualizar o lead
  const { error: lErr } = await supabase
    .from('leads')
    .update({ 
      kanban_column_id: columnId,
      updated_at: new Date()
    })
    .eq('id', leadId);

  if (lErr) return false;

  // 2. Registrar a movimentação no histórico
  await supabase
    .from('kanban_movements')
    .insert([{
      lead_id: leadId,
      from_column_id: fromColumnId,
      to_column_id: columnId,
      move_type: type,
      reason,
      confidence
    }]);

  return true;
}

export async function createKanbanLead(leadData: any): Promise<any | null> {
  const { data: lead, error } = await supabase
    .from('leads')
    .insert([leadData])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar lead no Kanban:', error);
    return null;
  }
  return lead;
}

// CONSOLIDAÇÃO DE EXPORT PARA RESOLVER ERRO VITE
export const whatsappDb = {
  getWhatsAppInstances,
  createWhatsAppInstance,
  updateWhatsAppInstance,
  deleteWhatsAppInstance,
  getAgents,
  createAgent,
  updateAgent,
  saveMessage,
  getMessagesFromSupabase,
  getInstagramMessagesFromSupabase,
  getChatsFromSupabase,
  getInstagramChatsFromSupabase,
  getOrCreateConversation,
  updateChatAiStatus,
  getAgentTemplates,
  getAgentVariables,
  getAgentKnowledgeFiles,
  saveProfessionalAgent,
  saveAgentKnowledgeFile,
  updateProfessionalAgent,
  getAgentFullMetadata,
  deleteAgent,
  getKanbans,
  createKanban,
  getKanbanColumns,
  getLeadsByColumn,
  getTags,
  getLeadTags,
  updateLeadColumn,
  createKanbanLead
};
