import { supabase } from '../lib/supabase';

// ============================================
// TYPES
// ============================================

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  city?: string;
  state?: string;
  source: string;
  status: 'active' | 'inactive' | 'converted' | 'lost';
  score: number;
  estimated_value: number;
  notes?: string;
  summary?: string;
  ai_label?: string;
  assigned_agent_id?: string;
  created_at: string;
  updated_at: string;
  last_contact?: string;
  tags?: Tag[];
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: 'message' | 'call' | 'email' | 'note' | 'stage_change' | 'created';
  content?: string;
  direction?: 'inbound' | 'outbound';
  metadata?: Record<string, any>;
  created_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  lead_id?: string;
  title: string;
  value: number;
  stage: 'discovery' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability: number;
  expected_close_date?: string;
  notes?: string;
  created_at: string;
  closed_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface LeadFilters {
  search?: string;
  status?: string;
  source?: string;
  minScore?: number;
  maxScore?: number;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================
// LEADS CRUD
// ============================================

export async function getLeads(filters?: LeadFilters): Promise<Lead[]> {
  let query = supabase
    .from('leads')
    .select('*, lead_tags(tags(*))')
    .order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.source) {
    query = query.eq('source', filters.source);
  }
  if (filters?.minScore !== undefined) {
    query = query.gte('score', filters.minScore);
  }
  if (filters?.maxScore !== undefined) {
    query = query.lte('score', filters.maxScore);
  }

  const { data, error } = await query;

  if (error) {
    console.error('CRM: Erro ao buscar leads:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    ...row,
    tags: row.lead_tags?.map((lt: any) => lt.tags).filter(Boolean) || []
  }));
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*, lead_tags(tags(*))')
    .eq('id', id)
    .single();

  if (error) {
    console.error('CRM: Erro ao buscar lead:', error);
    return null;
  }

  return {
    ...data,
    tags: data.lead_tags?.map((lt: any) => lt.tags).filter(Boolean) || []
  };
}

export async function getLeadByPhone(phone: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*, lead_tags(tags(*))')
    .eq('phone', phone)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('CRM: Erro ao buscar lead por phone:', error);
  }

  if (error?.code === 'PGRST116') return null;
  
  if (data) {
    return {
      ...data,
      tags: data.lead_tags?.map((lt: any) => lt.tags).filter(Boolean) || []
    };
  }
  return null;
}

export async function createLead(lead: Partial<Lead>): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .insert([{
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || null,
      company: lead.company || null,
      city: lead.city || null,
      state: lead.state || null,
      source: lead.source || 'manual',
      status: lead.status || 'active',
      score: lead.score || 50,
      estimated_value: lead.estimated_value || 0,
      notes: lead.notes || null,
      summary: lead.summary || null,
    }])
    .select()
    .single();

  if (error) {
    console.error('CRM: Erro ao criar lead:', error);
    return null;
  }

  // Log activity
  await addLeadActivity(data.id, 'created', `Lead criado: ${data.name}`);

  return data;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<boolean> {
  const updateData: any = {};
  
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.company !== undefined) updateData.company = updates.company;
  if (updates.city !== undefined) updateData.city = updates.city;
  if (updates.state !== undefined) updateData.state = updates.state;
  if (updates.source !== undefined) updateData.source = updates.source;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.score !== undefined) updateData.score = updates.score;
  if (updates.estimated_value !== undefined) updateData.estimated_value = updates.estimated_value;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.summary !== undefined) updateData.summary = updates.summary;
  if (updates.ai_label !== undefined) updateData.ai_label = updates.ai_label;
  if (updates.last_contact !== undefined) updateData.last_contact = updates.last_contact;

  const { error } = await supabase
    .from('leads')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('CRM: Erro ao atualizar lead:', error);
    return false;
  }

  return true;
}

export async function deleteLead(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('CRM: Erro ao deletar lead:', error);
    return false;
  }

  return true;
}

export async function upsertLeadByPhone(leadData: Partial<Lead>): Promise<Lead | null> {
  if (!leadData.phone) return null;

  // Check if exists
  const existing = await getLeadByPhone(leadData.phone);
  
  if (existing) {
    // Update
    const updates: Partial<Lead> = { last_contact: new Date().toISOString() };
    if (leadData.name && leadData.name !== 'Lead WhatsApp') {
      updates.name = leadData.name;
    }
    if (leadData.summary) {
      updates.summary = leadData.summary;
    }
    if (leadData.ai_label) {
      updates.ai_label = leadData.ai_label;
    }
    
    await updateLead(existing.id, updates);
    return { ...existing, ...updates };
  } else {
    // Create
    return await createLead({
      ...leadData,
      source: leadData.source || 'whatsapp',
      status: 'active',
      score: 50,
    });
  }
}

// ============================================
// LEAD ACTIVITIES
// ============================================

export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('CRM: Erro ao buscar atividades:', error);
    return [];
  }

  return data || [];
}

export async function addLeadActivity(
  leadId: string, 
  type: LeadActivity['type'], 
  content?: string,
  direction?: 'inbound' | 'outbound',
  metadata?: Record<string, any>
): Promise<LeadActivity | null> {
  const { data, error } = await supabase
    .from('lead_activities')
    .insert([{
      lead_id: leadId,
      type,
      content,
      direction,
      metadata: metadata || {},
    }])
    .select()
    .single();

  if (error) {
    console.error('CRM: Erro ao adicionar atividade:', error);
    return null;
  }

  return data;
}

// ============================================
// LEAD NOTES
// ============================================

export async function getLeadNotes(leadId: string): Promise<LeadNote[]> {
  const { data, error } = await supabase
    .from('lead_notes')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('CRM: Erro ao buscar notas:', error);
    return [];
  }

  return data || [];
}

export async function addLeadNote(leadId: string, content: string): Promise<LeadNote | null> {
  const { data, error } = await supabase
    .from('lead_notes')
    .insert([{ lead_id: leadId, content }])
    .select()
    .single();

  if (error) {
    console.error('CRM: Erro ao adicionar nota:', error);
    return null;
  }

  // Also log as activity
  await addLeadActivity(leadId, 'note', content);

  return data;
}

export async function updateLeadNote(id: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from('lead_notes')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('CRM: Erro ao atualizar nota:', error);
    return false;
  }

  return true;
}

export async function deleteLeadNote(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('lead_notes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('CRM: Erro ao deletar nota:', error);
    return false;
  }

  return true;
}

// ============================================
// TAGS
// ============================================

export async function getTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name');

  if (error) {
    console.error('CRM: Erro ao buscar tags:', error);
    return [];
  }

  return data || [];
}

export async function addTagToLead(leadId: string, tagId: string): Promise<boolean> {
  const { error } = await supabase
    .from('lead_tags')
    .insert([{ lead_id: leadId, tag_id: tagId }]);

  if (error && error.code !== '23505') { // Ignore duplicate key
    console.error('CRM: Erro ao adicionar tag:', error);
    return false;
  }

  return true;
}

export async function removeTagFromLead(leadId: string, tagId: string): Promise<boolean> {
  const { error } = await supabase
    .from('lead_tags')
    .delete()
    .eq('lead_id', leadId)
    .eq('tag_id', tagId);

  if (error) {
    console.error('CRM: Erro ao remover tag:', error);
    return false;
  }

  return true;
}

// ============================================
// OPPORTUNITIES
// ============================================

export async function getOpportunities(leadId?: string): Promise<Opportunity[]> {
  let query = supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false });

  if (leadId) {
    query = query.eq('lead_id', leadId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('CRM: Erro ao buscar oportunidades:', error);
    return [];
  }

  return data || [];
}

export async function createOpportunity(opp: Partial<Opportunity>): Promise<Opportunity | null> {
  const { data, error } = await supabase
    .from('opportunities')
    .insert([{
      lead_id: opp.lead_id,
      title: opp.title,
      value: opp.value || 0,
      stage: opp.stage || 'discovery',
      probability: opp.probability || 20,
      expected_close_date: opp.expected_close_date,
      notes: opp.notes,
    }])
    .select()
    .single();

  if (error) {
    console.error('CRM: Erro ao criar oportunidade:', error);
    return null;
  }

  return data;
}

export async function updateOpportunity(id: string, updates: Partial<Opportunity>): Promise<boolean> {
  const updateData: any = {};
  
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.value !== undefined) updateData.value = updates.value;
  if (updates.stage !== undefined) {
    updateData.stage = updates.stage;
    if (updates.stage === 'closed_won' || updates.stage === 'closed_lost') {
      updateData.closed_at = new Date().toISOString();
    }
  }
  if (updates.probability !== undefined) updateData.probability = updates.probability;
  if (updates.expected_close_date !== undefined) updateData.expected_close_date = updates.expected_close_date;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const { error } = await supabase
    .from('opportunities')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('CRM: Erro ao atualizar oportunidade:', error);
    return false;
  }

  return true;
}

// ============================================
// ANALYTICS / STATS
// ============================================

export interface CRMStats {
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  lostLeads: number;
  totalValue: number;
  avgScore: number;
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
}

export async function getCRMStats(): Promise<CRMStats> {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*');

  if (error) {
    console.error('CRM: Erro ao buscar estatísticas:', error);
    return {
      totalLeads: 0,
      activeLeads: 0,
      convertedLeads: 0,
      lostLeads: 0,
      totalValue: 0,
      avgScore: 0,
      bySource: {},
      byStatus: {},
    };
  }

  const stats: CRMStats = {
    totalLeads: leads?.length || 0,
    activeLeads: leads?.filter(l => l.status === 'active').length || 0,
    convertedLeads: leads?.filter(l => l.status === 'converted').length || 0,
    lostLeads: leads?.filter(l => l.status === 'lost').length || 0,
    totalValue: leads?.reduce((sum, l) => sum + (l.estimated_value || 0), 0) || 0,
    avgScore: Math.round((leads?.reduce((sum, l) => sum + (l.score || 0), 0) || 0) / (leads?.length || 1)),
    bySource: {},
    byStatus: {},
  };

  leads?.forEach(l => {
    stats.bySource[l.source] = (stats.bySource[l.source] || 0) + 1;
    stats.byStatus[l.status] = (stats.byStatus[l.status] || 0) + 1;
  });

  return stats;
}

// ============================================
// CONTACTS (from WhatsApp integration)
// ============================================

export async function getContacts(): Promise<any[]> {
  const { data, error } = await supabase
    .from('whatsapp_contacts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('CRM: Erro ao buscar contatos:', error);
    return [];
  }

  return data || [];
}

export async function getContactByPhone(phone: string): Promise<any | null> {
  const normalized = phone.replace(/\D/g, '');
  
  const { data, error } = await supabase
    .from('whatsapp_contacts')
    .select('*')
    .eq('phone_normalized', normalized)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('CRM: Erro ao buscar contato:', error);
  }

  return error?.code === 'PGRST116' ? null : data;
}
