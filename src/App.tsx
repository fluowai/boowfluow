import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Bot, 
  BarChart3, 
  Calendar, 
  Search, 
  Users, 
  Link as LinkIcon, 
  Settings, 
  Phone, 
  Send, 
  Zap, 
  Radio, 
  ChevronDown, 
  RefreshCw, 
  LogOut, 
  User,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Info,
  X,
  CheckCircle2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { sectors } from './constants/agents';
import { supabase } from './lib/supabase';
import { GlobalAIChat } from './components/GlobalAIChat';

// Mock data for charts
const evolutionData = [
  { name: '01/03', value: 400 },
  { name: '05/03', value: 300 },
  { name: '10/03', value: 600 },
  { name: '15/03', value: 800 },
  { name: '20/03', value: 500 },
  { name: '25/03', value: 900 },
  { name: '29/03', value: 1100 },
];

const topSellers = [
  { id: 1, name: 'Maria Silva', neg: 93, ganhas: 28, valor: 'R$ 42K' },
  { id: 2, name: 'João Santos', neg: 26, ganhas: 22, valor: 'R$ 35K' },
  { id: 3, name: 'Ana Costa', neg: 25, ganhas: 19, valor: 'R$ 28K' },
];

const stages = [
  { name: 'Novo lead', value: 50, percentage: 39, color: 'bg-blue-500' },
  { name: 'Qualificação', value: 30, percentage: 23, color: 'bg-indigo-500' },
  { name: 'Proposta', value: 20, percentage: 15, color: 'bg-purple-500' },
  { name: 'Negociação', value: 15, percentage: 11, color: 'bg-pink-500' },
  { name: 'Fechamento', value: 13, percentage: 10, color: 'bg-emerald-500' },
];

const SidebarItem = ({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
    "flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 rounded-lg mx-2",
    active ? "bg-amber-400/10 text-amber-400 border-l-4 border-amber-400" : "text-slate-400 hover:bg-slate-800 hover:text-white"
  )}>
    <Icon size={18} />
    <span className="text-sm font-medium">{label}</span>
  </div>
);

const TopNavItem = ({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium",
    active ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:bg-slate-100"
  )}>
    <Icon size={16} />
    {label}
  </button>
);

const StatusCard = ({ icon: Icon, title, status, subtext, color, active = true }: { icon: any, title: string, status: string, subtext: string, color: string, active?: boolean }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3">
    <div className="flex justify-between items-start">
      <div className={cn("p-2 rounded-lg", color)}>
        <Icon size={20} className="text-slate-700" />
      </div>
      <div className="flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full", active ? "bg-emerald-500" : "bg-slate-300")} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {active ? "Online" : "Inativo"}
        </span>
      </div>
    </div>
    <div>
      <p className="text-xs text-slate-400 font-medium">{title}</p>
      <h3 className="text-lg font-bold text-slate-800">{status}</h3>
      <p className="text-[10px] text-slate-400 mt-0.5">{subtext}</p>
    </div>
  </div>
);

const MetricCard = ({ label, value, subtext, color, trend }: { label: string, value: string, subtext: string, color: string, trend?: string }) => (
  <div className={cn("p-4 rounded-xl border flex flex-col items-center text-center gap-1", color)}>
    <h4 className="text-xl font-bold text-slate-800">{value}</h4>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <div className="flex items-center gap-1 mt-1">
      <span className="text-[10px] font-medium text-slate-400">{subtext}</span>
      {trend && (
        <span className={cn("text-[10px] font-bold", trend.startsWith('+') ? "text-emerald-500" : "text-rose-500")}>
          {trend}
        </span>
      )}
    </div>
  </div>
);

const SmallStat = ({ label, value }: { label: string, value: string }) => (
  <div className="flex flex-col items-center text-center gap-1">
    <h4 className="text-lg font-bold text-slate-800">{value}</h4>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [selectedSector, setSelectedSector] = useState(sectors[0].id);
  const [myAgents, setMyAgents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', description: '', sector: sectors[0].id });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  React.useEffect(() => {
    fetchMyAgents();
  }, []);

  const fetchMyAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setMyAgents(data);
    } catch (err) {
      console.error('Erro ao buscar agentes:', err);
    }
  };

  const handleActivateAgent = async (agent: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('agents')
        .insert([{
          name: agent.name,
          description: agent.description,
          sector: selectedSector,
          status: 'active'
        }]);

      if (error) throw error;
      
      setNotification({ type: 'success', message: `Agente "${agent.name}" ativado com sucesso!` });
      fetchMyAgents();
    } catch (err) {
      console.error('Erro ao ativar agente:', err);
      setNotification({ type: 'error', message: 'Erro ao ativar agente. Verifique sua conexão com Supabase.' });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleCreateCustomAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('agents')
        .insert([{
          name: newAgent.name,
          description: newAgent.description,
          sector: newAgent.sector,
          status: 'active'
        }]);

      if (error) throw error;
      
      setNotification({ type: 'success', message: `Agente "${newAgent.name}" criado com sucesso!` });
      setIsModalOpen(false);
      setNewAgent({ name: '', description: '', sector: sectors[0].id });
      fetchMyAgents();
    } catch (err) {
      console.error('Erro ao criar agente:', err);
      setNotification({ type: 'error', message: 'Erro ao criar agente. Verifique sua conexão com Supabase.' });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
                <p className="text-sm text-slate-500">Visão geral do seu negócio</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50">
                  Últimos 30 dias
                  <ChevronDown size={14} />
                </div>
                <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {/* Status Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatusCard 
                icon={Phone} 
                title="WhatsApp" 
                status="Conectado" 
                subtext="Sistema ativo" 
                color="bg-emerald-100" 
              />
              <StatusCard 
                icon={Send} 
                title="Disparo" 
                status="Inativo" 
                subtext="Nenhum ativo" 
                color="bg-slate-100" 
                active={false}
              />
              <StatusCard 
                icon={Zap} 
                title="Créditos" 
                status="30.000" 
                subtext="Disponíveis" 
                color="bg-amber-100" 
              />
              <StatusCard 
                icon={Radio} 
                title="Disparo Direto" 
                status="Inativo" 
                subtext="0 enviados" 
                color="bg-slate-100" 
                active={false}
              />
            </div>

            {/* Sales Performance Section */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <TrendingUp size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800">Desempenho de Vendas</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                  <MetricCard label="Receita Ganha" value="R$ 127K" subtext="23% conversão" color="bg-emerald-50 border-emerald-100" />
                  <MetricCard label="Receita Perdida" value="R$ 0" subtext="0% perda" color="bg-rose-50 border-rose-100" />
                  <MetricCard label="Em Aberto" value="R$ 331" subtext="Pipeline ativo" color="bg-blue-50 border-blue-100" />
                  <MetricCard label="Ticket Médio" value="R$ 1.4K" subtext="Vendas ganhas" color="bg-purple-50 border-purple-100" />
                  <MetricCard label="Conversão" value="34.2%" subtext="Taxa de ganho" color="bg-amber-50 border-amber-100" />
                  <MetricCard label="Novas" value="135" subtext="Negociações criadas" color="bg-slate-50 border-slate-100" />
                  <MetricCard label="Movimentadas" value="138" subtext="No período" color="bg-slate-50 border-slate-100" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-6 border-t border-slate-100">
                  <SmallStat label="Negociações" value="135" />
                  <SmallStat label="Contatos" value="127" />
                  <SmallStat label="Ações" value="10" />
                  <SmallStat label="Média/Dia" value="4.3" />
                  <SmallStat label="Créditos IA" value="29.5K" />
                </div>
              </div>
            </section>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Sellers */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <User size={16} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-800">Top Vendedores</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-50">
                        <th className="pb-3 font-medium">#</th>
                        <th className="pb-3 font-medium">Vendedor</th>
                        <th className="pb-3 font-medium text-center">Neg.</th>
                        <th className="pb-3 font-medium text-center">Ganhas</th>
                        <th className="pb-3 font-medium text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {topSellers.map((seller) => (
                        <tr key={seller.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="py-4 text-slate-400">{seller.id}</td>
                          <td className="py-4 font-bold text-slate-700">{seller.name}</td>
                          <td className="py-4 text-center text-slate-600">{seller.neg}</td>
                          <td className="py-4 text-center text-emerald-500 font-bold">{seller.ganhas}</td>
                          <td className="py-4 text-right font-bold text-slate-800">{seller.valor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Conversions by Rule */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-800">Conversões por Regra</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">1 conversões | 0.8% taxa</span>
                </div>
                
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-emerald-700">Vendido!</span>
                      <span className="text-xs font-bold text-emerald-700">1 (100%)</span>
                    </div>
                    <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                      <div className="w-full h-full bg-emerald-500 rounded-full" />
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[10px] text-slate-400">03/01, 00:32</span>
                      <span className="text-[10px] text-slate-500 font-medium">Lucas Almeida</span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic mt-1">Palavras: "eu comprei" - Movido para Qualificação</p>
                  </div>
                </div>
              </div>

              {/* Negotiation Evolution */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp size={16} className="text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-800">Evolução de Negociações</h3>
                </div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolutionData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        dy={10}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        labelStyle={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* By Stage */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 size={16} className="text-purple-500" />
                  <h3 className="text-sm font-bold text-slate-800">Por Estágio</h3>
                </div>
                <div className="space-y-4">
                  {stages.map((stage) => (
                    <div key={stage.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-600">{stage.name}</span>
                        <span className="font-bold text-slate-800">{stage.value} ({stage.percentage}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${stage.percentage}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={cn("h-full rounded-full", stage.color)} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 'Conversas':
        return (
          <div className="flex flex-col h-full items-center justify-center text-center p-12">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={32} className="text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Conversas</h2>
            <p className="text-slate-500 max-w-md mt-2">
              Gerencie todas as interações com seus clientes em um só lugar. Integre com WhatsApp, Instagram e muito mais.
            </p>
            <button className="mt-6 px-6 py-2 bg-[#151921] text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors">
              Conectar WhatsApp
            </button>
          </div>
        );
      case 'Agente de IA':
      case 'Agente IA':
        const currentSector = sectors.find(s => s.id === selectedSector) || sectors[0];
        return (
          <div className="space-y-8 relative">
            {/* Notification */}
            <AnimatePresence>
              {notification && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    "fixed top-20 right-8 z-50 flex items-center gap-3 px-6 py-3 rounded-xl shadow-lg border",
                    notification.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
                  )}
                >
                  {notification.type === 'success' ? <CheckCircle2 size={20} /> : <Info size={20} />}
                  <span className="text-sm font-bold">{notification.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Agentes de IA</h2>
                <p className="text-sm text-slate-500">Escolha um agente especializado para o seu setor</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-[#151921] rounded-lg font-bold text-sm hover:bg-amber-500 transition-colors shadow-sm"
              >
                <Plus size={18} />
                Novo Agente Customizado
              </button>
            </div>

            {/* My Agents Section */}
            {myAgents.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Meus Agentes Ativos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {myAgents.map((agent) => (
                    <div key={agent.id} className="bg-white p-5 rounded-2xl border-2 border-amber-100 shadow-sm flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                          <Bot size={20} className="text-amber-500" />
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full uppercase">Ativo</span>
                      </div>
                      <h4 className="font-bold text-slate-800 mb-1">{agent.name}</h4>
                      <p className="text-[11px] text-slate-400 mb-4 line-clamp-2">{agent.description}</p>
                      <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-50">
                        <span className="text-[10px] font-medium text-slate-400">{agent.sector}</span>
                        <button className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors">Configurar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sectors Navigation */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Modelos por Setor</h3>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {sectors.map((sector) => {
                  const Icon = sector.icon;
                  return (
                    <button
                      key={sector.id}
                      onClick={() => setSelectedSector(sector.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border",
                        selectedSector === sector.id
                          ? "bg-[#151921] text-white border-[#151921] shadow-md"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <Icon size={16} />
                      {sector.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentSector.agents.map((agent) => (
                <motion.div
                  layout
                  key={agent.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all cursor-pointer flex flex-col"
                >
                  <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-50 transition-colors">
                    <Bot size={24} className="text-slate-400 group-hover:text-amber-500" />
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2 group-hover:text-amber-600 transition-colors">{agent.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-6 flex-1">
                    {agent.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Info size={12} />
                      Pronto para uso
                    </div>
                    <button 
                      disabled={loading}
                      onClick={() => handleActivateAgent(agent)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 disabled:opacity-50"
                    >
                      {loading ? 'Ativando...' : 'Ativar'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Create Agent Modal */}
            <AnimatePresence>
              {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-800">Criar Novo Agente</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                      </button>
                    </div>
                    <form onSubmit={handleCreateCustomAgent} className="p-6 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nome do Agente</label>
                        <input 
                          required
                          type="text" 
                          value={newAgent.name}
                          onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                          placeholder="Ex: Consultor Jurídico"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Setor</label>
                        <select 
                          value={newAgent.sector}
                          onChange={(e) => setNewAgent({ ...newAgent, sector: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all text-sm appearance-none bg-white"
                        >
                          {sectors.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Descrição / Objetivo</label>
                        <textarea 
                          required
                          rows={3}
                          value={newAgent.description}
                          onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                          placeholder="Descreva o que este agente deve fazer..."
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all text-sm resize-none"
                        />
                      </div>
                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-[#151921] text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                      >
                        {loading ? 'Criando...' : 'Criar Agente'}
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Supabase Info */}
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <LinkIcon size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-900">Integração com Supabase</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Seus agentes e configurações serão persistidos no Supabase. Certifique-se de configurar as chaves de API no menu de configurações.
                </p>
              </div>
            </div>
          </div>
        );
      case 'CRM':
        return (
          <div className="flex flex-col h-full items-center justify-center text-center p-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <BarChart3 size={32} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">CRM & Pipeline</h2>
            <p className="text-slate-500 max-w-md mt-2">
              Visualize seu funil de vendas e mova negociações entre estágios. Acompanhe o progresso de cada lead.
            </p>
            <button className="mt-6 px-6 py-2 bg-[#151921] text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors">
              Ver Pipeline
            </button>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-400">
            Em desenvolvimento: {activeTab}
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#151921] flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
            <Zap size={20} className="text-[#151921] fill-current" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tighter uppercase">Fluow Ai</h1>
        </div>

        <nav className="flex-1 mt-4 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
          <SidebarItem icon={MessageSquare} label="Conversas" active={activeTab === 'Conversas'} onClick={() => setActiveTab('Conversas')} />
          <SidebarItem icon={Bot} label="Agente de IA" active={activeTab === 'Agente de IA'} onClick={() => setActiveTab('Agente de IA')} />
          <SidebarItem icon={BarChart3} label="CRM" active={activeTab === 'CRM'} onClick={() => setActiveTab('CRM')} />
          <SidebarItem icon={Calendar} label="Agendamentos" active={activeTab === 'Agendamentos'} onClick={() => setActiveTab('Agendamentos')} />
          <SidebarItem icon={Search} label="Prospectar" active={activeTab === 'Prospectar'} onClick={() => setActiveTab('Prospectar')} />
          <SidebarItem icon={Users} label="Contatos" active={activeTab === 'Contatos'} onClick={() => setActiveTab('Contatos')} />
          <SidebarItem icon={LinkIcon} label="Conexão" active={activeTab === 'Conexão'} onClick={() => setActiveTab('Conexão')} />
          <SidebarItem icon={Settings} label="Configurações" active={activeTab === 'Configurações'} onClick={() => setActiveTab('Configurações')} />
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
            <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-white font-bold text-xs">
              U
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Usuário</p>
              <p className="text-[10px] text-slate-500 truncate">Administrador</p>
            </div>
          </div>
          <button className="flex items-center gap-2 w-full px-2 py-3 text-slate-400 hover:text-white text-xs font-medium transition-colors">
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-slate-50 border-b border-slate-200 flex items-center justify-center px-8 shrink-0">
          <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl">
            <TopNavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} />
            <TopNavItem icon={MessageSquare} label="Conversas" active={activeTab === 'Conversas'} onClick={() => setActiveTab('Conversas')} />
            <TopNavItem icon={Bot} label="Agente IA" active={activeTab === 'Agente de IA' || activeTab === 'Agente IA'} onClick={() => setActiveTab('Agente de IA')} />
            <TopNavItem icon={BarChart3} label="CRM" active={activeTab === 'CRM'} onClick={() => setActiveTab('CRM')} />
            <TopNavItem icon={Calendar} label="Agenda" active={activeTab === 'Agendamentos'} onClick={() => setActiveTab('Agendamentos')} />
            <TopNavItem icon={Search} label="Prospectar" active={activeTab === 'Prospectar'} onClick={() => setActiveTab('Prospectar')} />
            <TopNavItem icon={Users} label="Contatos" active={activeTab === 'Contatos'} onClick={() => setActiveTab('Contatos')} />
            <TopNavItem icon={LinkIcon} label="Conexão" active={activeTab === 'Conexão'} onClick={() => setActiveTab('Conexão')} />
            <TopNavItem icon={Settings} label="Config" active={activeTab === 'Configurações'} onClick={() => setActiveTab('Configurações')} />
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8 max-w-[1600px] mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <GlobalAIChat />
    </div>
  );
}
