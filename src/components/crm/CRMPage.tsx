import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Phone,
  Mail,
  Building,
  MapPin,
  Calendar,
  MessageSquare,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Star,
  Clock,
  UserPlus,
  Tag,
  X,
  ChevronDown,
  RefreshCw,
  Activity,
  Award,
  AlertCircle,
  CheckCircle2,
  User,
  Send,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as crmDb from '../../services/crmDb';
import { Lead, LeadFilters, CRMStats, Tag as TagType } from '../../services/crmDb';
import { whatsappService } from '../../services/whatsapp';

export function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<LeadFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'kanban'>('list');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsData, statsData, tagsData] = await Promise.all([
        crmDb.getLeads({ ...filters, search: searchTerm }),
        crmDb.getCRMStats(),
        crmDb.getTags(),
      ]);
      setLeads(leadsData);
      setStats(statsData);
      setTags(tagsData);
    } catch (err) {
      console.error('CRM: Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleWhatsAppClick = async (lead: Lead) => {
    if (lead.phone) {
      const phone = lead.phone.includes('@') ? lead.phone : `${lead.phone}@c.us`;
      try {
        await whatsappService.sendMessage(phone, 'Olá! Vim do CRM Fluo.', 'default');
      } catch (err) {
        console.error('Erro ao abrir WhatsApp:', err);
      }
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (confirm(`Deseja realmente excluir o lead "${lead.name}"?`)) {
      await crmDb.deleteLead(lead.id);
      loadData();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50';
    if (score >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-slate-600 bg-slate-100';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700',
      inactive: 'bg-slate-100 text-slate-600',
      converted: 'bg-blue-100 text-blue-700',
      lost: 'bg-rose-100 text-rose-700',
    };
    return styles[status] || styles.inactive;
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-start shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
            <Users size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              CRM <span className="text-[10px] font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full uppercase ml-1">Beta</span>
            </h2>
            <p className="text-sm text-slate-500 font-medium">Gestão completa de leads e oportunidades</p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-200 hover:shadow-emerald-300"
        >
          <Plus size={18} />
          Novo Lead
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <StatCard
            icon={<Users size={20} />}
            label="Total de Leads"
            value={stats.totalLeads}
            trend={stats.activeLeads}
            trendLabel="ativos"
            color="slate"
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            label="Conversões"
            value={stats.convertedLeads}
            trend={Math.round((stats.convertedLeads / stats.totalLeads) * 100) || 0}
            trendLabel="taxa %"
            color="emerald"
          />
          <StatCard
            icon={<DollarSign size={20} />}
            label="Valor Pipeline"
            value={`R$ ${stats.totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
            color="amber"
          />
          <StatCard
            icon={<Target size={20} />}
            label="Score Médio"
            value={stats.avgScore}
            trend={stats.avgScore >= 50 ? 'up' : 'down'}
            color="indigo"
          />
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex gap-3 items-center shrink-0">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, email ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-all",
            showFilters ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
        >
          <Filter size={16} />
          Filtros
        </button>
        <button
          onClick={loadData}
          className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          title="Atualizar"
        >
          <RefreshCw size={18} className={cn("text-slate-500", loading && "animate-spin")} />
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 flex-wrap">
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="converted">Convertido</option>
                <option value="lost">Perdido</option>
              </select>
              <select
                value={filters.source || ''}
                onChange={(e) => setFilters({ ...filters, source: e.target.value || undefined })}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Origem</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="manual">Manual</option>
                <option value="import">Importado</option>
                <option value="referral">Indicação</option>
              </select>
              <select
                value={filters.minScore !== undefined ? String(filters.minScore) : ''}
                onChange={(e) => setFilters({ ...filters, minScore: e.target.value ? Number(e.target.value) : undefined })}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Score Mínimo</option>
                <option value="80">80+ (Quente)</option>
                <option value="50">50+ (Morno)</option>
                <option value="20">20+ (Frio)</option>
              </select>
              <button
                onClick={() => setFilters({})}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium"
              >
                Limpar Filtros
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leads List */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Users size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Nenhum lead encontrado</h3>
            <p className="text-sm text-slate-500 mt-1">Crie seu primeiro lead ou ajuste os filtros</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all"
            >
              <Plus size={16} />
              Criar Lead
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Lead</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tags</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Último Contato</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-slate-50/50 cursor-pointer transition-colors group"
                  onClick={() => setSelectedLead(lead)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-sm">
                        {lead.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{lead.name || 'Sem nome'}</p>
                        <p className="text-xs text-slate-500">{lead.company || 'Empresa não informada'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-emerald-600 transition-colors"
                      >
                        <Phone size={12} />
                        {lead.phone ? `+${lead.phone}` : '-'}
                      </a>
                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
                        >
                          <Mail size={12} />
                          {lead.email}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags?.slice(0, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                      {(lead.tags?.length || 0) > 2 && (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-xs font-bold">
                          +{(lead.tags?.length || 0) - 2}
                        </span>
                      )}
                      {(!lead.tags || lead.tags.length === 0) && (
                        <span className="text-xs text-slate-400">Sem tags</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={cn("px-2.5 py-1 rounded-lg font-bold text-sm", getScoreColor(lead.score))}>
                        {lead.score}
                      </div>
                      {lead.score >= 80 && <Star size={14} className="text-amber-500 fill-amber-500" />}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">
                      {lead.estimated_value > 0
                        ? `R$ ${lead.estimated_value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
                        : '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600">
                      {lead.last_contact
                        ? new Date(lead.last_contact).toLocaleDateString('pt-BR')
                        : lead.created_at
                        ? new Date(lead.created_at).toLocaleDateString('pt-BR')
                        : '-'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleWhatsAppClick(lead); }}
                        className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors"
                        title="Enviar WhatsApp"
                      >
                        <MessageSquare size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                        className="p-2 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead); }}
                        className="p-2 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Lead Detail Modal */}
      <AnimatePresence>
        {selectedLead && (
          <LeadDetailModal
            lead={selectedLead}
            tags={tags}
            onClose={() => setSelectedLead(null)}
            onUpdate={loadData}
          />
        )}
      </AnimatePresence>

      {/* Create Lead Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateLeadModal
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={loadData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// StatCard Component
// ============================================

function StatCard({
  icon,
  label,
  value,
  trend,
  trendLabel,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend?: number | string;
  trendLabel?: string;
  color: 'slate' | 'emerald' | 'amber' | 'indigo';
}) {
  const colors: Record<string, { bg: string; icon: string; text: string }> = {
    slate: { bg: 'bg-slate-100', icon: 'text-slate-600', text: 'text-slate-800' },
    emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', text: 'text-emerald-800' },
    amber: { bg: 'bg-amber-100', icon: 'text-amber-600', text: 'text-amber-800' },
    indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600', text: 'text-indigo-800' },
  };

  const c = colors[color];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.bg)}>
          <span className={c.icon}>{icon}</span>
        </div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <p className={cn("text-2xl font-black", c.text)}>{value}</p>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold",
            typeof trend === 'number' && trend > 0 ? 'text-emerald-600' : 'text-slate-500'
          )}>
            {typeof trend === 'number' && trend > 0 ? <TrendingUp size={12} /> : null}
            <span>{typeof trend === 'number' ? `${trend} ${trendLabel}` : trend}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Lead Detail Modal
// ============================================

function LeadDetailModal({
  lead,
  tags,
  onClose,
  onUpdate
}: {
  lead: Lead;
  tags: TagType[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'activities'>('info');
  const [notes, setNotes] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: lead.name,
    email: lead.email || '',
    phone: lead.phone,
    company: lead.company || '',
    city: lead.city || '',
    state: lead.state || '',
    score: lead.score,
    estimated_value: lead.estimated_value,
    notes: lead.notes || '',
    status: lead.status,
  });

  useEffect(() => {
    loadNotes();
    loadActivities();
  }, [lead.id]);

  const loadNotes = async () => {
    const data = await crmDb.getLeadNotes(lead.id);
    setNotes(data);
  };

  const loadActivities = async () => {
    const data = await crmDb.getLeadActivities(lead.id);
    setActivities(data);
  };

  const handleSave = async () => {
    await crmDb.updateLead(lead.id, formData);
    setIsEditing(false);
    onUpdate();
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await crmDb.addLeadNote(lead.id, newNote);
    setNewNote('');
    loadNotes();
  };

  const handleSendWhatsApp = async () => {
    const phone = lead.phone?.includes('@') ? lead.phone : `${lead.phone}@c.us`;
    await whatsappService.sendMessage(phone, 'Olá! Vim do CRM Fluo.', 'default');
  };

  const tabs = [
    { id: 'info', label: 'Informações', icon: <User size={14} /> },
    { id: 'notes', label: 'Notas', icon: <Edit2 size={14} /> },
    { id: 'activities', label: 'Atividades', icon: <Activity size={14} /> },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {lead.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h3 className="text-xl font-black text-white">{lead.name || 'Lead sem nome'}</h3>
              <p className="text-slate-300 text-sm">{lead.company || 'Empresa não informada'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Score & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Score</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.score}
                      onChange={(e) => setFormData({ ...formData, score: Number(e.target.value) })}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-2xl font-black text-slate-800"
                    />
                  ) : (
                    <p className="text-3xl font-black text-slate-800 mt-1">{lead.score}</p>
                  )}
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
                  {isEditing ? (
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                      <option value="converted">Convertido</option>
                      <option value="lost">Perdido</option>
                    </select>
                  ) : (
                    <span className={cn(
                      "inline-block mt-1 px-3 py-1 rounded-full text-sm font-bold",
                      lead.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      lead.status === 'converted' ? 'bg-blue-100 text-blue-700' :
                      lead.status === 'lost' ? 'bg-rose-100 text-rose-700' :
                      'bg-slate-200 text-slate-600'
                    )}>
                      {lead.status === 'active' ? 'Ativo' :
                       lead.status === 'converted' ? 'Convertido' :
                       lead.status === 'lost' ? 'Perdido' : 'Inativo'}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Dados de Contato</h4>
                
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-500">Nome</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Telefone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Empresa</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Cidade</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Estado</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Phone size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">{lead.phone || '-'}</span>
                      <button
                        onClick={handleSendWhatsApp}
                        className="ml-auto p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                      >
                        <MessageSquare size={14} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Mail size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">{lead.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <Building size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">{lead.company || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <MapPin size={16} className="text-slate-400" />
                      <span className="text-sm font-medium">
                        {[lead.city, lead.state].filter(Boolean).join(', ') || '-'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {lead.tags?.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {(!lead.tags || lead.tags.length === 0) && (
                    <span className="text-sm text-slate-400">Sem tags</span>
                  )}
                </div>
              </div>

              {/* Summary */}
              {lead.summary && (
                <div>
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Resumo IA</h4>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800">{lead.summary}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 px-4 py-2.5 bg-emerald-500 rounded-xl text-white font-bold text-sm hover:bg-emerald-600 transition-colors"
                    >
                      Salvar Alterações
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 rounded-xl text-white font-bold text-sm hover:bg-slate-900 transition-colors"
                  >
                    <Edit2 size={16} />
                    Editar Lead
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Add Note */}
              <div className="flex gap-3">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Adicionar uma nota..."
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  rows={3}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-xl font-bold text-sm hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Notes List */}
              <div className="space-y-3">
                {notes.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Nenhuma nota ainda</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-sm text-slate-700">{note.content}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(note.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Nenhuma atividade ainda</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3 p-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      activity.type === 'message' ? 'bg-emerald-100 text-emerald-600' :
                      activity.type === 'note' ? 'bg-indigo-100 text-indigo-600' :
                      activity.type === 'created' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-100 text-slate-600'
                    )}>
                      {activity.type === 'message' ? <MessageSquare size={14} /> :
                       activity.type === 'note' ? <Edit2 size={14} /> :
                       activity.type === 'created' ? <UserPlus size={14} /> :
                       <Activity size={14} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{activity.content || `Atividade: ${activity.type}`}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(activity.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Create Lead Modal
// ============================================

function CreateLeadModal({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    city: '',
    state: '',
    notes: '',
    estimated_value: 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name && !formData.phone) return;

    setSaving(true);
    try {
      await crmDb.createLead(formData);
      onCreate();
      onClose();
    } catch (err) {
      console.error('Erro ao criar lead:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800">Novo Lead</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                placeholder="5548999999999"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                placeholder="Nome da empresa"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Estimado (R$)</label>
              <input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: Number(e.target.value) })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cidade</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                placeholder="Cidade"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                placeholder="UF"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notas</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                rows={3}
                placeholder="Observações sobre o lead..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || (!formData.name && !formData.phone)}
              className="flex-1 px-4 py-2.5 bg-emerald-500 rounded-xl text-white font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Criando...' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
