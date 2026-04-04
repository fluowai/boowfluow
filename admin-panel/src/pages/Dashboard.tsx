import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Plus, Search, ExternalLink, Edit2, Trash2, 
  RefreshCcw, AlertTriangle, ShieldCheck, Clock 
} from 'lucide-react';

interface Whitelabel {
  id: string;
  slug: string;
  domain: string;
  status: 'provisioning' | 'active' | 'suspended';
  created_at: string;
  vercel_project_id: string;
  theme: any;
}

export const Dashboard: React.FC = () => {
  const [clients, setClients] = useState<Whitelabel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/admin/whitelabels', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('ADMIN_API_KEY')}` }
      });
      setClients(response.data);
    } catch (err) {
      console.error('[Dashboard] Erro ao buscar clientes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter(c => 
    c.slug.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRedeploy = async (id: string) => {
    if (!confirm('Deseja disparar um novo deploy na Vercel para este parceiro?')) return;
    try {
      await axios.post(`/api/admin/whitelabels/${id}/deploy`, {}, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('ADMIN_API_KEY')}` }
      });
      alert('Redeploy disparado com sucesso!');
      fetchClients();
    } catch (err) {
      alert('Falha ao disparar redeploy.');
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm('Deseja REALMENTE suspender este parceiro? Ele perderá acesso ao sistema imediatamente.')) return;
    try {
      await axios.delete(`/api/admin/whitelabels/${id}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('ADMIN_API_KEY')}` }
      });
      alert('Parceiro suspenso.');
      fetchClients();
    } catch (err) {
      alert('Falha ao suspender parceiro.');
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Gerenciamento Whitelabel</h1>
          <p className="text-slate-500 font-medium">Controle total sobre seus parceiros e instâncias provisionadas.</p>
        </div>
        <button 
          onClick={() => navigate('/new')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Plus size={20} />
          Novo Parceiro
        </button>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Parceiros" value={clients.length} icon={<Users className="text-indigo-600" />} />
        <StatCard title="Ativos" value={clients.filter(c => c.status === 'active').length} icon={<ShieldCheck className="text-emerald-500" />} />
        <StatCard title="Provisionando" value={clients.filter(c => c.status === 'provisioning').length} icon={<Clock className="text-amber-500" />} />
        <StatCard title="Suspensos" value={clients.filter(c => c.status === 'suspended').length} icon={<AlertTriangle className="text-rose-500" />} />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou domínio..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border-slate-200 focus:ring-indigo-500 rounded-lg text-sm"
            />
          </div>
          <button 
            onClick={fetchClients}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
          >
            <RefreshCcw size={18} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4">Parceiro / Identificador</th>
                <th className="px-6 py-4">Domínio</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Criação</th>
                <th className="px-6 py-4 text-right pr-10">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Carregando parceiros...</td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Nenhum parceiro encontrado.</td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                          {client.slug.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{client.theme.app_name}</span>
                          <span className="text-xs text-slate-400">ID: {client.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <a 
                        href={`https://${client.domain}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-indigo-600 font-medium flex items-center gap-1 hover:underline"
                      >
                        {client.domain}
                        <ExternalLink size={14} />
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500">{new Date(client.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right pr-6 space-x-2">
                       <button 
                        onClick={() => handleRedeploy(client.id)}
                        title="Forçar Redeploy"
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                       >
                         <RefreshCcw size={16} />
                       </button>
                       <button 
                        onClick={() => navigate(`/edit/${client.id}`)}
                        title="Editar Configurações"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                       >
                         <Edit2 size={16} />
                       </button>
                       <button 
                        onClick={() => handleSuspend(client.id)}
                        title="Suspender Parceiro"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                       >
                         <Trash2 size={16} />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string, value: number | string, icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
    <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-xl shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: Whitelabel['status'] }> = ({ status }) => {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20',
    provisioning: 'bg-amber-100 text-amber-700 ring-1 ring-amber-600/20',
    suspended: 'bg-rose-100 text-rose-700 ring-1 ring-rose-600/20'
  };

  const labels = {
    active: 'Ativo',
    provisioning: 'Provisionando',
    suspended: 'Suspenso'
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};
