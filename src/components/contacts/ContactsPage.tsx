import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Filter, Phone, Mail, Building, MapPin, Calendar,
  MessageSquare, Edit2, Trash2, Eye, Star, Clock, Tag, X, RefreshCw,
  Activity, User, Send, ExternalLink, Globe, Linkedin, Instagram,
  StarHalf, TrendingUp, Target, Award, Shield, Briefcase, DollarSign,
  UserCheck, MessageCircle, FileText, PhoneCall, Video, FilterX
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as contactsDb from '../../services/contactsDb';
import { Contact, ContactFilters, ContactsStats, ContactInteraction, ContactNote, ContactTag, LIFECYCLE_STAGES, ENGAGEMENT_LEVELS, LEAD_SOURCES } from '../../services/contactsDb';

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ContactFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'grid'>('list');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [contactsData, statsData] = await Promise.all([
        contactsDb.getContacts({ ...filters, search: searchTerm }),
        contactsDb.getContactsStats(),
      ]);
      setContacts(contactsData);
      setStats(statsData);
    } catch (err) {
      console.error('Contacts: Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getLifecycleColor = (stage: string) => {
    const s = LIFECYCLE_STAGES.find(l => l.value === stage);
    return s?.color || '#94A3B8';
  };

  const getLifecycleLabel = (stage: string) => {
    const s = LIFECYCLE_STAGES.find(l => l.value === stage);
    return s?.label || stage;
  };

  const getEngagementIcon = (level: string) => {
    switch (level) {
      case 'hot': return '\u{1F525}';
      case 'warm': return '\u{1F321}';
      case 'cold': return '\u{2744}';
      case 'champion': return '\u{1F3C6}';
      default: return '\u{1F4CA}';
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden">
      <div className="flex justify-between items-start shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-200">
            <Users size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Contatos</h2>
            <p className="text-sm text-slate-500 font-medium">Base completa de contatos com ICP e historico</p>
          </div>
        </div>
        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-200 hover:shadow-violet-300">
          <Plus size={18} />Novo Contato
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <StatCard icon={<Users size={20} />} label="Total de Contatos" value={stats.totalContacts} trend={stats.contactsThisWeek} trendLabel="esta semana" color="violet" />
          <StatCard icon={<Target size={20} />} label="Score Medio" value={stats.avgScore} color="amber" />
          <StatCard icon={<DollarSign size={20} />} label="Valor Total" value={`R$ ${stats.totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} color="emerald" />
          <StatCard icon={<Calendar size={20} />} label="Hoje" value={stats.contactsToday} trendLabel="novos contatos" color="blue" />
        </div>
      )}

      <div className="flex gap-3 items-center shrink-0">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar por nome, telefone, email ou empresa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={cn("flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-all", showFilters ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
          <Filter size={16} />Filtros
        </button>
        <button onClick={loadData} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all" title="Atualizar">
          <RefreshCw size={18} className={cn("text-slate-500", loading && "animate-spin")} />
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 flex-wrap">
              <select value={filters.lifecycle_stage || ''} onChange={(e) => setFilters({ ...filters, lifecycle_stage: e.target.value || undefined })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                <option value="">Lifecycle</option>
                {LIFECYCLE_STAGES.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
              </select>
              <select value={filters.engagement_level || ''} onChange={(e) => setFilters({ ...filters, engagement_level: e.target.value || undefined })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                <option value="">Engajamento</option>
                {ENGAGEMENT_LEVELS.map(e => (<option key={e.value} value={e.value}>{e.icon} {e.label}</option>))}
              </select>
              <select value={filters.lead_source || ''} onChange={(e) => setFilters({ ...filters, lead_source: e.target.value || undefined })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                <option value="">Origem</option>
                {LEAD_SOURCES.map(s => (<option key={s.value} value={s.value}>{s.icon} {s.label}</option>))}
              </select>
              <select value={filters.minScore !== undefined ? String(filters.minScore) : ''} onChange={(e) => setFilters({ ...filters, minScore: e.target.value ? Number(e.target.value) : undefined })} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20">
                <option value="">Score Minimo</option>
                <option value="80">80+ (Quente)</option>
                <option value="50">50+ (Morno)</option>
                <option value="20">20+ (Frio)</option>
              </select>
              <button onClick={() => setFilters({})} className="text-sm text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1"><FilterX size={14} />Limpar</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-3 border-slate-200 border-t-violet-500 rounded-full animate-spin" /></div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Users size={32} className="text-slate-400" /></div>
            <h3 className="text-lg font-bold text-slate-700">Nenhum contato encontrado</h3>
            <p className="text-sm text-slate-500 mt-1">Crie seu primeiro contato ou ajuste os filtros</p>
            <button onClick={() => setIsCreateModalOpen(true)} className="mt-4 flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"><Plus size={16} />Criar Contato</button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Lifecycle</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Engajamento</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Origem</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ultima Interacao</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors group" onClick={() => setSelectedContact(contact)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center text-violet-600 font-bold text-sm">
                        {contact.name?.[0]?.toUpperCase() || contact.phone_primary?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{contact.name || 'Sem nome'}</p>
                        <p className="text-xs text-slate-500">{contact.company_name || 'Empresa nao informada'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {contact.phone_primary && (<p className="flex items-center gap-1.5 text-sm text-slate-600"><Phone size={12} className="text-slate-400" />+{contact.phone_primary}</p>)}
                      {contact.email_primary && (<p className="flex items-center gap-1.5 text-xs text-slate-500"><Mail size={12} className="text-slate-400" />{contact.email_primary}</p>)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: getLifecycleColor(contact.lifecycle_stage || '') }}>
                      {getLifecycleLabel(contact.lifecycle_stage || '')}
                    </span>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm">{getEngagementIcon(contact.engagement_level || '')}</span></td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">
                      {LEAD_SOURCES.find(s => s.value === contact.lead_source)?.icon}{' '}
                      {LEAD_SOURCES.find(s => s.value === contact.lead_source)?.label || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn("px-2.5 py-1 rounded-lg font-bold text-sm", (contact.score_total || 0) >= 80 ? 'text-emerald-600 bg-emerald-50' : (contact.score_total || 0) >= 50 ? 'text-amber-600 bg-amber-50' : 'text-slate-600 bg-slate-100')}>
                        {contact.score_total || 0}
                      </div>
                      {(contact.score_total || 0) >= 80 && <Star size={14} className="text-amber-500 fill-amber-500" />}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600">{contact.last_interaction_at ? new Date(contact.last_interaction_at).toLocaleDateString('pt-BR') : contact.created_at ? new Date(contact.created_at).toLocaleDateString('pt-BR') : '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedContact(contact); }} className="p-2 hover:bg-violet-100 rounded-lg text-violet-600 transition-colors" title="Ver detalhes"><Eye size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteContact(contact); }} className="p-2 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors" title="Excluir"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>{selectedContact && (<ContactDetailModal contact={selectedContact} onClose={() => setSelectedContact(null)} onUpdate={loadData} />)}</AnimatePresence>
      <AnimatePresence>{isCreateModalOpen && (<CreateContactModal onClose={() => setIsCreateModalOpen(false)} onCreate={loadData} />)}</AnimatePresence>
    </div>
  );
}

async function handleDeleteContact(contact: Contact) {
  if (confirm(`Deseja realmente excluir o contato "${contact.name || contact.phone_primary}"?`)) {
    await contactsDb.deleteContact(contact.id);
    window.location.reload();
  }
}

function StatCard({ icon, label, value, trend, trendLabel, color }: { icon: React.ReactNode; label: string; value: number | string; trend?: number | string; trendLabel?: string; color: 'violet' | 'emerald' | 'amber' | 'blue'; }) {
  const colors: Record<string, { bg: string; icon: string; text: string }> = {
    violet: { bg: 'bg-violet-100', icon: 'text-violet-600', text: 'text-violet-800' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', text: 'text-emerald-800' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600', text: 'text-amber-800' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600', text: 'text-blue-800' },
  };
  const c = colors[color];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.bg)}><span className={c.icon}>{icon}</span></div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <p className={cn("text-2xl font-black", c.text)}>{value}</p>
        {trend !== undefined && (<div className="flex items-center gap-1 text-xs font-bold text-slate-500"><span>{trend} {trendLabel}</span></div>)}
      </div>
    </div>
  );
}

function ContactDetailModal({ contact, onClose, onUpdate }: { contact: Contact; onClose: () => void; onUpdate: () => void; }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'icp' | 'funil' | 'history' | 'notes'>('overview');
  const [interactions, setInteractions] = useState<ContactInteraction[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [tags, setTags] = useState<ContactTag[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Contact>>(contact);

  useEffect(() => { loadInteractions(); loadNotes(); loadTags(); }, [contact.id]);

  const loadInteractions = async () => { const data = await contactsDb.getContactInteractions(contact.id); setInteractions(data); };
  const loadNotes = async () => { const data = await contactsDb.getContactNotes(contact.id); setNotes(data); };
  const loadTags = async () => { const data = await contactsDb.getContactTags(contact.id); setTags(data); };
  const handleSave = async () => { await contactsDb.updateContact(contact.id, formData); setIsEditing(false); onUpdate(); };
  const handleAddNote = async () => { if (!newNote.trim()) return; await contactsDb.addContactNote(contact.id, newNote); setNewNote(''); loadNotes(); };

  const getInteractionIcon = (type: string) => {
    if (type.includes('message')) return <MessageCircle size={14} className="text-emerald-500" />;
    if (type.includes('call')) return <PhoneCall size={14} className="text-blue-500" />;
    if (type.includes('meeting') || type.includes('video')) return <Video size={14} className="text-purple-500" />;
    if (type.includes('note')) return <FileText size={14} className="text-amber-500" />;
    if (type.includes('email')) return <Mail size={14} className="text-sky-500" />;
    return <Activity size={14} className="text-slate-500" />;
  };

  const getInteractionLabel = (type: string) => {
    const labels: Record<string, string> = {
      'message_sent': 'Mensagem enviada', 'message_received': 'Mensagem recebida',
      'call_inbound': 'Ligacao recebida', 'call_outbound': 'Ligacao efetuada',
      'note_added': 'Nota adicionada', 'created': 'Contato criado',
      'email_sent': 'Email enviado', 'email_received': 'Email recebido', 'meeting': 'Reuniao',
    };
    return labels[type] || type;
  };

  const tabs = [
    { id: 'overview' as const, label: 'Visao Geral', icon: <User size={14} /> },
    { id: 'icp' as const, label: 'ICP', icon: <Target size={14} /> },
    { id: 'funil' as const, label: 'Funil Origem', icon: <TrendingUp size={14} /> },
    { id: 'history' as const, label: 'Historico', icon: <Clock size={14} /> },
    { id: 'notes' as const, label: 'Notas', icon: <FileText size={14} /> },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-violet-600 to-purple-700">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-xl">{contact.name?.[0]?.toUpperCase() || contact.phone_primary?.[0] || '?'}</div>
            <div><h3 className="text-xl font-black text-white">{contact.name || 'Contato sem nome'}</h3><p className="text-violet-200 text-sm">{contact.company_name || 'Empresa nao informada'}</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="flex border-b border-slate-200 px-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap", activeTab === tab.id ? "border-violet-500 text-violet-600" : "border-transparent text-slate-500 hover:text-slate-700")}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Lifecycle</label><span className="inline-block mt-1 px-3 py-1 rounded-full text-sm font-bold text-white" style={{ backgroundColor: LIFECYCLE_STAGES.find(l => l.value === contact.lifecycle_stage)?.color || '#94A3B8' }}>{LIFECYCLE_STAGES.find(l => l.value === contact.lifecycle_stage)?.label || '-'}</span></div>
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Engajamento</label><p className="text-lg font-black text-slate-800 mt-1">{ENGAGEMENT_LEVELS.find(e => e.value === contact.engagement_level)?.icon} {ENGAGEMENT_LEVELS.find(e => e.value === contact.engagement_level)?.label || '-'}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Score</label><p className="text-3xl font-black text-slate-800 mt-1">{contact.score_total || 0}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Valor Estimado</label><p className="text-xl font-black text-slate-800 mt-1">R$ {(contact.estimated_value || 0).toLocaleString('pt-BR')}</p></div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Dados de Contato</h4>
                <div className="grid grid-cols-2 gap-4">
                  {contact.phone_primary && (<div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"><Phone size={16} className="text-slate-400" /><span className="text-sm font-medium">+{contact.phone_primary}</span></div>)}
                  {contact.email_primary && (<div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"><Mail size={16} className="text-slate-400" /><span className="text-sm font-medium">{contact.email_primary}</span></div>)}
                  {contact.company_name && (<div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"><Building size={16} className="text-slate-400" /><span className="text-sm font-medium">{contact.company_name}</span></div>)}
                  {(contact.city || contact.state) && (<div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"><MapPin size={16} className="text-slate-400" /><span className="text-sm font-medium">{[contact.city, contact.state].filter(Boolean).join(', ')}</span></div>)}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (<span key={tag.id} className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: tag.tag_color }}>{tag.tag_name}</span>))}
                  {tags.length === 0 && (<span className="text-sm text-slate-400">Sem tags</span>)}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setIsEditing(true)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 rounded-xl text-white font-bold text-sm hover:bg-slate-900 transition-colors"><Edit2 size={16} />Editar Contato</button>
              </div>
              {isEditing && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                  <h4 className="font-bold text-slate-700">Editando Contato</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs text-slate-500">Nome</label><input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                    <div><label className="text-xs text-slate-500">Email</label><input type="email" value={formData.email_primary || ''} onChange={(e) => setFormData({ ...formData, email_primary: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                    <div><label className="text-xs text-slate-500">Empresa</label><input type="text" value={formData.company_name || ''} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                    <div><label className="text-xs text-slate-500">Telefone</label><input type="text" value={formData.phone_primary || ''} onChange={(e) => setFormData({ ...formData, phone_primary: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setIsEditing(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold text-sm hover:bg-white transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="flex-1 px-4 py-2 bg-violet-500 rounded-xl text-white font-bold text-sm hover:bg-violet-600 transition-colors">Salvar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'icp' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><Target size={18} className="text-violet-600" /><h4 className="font-bold text-violet-800">ICP - Ideal Customer Profile</h4></div>
                <p className="text-sm text-violet-600">Defina as caracteristicas do cliente ideal para este contato</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Segmento</label><p className="text-slate-800 font-medium mt-1">{contact.icp_segment || '-'}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Tipo de Empresa</label><p className="text-slate-800 font-medium mt-1">{contact.icp_company_type || '-'}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Porte</label><p className="text-slate-800 font-medium mt-1">{contact.icp_employee_count || '-'}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Faixa de Receita</label><p className="text-slate-800 font-medium mt-1">{contact.icp_revenue_tier || '-'}</p></div>
              </div>
              <div><h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Tecnologias Usadas</h4><div className="flex flex-wrap gap-2">{contact.icp_technologies?.map((tech, i) => (<span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{tech}</span>)) || <span className="text-slate-400 text-sm">Nao informado</span>}</div></div>
              <div><h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Pontos de Dor</h4><div className="flex flex-wrap gap-2">{contact.icp_pain_points?.map((pain, i) => (<span key={i} className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">{pain}</span>)) || <span className="text-slate-400 text-sm">Nao informado</span>}</div></div>
              <div><h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Objetivos</h4><div className="flex flex-wrap gap-2">{contact.icp_goals?.map((goal, i) => (<span key={i} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">{goal}</span>)) || <span className="text-slate-400 text-sm">Nao informado</span>}</div></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Decision Maker?</label><p className="text-slate-800 font-medium mt-1">{contact.icp_decision_maker ? 'Sim' : 'Nao'}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Nivel de Influencia</label><p className="text-slate-800 font-medium mt-1">{contact.icp_influence_level || '-'}</p></div>
              </div>
            </div>
          )}

          {activeTab === 'funil' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-emerald-600" /><h4 className="font-bold text-emerald-800">Funil de Origem</h4></div>
                <p className="text-sm text-emerald-600">Rastreie de onde veio este lead e suas campanhas</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Origem Principal</label><p className="text-lg font-bold text-slate-800 mt-1">{LEAD_SOURCES.find(s => s.value === contact.lead_source)?.icon} {LEAD_SOURCES.find(s => s.value === contact.lead_source)?.label || '-'}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Campanha</label><p className="text-slate-800 font-medium mt-1">{contact.lead_campaign || '-'}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Medium</label><p className="text-slate-800 font-medium mt-1">{contact.lead_medium || '-'}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Canal</label><p className="text-slate-800 font-medium mt-1">{contact.lead_channel || '-'}</p></div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">UTM Parameters</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-amber-50 rounded-xl p-3"><label className="text-xs font-bold text-amber-600">UTM Source</label><p className="text-amber-800 font-mono text-sm mt-1">{contact.utm_source || '-'}</p></div>
                  <div className="bg-amber-50 rounded-xl p-3"><label className="text-xs font-bold text-amber-600">UTM Medium</label><p className="text-amber-800 font-mono text-sm mt-1">{contact.utm_medium || '-'}</p></div>
                  <div className="bg-amber-50 rounded-xl p-3"><label className="text-xs font-bold text-amber-600">UTM Campaign</label><p className="text-amber-800 font-mono text-sm mt-1">{contact.utm_campaign || '-'}</p></div>
                  <div className="bg-amber-50 rounded-xl p-3"><label className="text-xs font-bold text-amber-600">UTM Content</label><p className="text-amber-800 font-mono text-sm mt-1">{contact.utm_content || '-'}</p></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Landing Page</label><p className="text-slate-800 text-sm mt-1 break-all">{contact.lead_landing_page || '-'}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><label className="text-xs font-bold text-slate-500 uppercase">Referrer</label><p className="text-slate-800 text-sm mt-1 break-all">{contact.lead_referrer || '-'}</p></div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between"><h4 className="text-sm font-bold text-slate-500 uppercase">Historico de Interacoes</h4><span className="text-xs text-slate-400">{interactions.length} interacoes</span></div>
              {interactions.length === 0 ? (
                <div className="text-center py-12"><Clock size={48} className="mx-auto text-slate-300 mb-4" /><p className="text-slate-500">Nenhuma interacao registrada</p></div>
              ) : (
                <div className="space-y-3">
                  {interactions.map((interaction) => (
                    <div key={interaction.id} className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">{getInteractionIcon(interaction.interaction_type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-800 text-sm">{getInteractionLabel(interaction.interaction_type)}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full", interaction.direction === 'inbound' ? 'bg-blue-100 text-blue-600' : interaction.direction === 'outbound' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600')}>
                            {interaction.direction === 'inbound' ? 'Entrada' : interaction.direction === 'outbound' ? 'Saida' : 'Interno'}
                          </span>
                        </div>
                        {interaction.content && (<p className="text-sm text-slate-600 truncate">{interaction.content}</p>)}
                        <p className="text-xs text-slate-400 mt-1">{new Date(interaction.occurred_at).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Adicionar uma nota sobre este contato..." className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400" rows={3} />
                <button onClick={handleAddNote} disabled={!newNote.trim()} className="px-4 py-2 bg-violet-500 text-white rounded-xl font-bold text-sm hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"><Plus size={18} /></button>
              </div>
              <div className="space-y-3">
                {notes.length === 0 ? (<p className="text-center text-slate-400 py-8">Nenhuma nota ainda</p>) : (
                  notes.map((note) => (
                    <div key={note.id} className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-700">{note.content}</p>
                      <p className="text-xs text-slate-400 mt-2">{new Date(note.created_at || '').toLocaleString('pt-BR')}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Create Contact Modal - COMPLETO
// ============================================

function CreateContactModal({ onClose, onCreate }: { onClose: () => void; onCreate: () => void; }) {
  const [activeTab, setActiveTab] = useState<'basico' | 'empresa' | 'icp' | 'origem' | 'redes' | 'preferencias'>('basico');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Record<string, any>>({
    name: '', first_name: '', last_name: '', nickname: '', birth_date: '', gender: '', cpf: '',
    phone_primary: '', phone_secondary: '', phone_whatsapp: '', email_primary: '', email_secondary: '',
    street: '', number: '', complement: '', neighborhood: '', city: '', state: '', country: 'Brasil', zip_code: '',
    company_name: '', company_cnpj: '', job_title: '', department: '', industry: '', company_size: '', company_revenue: 0,
    icp_segment: '', icp_company_type: '', icp_revenue_tier: '', icp_employee_count: '', icp_budget_range: '', icp_decision_maker: false, icp_influence_level: 'low',
    lead_source: '', lead_source_detail: '', lead_campaign: '', lead_medium: '', lead_channel: '', lead_landing_page: '', lead_referrer: '',
    utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: '',
    linkedin_url: '', instagram_url: '', facebook_url: '', twitter_url: '', website_url: '',
    lifecycle_stage: 'subscriber', engagement_level: 'cold', priority_level: 'medium', score_total: 0, estimated_value: 0,
    preferred_contact_channel: '', preferred_contact_time: '', preferred_language: 'pt-BR', interests: [],
  });

  const updateField = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name && !formData.phone_primary && !formData.email_primary) {
      alert('Preencha pelo menos nome, telefone ou email');
      return;
    }
    setSaving(true);
    try {
      await contactsDb.createContact(formData);
      onCreate();
      onClose();
    } catch (err) {
      console.error('Erro ao criar contato:', err);
      alert('Erro ao criar contato');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'basico' as const, label: 'Dados Pessoais', icon: <User size={16} /> },
    { id: 'empresa' as const, label: 'Empresa', icon: <Building size={16} /> },
    { id: 'icp' as const, label: 'ICP', icon: <Target size={16} /> },
    { id: 'origem' as const, label: 'Origem', icon: <TrendingUp size={16} /> },
    { id: 'redes' as const, label: 'Redes', icon: <Globe size={16} /> },
    { id: 'preferencias' as const, label: 'Preferencias', icon: <Shield size={16} /> },
  ];

  const inputClass = "w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all";
  const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-wider";
  const sectionClass = "bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-xl p-4 mb-4";
  const sectionIconClass = "w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-violet-600 to-purple-700 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white"><User size={24} /></div>
            <div><h3 className="text-xl font-black text-white">Novo Contato Completo</h3><p className="text-violet-200 text-sm">Preencha todas as informacoes do lead</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="flex border-b border-slate-200 px-4 overflow-x-auto shrink-0">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap", activeTab === tab.id ? "border-violet-500 text-violet-600" : "border-transparent text-slate-500 hover:text-slate-700")}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">

          {activeTab === 'basico' && (
            <div className="space-y-6">
              <div className={sectionClass}>
                <div className="flex items-center gap-3 mb-4"><div className={sectionIconClass}><User size={18} /></div><h4 className="font-bold text-violet-800">Informacoes Pessoais</h4></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className={labelClass}>Nome Completo *</label><input type="text" value={formData.name} onChange={(e) => updateField('name', e.target.value)} className={inputClass} placeholder="Joao da Silva" /></div>
                  <div><label className={labelClass}>Primeiro Nome</label><input type="text" value={formData.first_name} onChange={(e) => updateField('first_name', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Sobrenome</label><input type="text" value={formData.last_name} onChange={(e) => updateField('last_name', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Apelido</label><input type="text" value={formData.nickname} onChange={(e) => updateField('nickname', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Data de Nascimento</label><input type="date" value={formData.birth_date} onChange={(e) => updateField('birth_date', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Genero</label>
                    <select value={formData.gender} onChange={(e) => updateField('gender', e.target.value)} className={inputClass}>
                      <option value="">Selecione...</option><option value="M">Masculino</option><option value="F">Feminino</option><option value="O">Outro</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>CPF</label><input type="text" value={formData.cpf} onChange={(e) => updateField('cpf', e.target.value)} className={inputClass} placeholder="000.000.000-00" /></div>
                </div>
              </div>

              <div className={sectionClass}>
                <div className="flex items-center gap-3 mb-4"><div className={sectionIconClass}><Phone size={18} /></div><h4 className="font-bold text-violet-800">Contato</h4></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Telefone Principal</label><input type="tel" value={formData.phone_primary} onChange={(e) => updateField('phone_primary', e.target.value)} className={inputClass} placeholder="5548999999999" /></div>
                  <div><label className={labelClass}>Telefone Secundario</label><input type="tel" value={formData.phone_secondary} onChange={(e) => updateField('phone_secondary', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>WhatsApp</label><input type="tel" value={formData.phone_whatsapp} onChange={(e) => updateField('phone_whatsapp', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Email Principal</label><input type="email" value={formData.email_primary} onChange={(e) => updateField('email_primary', e.target.value)} className={inputClass} placeholder="email@empresa.com" /></div>
                  <div className="col-span-2"><label className={labelClass}>Email Secundario</label><input type="email" value={formData.email_secondary} onChange={(e) => updateField('email_secondary', e.target.value)} className={inputClass} /></div>
                </div>
              </div>

              <div className={sectionClass}>
                <div className="flex items-center gap-3 mb-4"><div className={sectionIconClass}><MapPin size={18} /></div><h4 className="font-bold text-violet-800">Endereco</h4></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2"><label className={labelClass}>Rua</label><input type="text" value={formData.street} onChange={(e) => updateField('street', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Numero</label><input type="text" value={formData.number} onChange={(e) => updateField('number', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Complemento</label><input type="text" value={formData.complement} onChange={(e) => updateField('complement', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Bairro</label><input type="text" value={formData.neighborhood} onChange={(e) => updateField('neighborhood', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>CEP</label><input type="text" value={formData.zip_code} onChange={(e) => updateField('zip_code', e.target.value)} className={inputClass} placeholder="88000-000" /></div>
                  <div><label className={labelClass}>Cidade</label><input type="text" value={formData.city} onChange={(e) => updateField('city', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Estado</label><input type="text" value={formData.state} onChange={(e) => updateField('state', e.target.value)} className={inputClass} placeholder="SC" /></div>
                  <div><label className={labelClass}>Pais</label><input type="text" value={formData.country} onChange={(e) => updateField('country', e.target.value)} className={inputClass} /></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'empresa' && (
            <div className="space-y-6">
              <div className={sectionClass}>
                <div className="flex items-center gap-3 mb-4"><div className={sectionIconClass}><Building size={18} /></div><h4 className="font-bold text-violet-800">Dados da Empresa</h4></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className={labelClass}>Nome da Empresa</label><input type="text" value={formData.company_name} onChange={(e) => updateField('company_name', e.target.value)} className={inputClass} placeholder="Empresa LTDA" /></div>
                  <div><label className={labelClass}>CNPJ</label><input type="text" value={formData.company_cnpj} onChange={(e) => updateField('company_cnpj', e.target.value)} className={inputClass} placeholder="00.000.000/0001-00" /></div>
                  <div><label className={labelClass}>Segmento/Industria</label>
                    <select value={formData.industry} onChange={(e) => updateField('industry', e.target.value)} className={inputClass}>
                      <option value="">Selecione...</option>
                      <option value="Tecnologia">Tecnologia</option><option value="Saude">Saude</option><option value="Educacao">Educacao</option><option value="Financeiro">Financeiro</option><option value="Varejo">Varejo</option><option value="Manufatura">Manufatura</option><option value="Construcao">Construcao</option><option value="Marketing">Marketing</option><option value="Consultoria">Consultoria</option><option value="Juridico">Juridico</option><option value="Imobiliario">Imobiliario</option><option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Cargo</label><input type="text" value={formData.job_title} onChange={(e) => updateField('job_title', e.target.value)} className={inputClass} placeholder="Gerente de Vendas" /></div>
                  <div><label className={labelClass}>Departamento</label><input type="text" value={formData.department} onChange={(e) => updateField('department', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Porte da Empresa</label>
                    <select value={formData.company_size} onChange={(e) => updateField('company_size', e.target.value)} className={inputClass}>
                      <option value="">Selecione...</option><option value="1-10">1-10 funcionarios (MEI)</option><option value="11-50">11-50 funcionarios (Pequena)</option><option value="51-200">51-200 funcionarios (Media)</option><option value="201-500">201-500 funcionarios (Media-Grande)</option><option value="501-1000">501-1000 funcionarios (Grande)</option><option value="1000+">1000+ funcionarios (Corporacao)</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Faturamento Anual</label><input type="number" value={formData.company_revenue} onChange={(e) => updateField('company_revenue', Number(e.target.value))} className={inputClass} placeholder="0" /></div>
                </div>
              </div>

              <div className={sectionClass}>
                <div className="flex items-center gap-3 mb-4"><div className={sectionIconClass}><DollarSign size={18} /></div><h4 className="font-bold text-violet-800">Valor e Classificacao</h4></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className={labelClass}>Valor Estimado (R$)</label><input type="number" value={formData.estimated_value} onChange={(e) => updateField('estimated_value', Number(e.target.value))} className={inputClass} /></div>
                  <div><label className={labelClass}>Score (0-100)</label><input type="number" min="0" max="100" value={formData.score_total} onChange={(e) => updateField('score_total', Number(e.target.value))} className={inputClass} /></div>
                  <div><label className={labelClass}>Lifecycle</label>
                    <select value={formData.lifecycle_stage} onChange={(e) => updateField('lifecycle_stage', e.target.value)} className={inputClass}>
                      <option value="subscriber">Assinante</option><option value="lead">Lead</option><option value="marketing_qualified">MQL</option><option value="sales_qualified">SQL</option><option value="opportunity">Oportunidade</option><option value="customer">Cliente</option><option value="evangelist">Evangelista</option><option value="churned">Perdido</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Engajamento</label>
                    <select value={formData.engagement_level} onChange={(e) => updateField('engagement_level', e.target.value)} className={inputClass}>
                      <option value="cold">Frio</option><option value="warm">Morno</option><option value="hot">Quente</option><option value="champion">Campeao</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Prioridade</label>
                    <select value={formData.priority_level} onChange={(e) => updateField('priority_level', e.target.value)} className={inputClass}>
                      <option value="low">Baixa</option><option value="medium">Media</option><option value="high">Alta</option><option value="urgent">Urgente</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'icp' && (
            <div className="space-y-6">
              <div className={sectionClass}>
                <div className="flex items-center gap-3 mb-4"><div className={sectionIconClass}><Target size={18} /></div><h4 className="font-bold text-violet-800">ICP - Ideal Customer Profile</h4></div>
                <p className="text-sm text-violet-600 mb-4">Defina o perfil do cliente ideal para este lead</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Segmento ICP</label><input type="text" value={formData.icp_segment} onChange={(e) => updateField('icp_segment', e.target.value)} className={inputClass} placeholder="Ex: E-commerce, SaaS B2B..." /></div>
                  <div><label className={labelClass}>Tipo de Empresa</label><input type="text" value={formData.icp_company_type} onChange={(e) => updateField('icp_company_type', e.target.value)} className={inputClass} placeholder="Startup, MEI, Multinacional..." /></div>
                  <div><label className={labelClass}>Porte (Funcionarios)</label>
                    <select value={formData.icp_employee_count} onChange={(e) => updateField('icp_employee_count', e.target.value)} className={inputClass}>
                      <option value="">Selecione...</option><option value="1-10">1-10</option><option value="11-50">11-50</option><option value="51-200">51-200</option><option value="201-500">201-500</option><option value="500+">500+</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Faixa de Receita</label><input type="text" value={formData.icp_revenue_tier} onChange={(e) => updateField('icp_revenue_tier', e.target.value)} className={inputClass} placeholder="R$ 100K - 500K" /></div>
                  <div><label className={labelClass}>Faixa de Orcamento</label><input type="text" value={formData.icp_budget_range} onChange={(e) => updateField('icp_budget_range', e.target.value)} className={inputClass} placeholder="R$ 5K - 20K/mes" /></div>
                  <div className="col-span-2 flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <input type="checkbox" id="decision_maker" checked={formData.icp_decision_maker} onChange={(e) => updateField('icp_decision_maker', e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    <label htmlFor="decision_maker" className="text-sm font-medium text-slate-700 cursor-pointer">E tomador de decisao?</label>
                  </div>
                  <div><label className={labelClass}>Nivel de Influencia</label>
                    <select value={formData.icp_influence_level} onChange={(e) => updateField('icp_influence_level', e.target.value)} className={inputClass}>
                      <option value="low">Baixa</option><option value="medium">Media</option><option value="high">Alta</option><option value="decision_maker">Tomador de Decisao</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={sectionClass}>
                <div className="flex items-center gap-3 mb-4"><div className={sectionIconClass}><Award size={18} /></div><h4 className="font-bold text-violet-800">Tecnologias e Dores</h4></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Tecnologias Usadas (separadas por virgula)</label><input type="text" value={formData.icp_technologies?.join(', ')} onChange={(e) => updateField('icp_technologies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className={inputClass} placeholder="React, Node.js, AWS..." /></div>
                  <div><label className={labelClass}>Pontos de Dor (separados por virgula)</label><input type="text" value={formData.icp_pain_points?.join(', ')} onChange={(e) => updateField('icp_pain_points', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className={inputClass} placeholder="Custo alto, Suporte ruim..." /></div>
                  <div className="col-span-2"><label className={labelClass}>Objetivos (separados por virgula)</label><input type="text" value={formData.icp_goals?.join(', ')} onChange={(e) => updateField('icp_goals', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className={inputClass} placeholder="Reducao de custos, Aumento de vendas..." /></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'origem' && (
            <div className="space-y-6">
              <div className={sectionClass}>
                <div className="flex items-center gap-3 mb-4"><div className={sectionIconClass}><TrendingUp size={18} /></div><h4 className="font-bold text-violet-800">Funil de Origem</h4></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Origem Principal</label>
                    <select value={formData.lead_source} onChange={(e) => updateField('lead_source', e.target.value)} className={inputClass}>
                      <option value="">Selecione...</option>
                      {LEAD_SOURCES.map(s => (<option key={s.value} value={s.value}>{s.icon} {s.label}</option>))}
                    </select>
                  </div>
                  <div><label className={labelClass}>Campanha</label><input type="text" value={formData.lead_campaign} onChange={(e) => updateField('lead_campaign', e.target.value)} className={inputClass} placeholder="Nome da campanha" /></div>
                  <div><label className={labelClass}>Medium</label><input type="text" value={formData.lead_medium} onChange={(e) => updateField('lead_medium', e.target.value)} className={inputClass} placeholder="cpc, email, social..." /></div>
                  <div><label className={labelClass}>Canal</label><input type="text" value={formData.lead_channel} onChange={(e) => updateField('lead_channel', e.target.value)} className={inputClass} placeholder="Google, Facebook, Organico..." /></div>
                  <div className="col-span-2"><label className={labelClass}>Detalhe da Origem</label><input type="text" value={formData.lead_source_detail} onChange={(e) => updateField('lead_source_detail', e.target.value)} className={inputClass} placeholder="URL, banner ID, etc" /></div>
                  <div className="col-span-2"><label className={labelClass}>Landing Page</label><input type="text" value={formData.lead_landing_page} onChange={(e) => updateField('lead_landing_page', e.target.value)} className={inputClass} placeholder="URL da pagina de captura" /></div>
                  <div className="col-span-2"><label className={labelClass}>Quem Indicou / Referrer</label><input type="text" value={formData.lead_referrer} onChange={(e) => updateField('lead_referrer', e.target.value)} className={inputClass} placeholder="Nome ou URL de quem indicou" /></div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4"><div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600"><Activity size={18} /></div><h4 className="font-bold text-amber-800">UTM Parameters</h4></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>UTM Source</label><input type="text" value={formData.utm_source} onChange={(e) => updateField('utm_source', e.target.value)} className={inputClass} placeholder="google, facebook, newsletter" /></div>
                  <div><label className={labelClass}>UTM Medium</label><input type="text" value={formData.utm_medium} onChange={(e) => updateField('utm_medium', e.target.value)} className={inputClass} placeholder="cpc, email, banner" /></div>
                  <div><label className={labelClass}>UTM Campaign</label><input type="text" value={formData.utm_campaign} onChange={(e) => updateField('utm_campaign', e.target.value)} className={inputClass} placeholder="vera_2024" /></div>
                  <div><label className={labelClass}>UTM Content</label><input type="text" value={formData.utm_content} onChange={(e) => updateField('utm_content', e.target.value)} className={inputClass} placeholder="banner_300x250" /></div>
                  <div className="col-span-2"><label className={labelClass}>UTM Term</label><input type="text" value={formData.utm_term} onChange={(e) => updateField('utm_term', e.target.value)} className={inputClass} placeholder="palavras-chave" /></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'redes' && (
            <div className="space-y-6">
              <div className={sectionClass}>
                <div className="flex items-center gap-3 mb-4"><div className={sectionIconClass}><Globe size={18} /></div><h4 className="font-bold text-violet-800">Redes Sociais e Web</h4></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>LinkedIn</label><input type="url" value={formData.linkedin_url} onChange={(e) => updateField('linkedin_url', e.target.value)} className={inputClass} placeholder="https://linkedin.com/in/seu-perfil" /></div>
                  <div><label className={labelClass}>Instagram</label><input type="text" value={formData.instagram_url} onChange={(e) => updateField('instagram_url', e.target.value)} className={inputClass} placeholder="@seu.usuario" /></div>
                  <div><label className={labelClass}>Facebook</label><input type="url" value={formData.facebook_url} onChange={(e) => updateField('facebook_url', e.target.value)} className={inputClass} /></div>
                  <div><label className={labelClass}>Twitter/X</label><input type="text" value={formData.twitter_url} onChange={(e) => updateField('twitter_url', e.target.value)} className={inputClass} placeholder="@seu.usuario" /></div>
                  <div className="col-span-2"><label className={labelClass}>Website</label><input type="url" value={formData.website_url} onChange={(e) => updateField('website_url', e.target.value)} className={inputClass} placeholder="https://www.suaempresa.com.br" /></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferencias' && (
            <div className="space-y-6">
              <div className={sectionClass}>
                <div className="flex items-center gap-3 mb-4"><div className={sectionIconClass}><MessageCircle size={18} /></div><h4 className="font-bold text-violet-800">Preferencias de Contato</h4></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Canal Preferido</label>
                    <select value={formData.preferred_contact_channel} onChange={(e) => updateField('preferred_contact_channel', e.target.value)} className={inputClass}>
                      <option value="">Selecione...</option><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="phone">Telefone</option><option value="sms">SMS</option><option value="linkedin">LinkedIn</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Horario Preferido</label>
                    <select value={formData.preferred_contact_time} onChange={(e) => updateField('preferred_contact_time', e.target.value)} className={inputClass}>
                      <option value="">Selecione...</option><option value="morning">Manha (8h-12h)</option><option value="afternoon">Tarde (12h-18h)</option><option value="evening">Noite (18h-22h)</option><option value="any">Qualquer horario</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Idioma</label>
                    <select value={formData.preferred_language} onChange={(e) => updateField('preferred_language', e.target.value)} className={inputClass}>
                      <option value="pt-BR">Portugues (Brasil)</option><option value="en">English</option><option value="es">Espanol</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Interesses</label><input type="text" value={formData.interests?.join(', ')} onChange={(e) => updateField('interests', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className={inputClass} placeholder="Produtos, servicos..." /></div>
                </div>
              </div>

              <div className={sectionClass}>
                <div className="flex items-center gap-3 mb-4"><div className={sectionIconClass}><Shield size={18} /></div><h4 className="font-bold text-violet-800">LGPD e Status</h4></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <input type="checkbox" id="opt_out" checked={formData.opt_out_marketing} onChange={(e) => updateField('opt_out_marketing', e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    <label htmlFor="opt_out" className="text-sm font-medium text-slate-700 cursor-pointer">Opt-out de marketing (nao receber comunicacoes)</label>
                  </div>
                  <div className="col-span-2 flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <input type="checkbox" id="do_not_disturb" checked={formData.do_not_disturb} onChange={(e) => updateField('do_not_disturb', e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    <label htmlFor="do_not_disturb" className="text-sm font-medium text-slate-700 cursor-pointer">Nao perturbe (nao contatar)</label>
                  </div>
                  <div className="col-span-2 flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <input type="checkbox" id="is_blocked" checked={formData.is_blocked} onChange={(e) => updateField('is_blocked', e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                    <label htmlFor="is_blocked" className="text-sm font-medium text-slate-700 cursor-pointer">Bloqueado</label>
                  </div>
                  {formData.is_blocked && (
                    <div className="col-span-2"><label className={labelClass}>Motivo do Bloqueio</label><textarea value={formData.block_reason} onChange={(e) => updateField('block_reason', e.target.value)} className={inputClass} rows={2} /></div>
                  )}
                </div>
              </div>
            </div>
          )}

        </form>

        <div className="p-6 border-t border-slate-200 flex gap-3 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors">Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-violet-500 rounded-xl text-white font-bold text-sm hover:bg-violet-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {saving ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Criando...</>) : (<><Plus size={18} />Criar Contato</>)}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
