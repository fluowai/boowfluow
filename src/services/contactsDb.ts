import { supabase } from '../lib/supabase';

// ============================================
// TYPES
// ============================================

export interface Contact {
  id: string;
  // Dados Pessoais
  name?: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  birth_date?: string;
  gender?: string;
  cpf?: string;
  rg?: string;
  
  // Contato
  phone_primary?: string;
  phone_secondary?: string;
  phone_whatsapp?: string;
  email_primary?: string;
  email_secondary?: string;
  
  // Endereço
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  
  // Profissional
  company_name?: string;
  company_cnpj?: string;
  job_title?: string;
  department?: string;
  industry?: string;
  company_size?: string;
  company_revenue?: number;
  
  // Redes
  linkedin_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  twitter_url?: string;
  website_url?: string;
  
  // ICP
  icp_segment?: string;
  icp_company_type?: string;
  icp_revenue_tier?: string;
  icp_employee_count?: string;
  icp_technologies?: string[];
  icp_pain_points?: string[];
  icp_goals?: string[];
  icp_budget_range?: string;
  icp_decision_maker?: boolean;
  icp_influence_level?: 'low' | 'medium' | 'high' | 'decision_maker';
  
  // Funil Origem
  lead_source?: string;
  lead_source_detail?: string;
  lead_campaign?: string;
  lead_medium?: string;
  lead_channel?: string;
  lead_landing_page?: string;
  lead_referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  
  // Scoring
  score_total?: number;
  score_behavior?: number;
  score_demographic?: number;
  engagement_level?: 'cold' | 'warm' | 'hot' | 'champion';
  readiness_level?: string;
  priority_level?: 'low' | 'medium' | 'high' | 'urgent';
  
  // Qualificação
  qualification_status?: string;
  qualification_notes?: string;
  qualified_by?: string;
  qualified_at?: string;
  last_qualified_at?: string;
  
  // Interesses
  interests?: string[];
  products_interested?: string[];
  services_interested?: string[];
  
  // Preferências
  preferred_contact_channel?: string;
  preferred_contact_time?: string;
  preferred_language?: string;
  do_not_disturb?: boolean;
  opt_out_marketing?: boolean;
  
  // NPS
  nps_score?: number;
  nps_date?: string;
  nps_feedback?: string;
  satisfaction_score?: number;
  
  // Lifecycle
  lifecycle_stage?: string;
  customer_since?: string;
  churned_at?: string;
  churn_reason?: string;
  
  // Status
  is_active?: boolean;
  is_verified?: boolean;
  is_blocked?: boolean;
  block_reason?: string;
  
  // Valores
  estimated_value?: number;
  lifetime_value?: number;
  
  // Relacionamentos
  instance_id?: string;
  agent_id?: string;
  assigned_user_id?: string;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  last_contact_at?: string;
  last_interaction_at?: string;
  next_follow_up?: string;
  
  // Custom
  custom_fields?: Record<string, any>;
}

export interface ContactInteraction {
  id: string;
  contact_id: string;
  interaction_type: string;
  direction?: 'inbound' | 'outbound' | 'internal';
  channel?: string;
  subject?: string;
  content?: string;
  summary?: string;
  metadata?: Record<string, any>;
  attachments?: any[];
  related_contact_id?: string;
  related_deal_id?: string;
  related_user_id?: string;
  is_auto_generated?: boolean;
  is_archived?: boolean;
  occurred_at: string;
  created_at?: string;
}

export interface ContactNote {
  id: string;
  contact_id: string;
  note_type: string;
  content: string;
  is_private?: boolean;
  is_pinned?: boolean;
  tags?: string[];
  attachments?: any[];
  related_interaction_id?: string;
  related_user_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContactTag {
  id: string;
  contact_id: string;
  tag_name: string;
  tag_color: string;
  tag_category?: string;
  added_by?: string;
  created_at?: string;
}

export interface ContactFilters {
  search?: string;
  lifecycle_stage?: string;
  engagement_level?: string;
  lead_source?: string;
  industry?: string;
  tags?: string[];
  minScore?: number;
  maxScore?: number;
  city?: string;
  state?: string;
  assigned_user_id?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ContactsStats {
  totalContacts: number;
  byLifecycle: Record<string, number>;
  byEngagement: Record<string, number>;
  byLeadSource: Record<string, number>;
  avgScore: number;
  totalValue: number;
  contactsToday: number;
  contactsThisWeek: number;
}

// ============================================
// CONTACTS CRUD
// ============================================

export async function getContacts(filters?: ContactFilters): Promise<Contact[]> {
  let query = supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,phone_primary.ilike.%${filters.search}%,email_primary.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`
    );
  }
  if (filters?.lifecycle_stage) {
    query = query.eq('lifecycle_stage', filters.lifecycle_stage);
  }
  if (filters?.engagement_level) {
    query = query.eq('engagement_level', filters.engagement_level);
  }
  if (filters?.lead_source) {
    query = query.eq('lead_source', filters.lead_source);
  }
  if (filters?.industry) {
    query = query.eq('industry', filters.industry);
  }
  if (filters?.city) {
    query = query.ilike('city', filters.city);
  }
  if (filters?.state) {
    query = query.eq('state', filters.state);
  }
  if (filters?.assigned_user_id) {
    query = query.eq('assigned_user_id', filters.assigned_user_id);
  }
  if (filters?.minScore !== undefined) {
    query = query.gte('score_total', filters.minScore);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Contacts: Erro ao buscar:', error);
    return [];
  }

  return data || [];
}

export async function getContactById(id: string): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Contacts: Erro ao buscar:', error);
    return null;
  }

  return data;
}

export async function getContactByPhone(phone: string): Promise<Contact | null> {
  const normalized = phone.replace(/\D/g, '');
  
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .or(`phone_primary.ilike.%${normalized}%,phone_whatsapp.ilike.%${normalized}%`)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Contacts: Erro ao buscar por phone:', error);
  }

  return error?.code === 'PGRST116' ? null : data;
}

export async function getContactByEmail(email: string): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('email_primary', email)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Contacts: Erro ao buscar por email:', error);
  }

  return error?.code === 'PGRST116' ? null : data;
}

export async function createContact(contact: Partial<Contact>): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .insert([contact])
    .select()
    .single();

  if (error) {
    console.error('Contacts: Erro ao criar:', error);
    return null;
  }

  // Log criação
  await addInteraction(data.id, 'created', { content: 'Contato criado' });

  return data;
}

export async function updateContact(id: string, updates: Partial<Contact>): Promise<boolean> {
  const { error } = await supabase
    .from('contacts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Contacts: Erro ao atualizar:', error);
    return false;
  }

  return true;
}

export async function deleteContact(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Contacts: Erro ao deletar:', error);
    return false;
  }

  return true;
}

export async function upsertContactByPhone(contactData: Partial<Contact>): Promise<Contact | null> {
  if (!contactData.phone_primary) return null;

  const existing = await getContactByPhone(contactData.phone_primary);
  
  if (existing) {
    await updateContact(existing.id, {
      ...contactData,
      last_interaction_at: new Date().toISOString()
    });
    return { ...existing, ...contactData };
  } else {
    return createContact({
      ...contactData,
      lifecycle_stage: 'subscriber',
      engagement_level: 'cold',
      last_interaction_at: new Date().toISOString()
    });
  }
}

// ============================================
// INTERACTIONS (Histórico)
// ============================================

export async function getContactInteractions(
  contactId: string, 
  limit: number = 50
): Promise<ContactInteraction[]> {
  const { data, error } = await supabase
    .from('contact_interactions')
    .select('*')
    .eq('contact_id', contactId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Contacts: Erro ao buscar interações:', error);
    return [];
  }

  return data || [];
}

export async function addInteraction(
  contactId: string,
  type: string,
  data: Partial<ContactInteraction>,
  metadata?: Record<string, any>
): Promise<ContactInteraction | null> {
  const { data: result, error } = await supabase
    .from('contact_interactions')
    .insert([{
      contact_id: contactId,
      interaction_type: type,
      channel: data.channel || 'system',
      direction: data.direction || 'internal',
      content: data.content || '',
      summary: data.summary || '',
      metadata: metadata || {},
      occurred_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) {
    console.error('Contacts: Erro ao adicionar interação:', error);
    return null;
  }

  // Atualizar last_interaction do contato
  await supabase
    .from('contacts')
    .update({ last_interaction_at: new Date().toISOString() })
    .eq('id', contactId);

  return result;
}

export async function addMessageInteraction(
  contactId: string,
  direction: 'inbound' | 'outbound',
  content: string,
  metadata?: Record<string, any>
): Promise<ContactInteraction | null> {
  return addInteraction(contactId, direction === 'inbound' ? 'message_received' : 'message_sent', {
    direction,
    content,
    channel: 'whatsapp',
    metadata
  });
}

export async function addCallInteraction(
  contactId: string,
  direction: 'inbound' | 'outbound',
  duration?: number,
  notes?: string
): Promise<ContactInteraction | null> {
  const type = direction === 'inbound' ? 'call_inbound' : 'call_outbound';
  return addInteraction(contactId, type, {
    direction,
    content: notes || `Ligação ${direction === 'inbound' ? 'recebida' : 'efetuada'}`,
    channel: 'phone',
    metadata: { duration }
  });
}

// ============================================
// NOTES
// ============================================

export async function getContactNotes(contactId: string): Promise<ContactNote[]> {
  const { data, error } = await supabase
    .from('contact_notes')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Contacts: Erro ao buscar notas:', error);
    return [];
  }

  return data || [];
}

export async function addContactNote(
  contactId: string,
  content: string,
  noteType: string = 'general',
  tags?: string[]
): Promise<ContactNote | null> {
  const { data, error } = await supabase
    .from('contact_notes')
    .insert([{
      contact_id: contactId,
      note_type: noteType,
      content,
      tags: tags || [],
    }])
    .select()
    .single();

  if (error) {
    console.error('Contacts: Erro ao adicionar nota:', error);
    return null;
  }

  // Adicionar como interação
  await addInteraction(contactId, 'note_added', { content, summary: content.substring(0, 100) });

  return data;
}

export async function updateContactNote(id: string, content: string): Promise<boolean> {
  const { error } = await supabase
    .from('contact_notes')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
}

export async function deleteContactNote(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('contact_notes')
    .delete()
    .eq('id', id);

  return !error;
}

// ============================================
// TAGS
// ============================================

export async function getContactTags(contactId: string): Promise<ContactTag[]> {
  const { data, error } = await supabase
    .from('contact_tags')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Contacts: Erro ao buscar tags:', error);
    return [];
  }

  return data || [];
}

export async function addContactTag(
  contactId: string,
  tagName: string,
  tagColor: string = '#6B7280',
  tagCategory?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('contact_tags')
    .insert([{
      contact_id: contactId,
      tag_name: tagName,
      tag_color: tagColor,
      tag_category: tagCategory,
    }]);

  if (error && error.code !== '23505') {
    console.error('Contacts: Erro ao adicionar tag:', error);
    return false;
  }

  // Log
  await addInteraction(contactId, 'tag_added', { content: `Tag "${tagName}" adicionada` });

  return true;
}

export async function removeContactTag(contactId: string, tagName: string): Promise<boolean> {
  const { error } = await supabase
    .from('contact_tags')
    .delete()
    .eq('contact_id', contactId)
    .eq('tag_name', tagName);

  if (error) {
    console.error('Contacts: Erro ao remover tag:', error);
    return false;
  }

  await addInteraction(contactId, 'tag_removed', { content: `Tag "${tagName}" removida` });

  return true;
}

// ============================================
// STATISTICS
// ============================================

export async function getContactsStats(): Promise<ContactsStats> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*');

  if (error) {
    console.error('Contacts: Erro ao buscar estatísticas:', error);
    return {
      totalContacts: 0,
      byLifecycle: {},
      byEngagement: {},
      byLeadSource: {},
      avgScore: 0,
      totalValue: 0,
      contactsToday: 0,
      contactsThisWeek: 0,
    };
  }

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const stats: ContactsStats = {
    totalContacts: data?.length || 0,
    byLifecycle: {},
    byEngagement: {},
    byLeadSource: {},
    avgScore: 0,
    totalValue: 0,
    contactsToday: 0,
    contactsThisWeek: 0,
  };

  data?.forEach((c: Contact) => {
    // Lifecycle
    stats.byLifecycle[c.lifecycle_stage || 'unknown'] = 
      (stats.byLifecycle[c.lifecycle_stage || 'unknown'] || 0) + 1;
    
    // Engagement
    stats.byEngagement[c.engagement_level || 'unknown'] = 
      (stats.byEngagement[c.engagement_level || 'unknown'] || 0) + 1;
    
    // Lead Source
    if (c.lead_source) {
      stats.byLeadSource[c.lead_source] = (stats.byLeadSource[c.lead_source] || 0) + 1;
    }
    
    // Totais
    stats.avgScore += c.score_total || 0;
    stats.totalValue += c.estimated_value || 0;
    
    // Datas
    const createdDate = c.created_at?.split('T')[0];
    if (createdDate === today) stats.contactsToday++;
    if (createdDate && createdDate >= weekAgo) stats.contactsThisWeek++;
  });

  stats.avgScore = Math.round(stats.avgScore / (data?.length || 1));

  return stats;
}

// ============================================
// LEAD SOURCES (Opções pre-definidas)
// ============================================

export const LEAD_SOURCES = [
  { value: 'whatsapp', label: 'WhatsApp', icon: '📱' },
  { value: 'website', label: 'Site/Formulário', icon: '🌐' },
  { value: 'google_ads', label: 'Google Ads', icon: '🔍' },
  { value: 'facebook_ads', label: 'Facebook/Instagram Ads', icon: '📘' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { value: 'referral', label: 'Indicação', icon: '🤝' },
  { value: 'organic', label: 'Orgânico/Busca', icon: '📊' },
  { value: 'email_marketing', label: 'Email Marketing', icon: '📧' },
  { value: 'event', label: 'Evento/Feira', icon: '🎪' },
  { value: 'partner', label: 'Parceiro', icon: '🤝' },
  { value: 'cold_outreach', label: 'Contato Ativo', icon: '📞' },
  { value: 'import', label: 'Importação', icon: '📁' },
  { value: 'other', label: 'Outro', icon: '❓' },
];

export const INDUSTRIES = [
  'Tecnologia', 'Saúde', 'Educação', 'Financeiro', 'Varejo',
  'Manufatura', 'Construção', 'Alimentação', 'Entretenimento',
  'Marketing', 'Consultoria', 'Jurídico', 'Imobiliário', 'Automotivo',
  'Logística', 'Agronegócio', 'Telecomunicações', 'Energia', 'Outro'
];

export const LIFECYCLE_STAGES = [
  { value: 'subscriber', label: 'Assinante', color: '#94A3B8' },
  { value: 'lead', label: 'Lead', color: '#60A5FA' },
  { value: 'marketing_qualified', label: 'MQL', color: '#34D399' },
  { value: 'sales_qualified', label: 'SQL', color: '#FBBF24' },
  { value: 'opportunity', label: 'Oportunidade', color: '#F97316' },
  { value: 'customer', label: 'Cliente', color: '#10B981' },
  { value: 'evangelist', label: 'Evangelista', color: '#8B5CF6' },
  { value: 'churned', label: 'Perdido', color: '#EF4444' },
];

export const ENGAGEMENT_LEVELS = [
  { value: 'cold', label: 'Frio', color: '#3B82F6', icon: '❄️' },
  { value: 'warm', label: 'Morno', color: '#F59E0B', icon: '🌡️' },
  { value: 'hot', label: 'Quente', color: '#EF4444', icon: '🔥' },
  { value: 'champion', label: 'Campeão', color: '#8B5CF6', icon: '🏆' },
];

export const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 funcionários (MEI/Pequeno)' },
  { value: '11-50', label: '11-50 funcionários (Pequena)' },
  { value: '51-200', label: '51-200 funcionários (Média)' },
  { value: '201-500', label: '201-500 funcionários (Média-Grande)' },
  { value: '501-1000', label: '501-1000 funcionários (Grande)' },
  { value: '1000+', label: '1000+ funcionários (Corporação)' },
];
