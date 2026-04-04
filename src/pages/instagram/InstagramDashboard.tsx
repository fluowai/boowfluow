import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Camera, 
  Clock, 
  Globe, 
  Layers, 
  MessageSquare, 
  Plus, 
  Settings, 
  Sparkles, 
  TrendingUp, 
  Users,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MoreVertical,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useInstagramAccounts } from '../../hooks/instagram/useAccounts';
import { instagramApi } from '../../services/instagram/api';
import { InstagramAccount } from '../../types/instagram';
import { InstagramAccountsPanel } from '../../components/instagram/AccountsPanel';
import { SchedulerPanel } from '../../components/instagram/automation/SchedulerPanel';
import { AutoReplyPanel } from '../../components/instagram/automation/AutoReplyPanel';

type DashboardTab = 'overview' | 'scheduler' | 'automation' | 'analytics' | 'accounts';

export function InstagramDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const { accounts, loading, addAccount, deleteAccount, login, logout, verifyChallenge } = useInstagramAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  
  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || accounts.find(a => a.status === 'active');

  useEffect(() => {
    if (selectedAccount && !selectedAccountId) {
      setSelectedAccountId(selectedAccount.id);
    }
  }, [selectedAccount, selectedAccountId]);

  const stats = [
    { label: 'Seguidores', value: '12.4K', change: '+12%', icon: Users, color: 'text-pink-500' },
    { label: 'Engajamento', value: '4.8%', change: '+0.5%', icon: TrendingUp, color: 'text-indigo-500' },
    { label: 'Postagens', value: '156', change: '+8', icon: Camera, color: 'text-orange-500' },
    { label: 'Automações', value: '5 Ativas', change: 'Ok', icon: Zap, color: 'text-yellow-500' },
  ];

  const handleConnect = async (data: any) => {
    await addAccount(data);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FDFCFD] text-slate-900 overflow-x-hidden pt-16">
      {/* Mesh Gradient Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-pink-100/40 to-transparent blur-3xl" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full bg-gradient-to-tl from-indigo-100/30 to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-10">
        {/* Header - Premium Navigation */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">
              Instagram <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">Hub</span>
            </h1>
            <p className="text-slate-500 font-medium">Gestão profissional multi-contas e automação inteligente.</p>
          </div>

          <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-white shadow-sm self-start md:self-center">
            {['overview', 'scheduler', 'automation', 'analytics', 'accounts'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as DashboardTab)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300",
                  activeTab === tab 
                    ? "bg-slate-900 text-white shadow-indigo-200 shadow-lg scale-105" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-white"
                )}
              >
                {tab === 'overview' && 'Resumo'}
                {tab === 'scheduler' && 'Agendamento'}
                {tab === 'automation' && 'Automação'}
                {tab === 'analytics' && 'Métricas'}
                {tab === 'accounts' && 'Contas'}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Account Bar */}
        <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-4 scrollbar-hide">
          {accounts.map(account => (
            <button
              key={account.id}
              onClick={() => setSelectedAccountId(account.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 min-w-[200px] bg-white",
                selectedAccountId === account.id 
                  ? "border-pink-500 ring-2 ring-pink-500/10 shadow-md" 
                  : "border-slate-100 opacity-60 hover:opacity-100"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-orange-400 flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-sm overflow-hidden">
                {account.username[0].toUpperCase()}
              </div>
              <div className="text-left">
                <p className="font-bold text-sm leading-tight">@{account.username}</p>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", account.status === 'active' ? "bg-emerald-500" : "bg-slate-300")} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{account.status}</span>
                </div>
              </div>
            </button>
          ))}
          <button 
            onClick={() => setActiveTab('accounts')}
            className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-slate-300 hover:border-pink-400 hover:bg-pink-50/50 transition-all text-slate-400 hover:text-pink-600 min-w-[200px]"
          >
            <div className="w-10 h-10 rounded-full border border-dashed border-slate-300 flex items-center justify-center">
              <Plus size={20} />
            </div>
            <span className="font-bold text-sm">Adicionar Conta</span>
          </button>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className={cn("p-3 rounded-2xl bg-white shadow-sm border border-slate-50", stat.color)}>
                          <stat.icon size={22} />
                        </div>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                          {stat.change}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                      <h3 className="text-3xl font-black text-slate-900">{stat.value}</h3>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Recent Activity */}
                  <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-black flex items-center gap-3">
                        <Layers size={20} className="text-pink-500" />
                        Atividades Recentes
                      </h3>
                      <button className="text-sm font-bold text-indigo-600 flex items-center gap-1 hover:underline">
                        Ver Tudo <ChevronRight size={16} />
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-4 group cursor-pointer p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
                            <img src={`https://picsum.photos/seed/${i+40}/100/100`} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">Nova Postagem agendada para Amanhã</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar size={12} /> 24 Out, 10:00 • Feed
                            </p>
                          </div>
                          <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-tighter rounded-xl">
                            Agendado
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI Suggestions */}
                  <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-100">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full" />
                    <Sparkles size={24} className="text-yellow-400 mb-6" />
                    <h3 className="text-xl font-black mb-4 leading-tight">Sugestões da IA para @{selectedAccount?.username}</h3>
                    <p className="text-slate-400 text-sm mb-8 leading-relaxed">Analisei seu histórico e as hashtags em alta agora.</p>
                    
                    <div className="space-y-4">
                      <div className="bg-white/10 p-4 rounded-2xl border border-white/10 hover:bg-white/15 transition-colors cursor-pointer">
                        <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">Hashtag Viral</p>
                        <p className="text-sm font-bold">#DigitalLuxury</p>
                      </div>
                      <div className="bg-white/10 p-4 rounded-2xl border border-white/10 hover:bg-white/15 transition-colors cursor-pointer">
                        <p className="text-xs font-black uppercase tracking-widest text-pink-400 mb-1">Horário de Pico</p>
                        <p className="text-sm font-bold">Hoje às 19:45</p>
                      </div>
                    </div>

                    <button className="w-full mt-8 py-3 bg-gradient-to-r from-pink-600 to-indigo-600 rounded-2xl font-black text-sm shadow-lg shadow-pink-500/20 transition-transform active:scale-95">
                      Gerar Legenda com IA
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scheduler' && (
              <SchedulerPanel accountId={selectedAccountId!} />
            )}

            {activeTab === 'automation' && (
              <AutoReplyPanel accountId={selectedAccountId!} />
            )}

            {activeTab === 'accounts' && (
              <div className="mt-4">
                <InstagramAccountsPanel
                  accounts={accounts}
                  onAdd={addAccount}
                  onDelete={deleteAccount}
                  onLogin={login}
                  onLogout={logout}
                  onVerifyChallenge={verifyChallenge}
                  loading={loading}
                />
              </div>
            )}
            
            {activeTab === 'analytics' && (
              <div className="bg-white rounded-[2rem] border border-slate-100 p-12 text-center shadow-sm">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="text-indigo-600" size={40} />
                </div>
                <h3 className="text-2xl font-black mb-3">Métricas Avançadas</h3>
                <p className="text-slate-500 max-w-md mx-auto mb-8">Estamos processando os dados de engajamento do seu perfil para gerar relatórios de crescimento detalhados.</p>
                <div className="flex justify-center gap-12">
                   <div><p className="text-3xl font-black">1.2K</p><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Impressões</p></div>
                   <div><p className="text-3xl font-black">+45</p><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Seguidores</p></div>
                   <div><p className="text-3xl font-black">8.2%</p><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">CTR</p></div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
