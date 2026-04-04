import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Bot, 
  BarChart3, 
  Calendar, 
  Search, 
  Users, 
  Settings, 
  Link as LinkIcon,
  Zap,
  Clock,
  Phone,
  Send,
  Radio,
  ChevronDown,
  RefreshCw,
  Plus,
  User,
  TrendingUp,
  Info,
  CheckCircle2,
  X,
  LogOut,
  ChevronRight,
  Shield,
  Clock3,
  CreditCard,
  Smartphone,
  Trello,
  Camera,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { WhatsAppPanel } from './components/WhatsAppPanel';
import { InstanceConnectionState } from './types/chat';
import { ConversationsPanel } from './components/ConversationsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalAIChat } from './components/GlobalAIChat';
import { QRCodeModal } from './components/QRCodeModal';
import { CRMPage } from './components/crm/CRMPage';
import { CalendarPage } from './components/calendar/CalendarPage';
import { ContactsPage } from './components/contacts/ContactsPage';
import { whatsappService } from './services/whatsapp';
import * as whatsappDb from './services/whatsappDb';
import { supabase } from './lib/supabase';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Data placeholders for dashboard
const evolutionData = [
  { name: '01/01', value: 400 },
  { name: '02/01', value: 300 },
  { name: '03/01', value: 550 },
  { name: '04/01', value: 450 },
  { name: '05/01', value: 700 },
  { name: '06/01', value: 600 },
  { name: '07/01', value: 850 },
];

const topSellers = [
  { id: 1, name: 'Lucas Almeida', neg: 42, ganhas: 15, valor: 'R$ 28.4K' },
  { id: 2, name: 'Mariana Costa', neg: 38, ganhas: 12, valor: 'R$ 21.2K' },
  { id: 3, name: 'Pedro Santos', neg: 31, ganhas: 9, valor: 'R$ 15.8K' },
  { id: 4, name: 'Ana Beatriz', neg: 24, ganhas: 6, valor: 'R$ 10.2K' },
];

const stages = [
  { name: 'Qualificação', value: 45, percentage: 33, color: 'bg-blue-500' },
  { name: 'Apresentação', value: 32, percentage: 24, color: 'bg-purple-500' },
  { name: 'Negociação', value: 28, percentage: 21, color: 'bg-amber-500' },
  { name: 'Fechamento', value: 30, percentage: 22, color: 'bg-emerald-500' },
];

// Tipagem para Setores e Agentes
interface Agent {
  id: string;
  name: string;
  description: string;
  personality?: string;
  knowledge?: string;
  sector: string;
}

interface Sector {
  id: string;
  name: string;
  icon: any;
  agents: Agent[];
}

const sectors: Sector[] = [
  { id: 'Vendas', name: 'Vendas & CRM', icon: TrendingUp, agents: [] },
  { id: 'Atendimento', name: 'Atendimento', icon: MessageSquare, agents: [] },
  { id: 'Suporte', name: 'Suporte Técnico', icon: Shield, agents: [] },
  { id: 'Agendamento', name: 'Agendamentos', icon: Calendar, agents: [] },
];

import { AgentsPanel } from './components/agents/AgentsPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { KanbanPage } from './components/KanbanPage';
import { MegaAdminDashboard } from './components/panels/MegaAdminDashboard';
import { SuperAdminDashboard } from './components/panels/SuperAdminDashboard';
import { InstagramDashboard } from './pages/instagram/InstagramDashboard';
import { NocAlertsPanel } from './components/panels/NocAlertsPanel';

// Removida a MASTER_API_KEY global do frontend por razões de segurança.


export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [userRole, setUserRole] = useState<'mega_super_admin' | 'super_admin' | 'admin' | 'equipe'>('mega_super_admin');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [whatsappInstances, setWhatsappInstances] = useState<InstanceConnectionState[]>([]);
  const instancesRef = useRef<InstanceConnectionState[]>([]);
  const [selectedWhatsAppInstance, setSelectedWhatsAppInstance] = useState<string | null>(null);
  const [selectedInstanceName, setSelectedInstanceName] = useState<string | null>(null);
  const [currentQRCode, setCurrentQRCode] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [myAgents, setMyAgents] = useState<any[]>([]);
  const [selectedSector, setSelectedSector] = useState('Vendas');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [newAgent, setNewAgent] = useState({
    name: '',
    sector: 'Vendas',
    description: '',
    personality: '',
    knowledge: ''
  });

  // Mantém o Ref sincronizado com o State para que os listeners de socket sempre vejam os dados atuais
  useEffect(() => {
    instancesRef.current = whatsappInstances;
  }, [whatsappInstances]);

  // Refs para manter dados sincronizados SEM re-render
  const selectedInstanceNameRef = useRef(selectedInstanceName);
  const selectedWhatsAppInstanceRef = useRef(selectedWhatsAppInstance);

  // Sync refs quando estados mudam
  useEffect(() => {
    selectedInstanceNameRef.current = selectedInstanceName;
    selectedWhatsAppInstanceRef.current = selectedWhatsAppInstance;
  }, [selectedInstanceName, selectedWhatsAppInstance]);

  // EFFECT 1: Setup inicial (roda 1x apenas)
  useEffect(() => {
    whatsappService.connect();
    loadInstances();
    fetchMyAgents();
  }, []); // Sem dependências - roda 1x no mount

  // EFFECT 2: Listeners para instância (roda 1x, usa refs)
  useEffect(() => {
    const handleStatusUpdate = (statusData: InstanceConnectionState) => {
      console.log(`[App] Snapshot Update: ${statusData.instanceName} -> ${statusData.status}`);
      
      setWhatsappInstances(prev => {
        const index = prev.findIndex(inst => inst.instanceName === statusData.instanceName);
        if (index === -1) return [...prev, statusData];
        const updated = [...prev];
        updated[index] = { ...updated[index], ...statusData };
        return updated;
      });

      // Usar REFS em vez de closure
      if (statusData.instanceName === selectedInstanceNameRef.current || 
          statusData.instanceId === selectedWhatsAppInstanceRef.current) {
        if (statusData.status === 'qr_ready' && statusData.qr) {
          setCurrentQRCode(statusData.qr);
          setShowQRModal(true);
        } else if (statusData.status === 'connected') {
          setShowQRModal(false);
          setCurrentQRCode(null);
          setNotification({ type: 'success', message: `WhatsApp [${statusData.instanceName}] conectado!` });
        }
      }
    };

    const handleQrEvent = ({ instanceId, qr }: { instanceId: string, qr: string }) => {
      if (instanceId === selectedInstanceNameRef.current || 
          instanceId === selectedWhatsAppInstanceRef.current) {
        setCurrentQRCode(qr);
        setShowQRModal(true);
      }
    };

    // Callback de erro para feedback ao usuário (Dashboard/Notificação)
    const handleInstanceError = (error: any) => {
      console.error(`[App] Erro na instância ${error.instanceId}:`, error.message);
      setNotification({ type: 'error', message: error.message || 'Erro na conexão do WhatsApp.' });
      setLoading(false);
      
      // Se era a instância que estávamos tentando conectar, fecha o modal de QR
      if (error.instanceId === selectedInstanceNameRef.current || error.instanceId === selectedWhatsAppInstanceRef.current) {
        setShowQRModal(false);
      }
    };

    whatsappService.on('instance:status', handleStatusUpdate);
    whatsappService.on('instance:qr', handleQrEvent);
    whatsappService.on('instance:error', handleInstanceError);

    return () => {
      whatsappService.off('instance:status', handleStatusUpdate);
      whatsappService.off('instance:qr', handleQrEvent);
      whatsappService.off('instance:error', handleInstanceError);
      
      // Cleanup de listeners de socket específicos de cada instância
      instancesRef.current.forEach(inst => {
        whatsappService.removeAllInstanceListeners(inst.instanceName);
      });
    };
  }, []); // Sem dependências - listeners setados 1x

  useEffect(() => {
    if (showQRModal && selectedWhatsAppInstance) {
      const currentInst = whatsappInstances.find(i => i.instanceId === selectedWhatsAppInstance);
      if (currentInst && currentInst.status === 'connected') {
        setShowQRModal(false);
        setCurrentQRCode(null);
      }
    }
  }, [whatsappInstances, selectedWhatsAppInstance, showQRModal]);

  const loadInstances = useCallback(async () => {
    const instances = await whatsappDb.getWhatsAppInstances();
    setWhatsappInstances(instances);
    for (const inst of instances) {
      whatsappService.subscribeToInstance(inst.instanceName);
    }
  }, []);

  const fetchMyAgents = useCallback(async () => {
    try {
      const agents = await whatsappDb.getAgents();
      setMyAgents(agents);
    } catch (err) {
      console.error('Erro ao buscar agentes:', err);
    }
  }, []);

  const handleConnectInstance = useCallback(async (id: string) => {
    const instance = instancesRef.current.find(i => i.instanceId === id);
    if (instance) {
      console.log(`[UI] Conectando instância: ID=${id}, name=${instance.instanceName}`);
      setSelectedWhatsAppInstance(id);
      setSelectedInstanceName(instance.instanceName);
      setCurrentQRCode(null);
      setShowQRModal(true);
      try {
        await whatsappService.connectWhatsApp(instance.instanceName);
      } catch (err) {
        setNotification({ type: 'error', message: 'Erro ao iniciar conexão.' });
      }
    }
  }, []);

  const handleDisconnectInstance = useCallback(async (id: string) => {
    const instance = instancesRef.current.find(i => i.instanceId === id);
    if (instance) {
      await whatsappService.disconnectWhatsApp(instance.instanceName);
      await loadInstances();
    }
  }, [loadInstances]);

  const handleFileUpload = useCallback(async (agentId: string, file: File) => {
    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${agentId}/${Math.random()}.${fileExt}`;
      const filePath = `knowledge/${fileName}`;
      await supabase.storage.from('fluowai').upload(filePath, file);

      const { data: { publicUrl } } = supabase.storage.from('fluowai').getPublicUrl(filePath);
      
      // Busca o token de sessão atualizado
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/agents/process-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ agentId, fileUrl: publicUrl })
      });

      const result = await response.json();
      if (result.success) {
        setNotification({ type: 'success', message: 'Conhecimento extraído!' });
        await fetchMyAgents();
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: `Erro: ${err.message}` });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  }, [fetchMyAgents]);

  const handleSyncInstance = useCallback(async (id: string) => {
    const instance = instancesRef.current.find(i => i.instanceId === id);
    if (!instance) return;
    try {
      const res = await whatsappService.syncInstance(instance.instanceName);
      setNotification({ 
        type: res.success ? 'success' : 'error', 
        message: res.success ? 'Sincronização concluída!' : (res.error || 'Erro na sincronização.')
      });
    } catch (err) {
      setNotification({ type: 'error', message: 'Falha na conexão com o servidor.' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        if (userRole === 'mega_super_admin') return <MegaAdminDashboard />;
        if (userRole === 'super_admin') return <SuperAdminDashboard />;
        return (
          <div className="space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard</h2>
                <p className="text-slate-500 font-medium">Bem-vindo de volta! Aqui está um resumo operacional.</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 shadow-lg shadow-emerald-100">
                  <Plus size={18} /> Nova Campanha
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatusCard icon={Phone} title="WhatsApp" status="Conectado" subtext="Inativo" color="bg-emerald-100" />
              <StatusCard icon={Send} title="Disparo" status="Inativo" subtext="Nenhum ativo" color="bg-slate-100" active={false} />
              <StatusCard icon={Zap} title="Créditos" status="30.000" subtext="Disponíveis" color="bg-amber-100" />
              <StatusCard icon={Radio} title="Disparo Direto" status="Inativo" subtext="0 enviados" color="bg-slate-100" active={false} />
            </div>

            <section className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                <MetricCard label="Receita Ganha" value="R$ 127K" subtext="23% conv." color="bg-emerald-50 border-emerald-100" />
                <MetricCard label="Receita Perdida" value="R$ 0" subtext="0% perda" color="bg-rose-50 border-rose-100" />
                <MetricCard label="Em Aberto" value="R$ 331" color="bg-blue-50 border-blue-100" />
                <MetricCard label="Ticket Médio" value="R$ 1.4K" color="bg-purple-50 border-purple-100" />
                <MetricCard label="Conversão" value="34.2%" color="bg-amber-50 border-amber-100" />
                <MetricCard label="Novas" value="135" color="bg-slate-50 border-slate-100" />
                <MetricCard label="Ações" value="138" color="bg-slate-50 border-slate-100" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-8 py-6 border-t border-slate-100">
                <SmallStat label="Negociações" value="135" />
                <SmallStat label="Contatos" value="127" />
                <SmallStat label="Ações" value="10" />
                <SmallStat label="Média/Dia" value="4.3" />
                <SmallStat label="Créditos IA" value="29.5K" />
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <User size={16} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-800">Top Vendedores</h3>
                </div>
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-slate-50">
                    {topSellers.map((seller) => (
                      <tr key={seller.id} className="group hover:bg-slate-50">
                        <td className="py-4 text-slate-400">{seller.id}</td>
                        <td className="py-4 font-bold text-slate-700">{seller.name}</td>
                        <td className="py-4 text-center text-emerald-500 font-bold">{seller.ganhas}</td>
                        <td className="py-4 text-right font-bold text-slate-800">{seller.valor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-6 text-blue-500"><TrendingUp size={16} /><h3 className="text-sm font-bold text-slate-800">Evolução</h3></div>
                <div className="h-[250px] w-full min-w-0">
                  <ErrorBoundary fallbackMessage="Gráfico temporariamente indisponível.">
                    {/* Conditionally mounting graphic only prevents Recharts computing sizing on display:none elements */}
                    {activeTab === 'Dashboard' && (
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={evolutionData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" hide /><YAxis hide />
                          <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          </div>
        );

      case 'CRM':
        return <CRMPage />;
      case 'Kanban IA':
        return <KanbanPage />;
      case 'Agendamentos':
        return <CalendarPage />;
      case 'Contatos':
        return <ContactsPage />;
      case 'Agente IA':
      case 'Agente de IA':
        return <AgentsPanel />;
      case 'Conexão':
        return <WhatsAppPanel 
          instances={whatsappInstances} 
          availableAgents={myAgents} 
          onConnect={handleConnectInstance} 
          onDisconnect={handleDisconnectInstance} 
          onSync={handleSyncInstance}
          onDelete={async (id) => { await whatsappDb.deleteWhatsAppInstance(id); loadInstances(); }} 
          onUpdateInstance={async (id, updates) => { await whatsappDb.updateWhatsAppInstance(id, updates); loadInstances(); }} 
          onCreate={async (name) => { 
            const res = await whatsappDb.createWhatsAppInstance(name); 
            if (res) {
              await loadInstances();
              whatsappService.subscribeToInstance(name);
              // Inicia a conexão imediatamente após criar
              whatsappService.connectWhatsApp(name);
              // Seleciona a instância para o socket saber qual QR mostrar
              setSelectedWhatsAppInstance(res.instanceId || null);
              // O QRModal será aberto automaticamente pelos ouvintes de socket em App.tsx
            } 
          }} 
          onSelectInstance={setSelectedWhatsAppInstance} 
          selectedInstance={selectedWhatsAppInstance}
        />;
      case 'Configurações':
        return <ConfigPanel userRole={userRole} />;
      case 'Instagram':
        return <InstagramDashboard />;
      case 'NOC / Alertas':
        return <NocAlertsPanel />;
      default: return <div className="p-8 text-slate-400">Página em desenvolvimento...</div>;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-[#0F172A] overflow-hidden">
      {/* Sidebar Principal */}
      <aside className={cn(
        "bg-[#151921] flex flex-col shrink-0 transition-all duration-300 ease-in-out relative z-30",
        isSidebarCollapsed ? "w-[72px]" : "w-[240px]"
      )}>
        <div className={cn("p-6 flex items-center gap-3 overflow-hidden whitespace-nowrap")}>
          <Zap size={24} className="text-amber-400 fill-current shrink-0" />
          {!isSidebarCollapsed && (
            <motion.h1 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-xl font-black text-white tracking-tighter uppercase"
            >
              Fluow Ai
            </motion.h1>
          )}
        </div>
        
        <nav className="flex-1 mt-4 space-y-1.5 px-3 overflow-y-auto scrollbar-hide">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'Dashboard'} onClick={() => setActiveTab('Dashboard')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={MessageSquare} label="Conversas" active={activeTab === 'Conversas'} onClick={() => setActiveTab('Conversas')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Bot} label="Agentes" active={activeTab === 'Agente IA' || activeTab === 'Agente de IA'} onClick={() => setActiveTab('Agente IA')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={BarChart3} label="CRM" active={activeTab === 'CRM'} onClick={() => setActiveTab('CRM')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Trello} label="Kanban IA" active={activeTab === 'Kanban IA'} onClick={() => setActiveTab('Kanban IA')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Calendar} label="Agenda" active={activeTab === 'Agendamentos'} onClick={() => setActiveTab('Agendamentos')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Search} label="Prospectar" active={activeTab === 'Prospectar'} onClick={() => setActiveTab('Prospectar')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Users} label="Contatos" active={activeTab === 'Contatos'} onClick={() => setActiveTab('Contatos')} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={Camera} label="Instagram" active={activeTab === 'Instagram'} onClick={() => setActiveTab('Instagram')} collapsed={isSidebarCollapsed} />
          {userRole !== 'equipe' && <SidebarItem icon={LinkIcon} label="Conexão" active={activeTab === 'Conexão'} onClick={() => setActiveTab('Conexão')} collapsed={isSidebarCollapsed} />}
          {userRole !== 'equipe' && <SidebarItem icon={AlertTriangle} label="NOC / Alertas" active={activeTab === 'NOC / Alertas'} onClick={() => setActiveTab('NOC / Alertas')} collapsed={isSidebarCollapsed} />}
          {userRole !== 'equipe' && <SidebarItem icon={Settings} label="Configurações" active={activeTab === 'Configurações'} onClick={() => setActiveTab('Configurações')} collapsed={isSidebarCollapsed} />}
        </nav>

        {/* Botão de Toggle */}
        <div className="p-3 border-t border-slate-800">
           <button 
             onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
             className="w-full flex items-center justify-center py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
           >
             {isSidebarCollapsed ? <ChevronRight size={20} /> : (
               <div className="flex items-center gap-3 w-full px-1">
                 <X size={20} className="shrink-0 rotate-45" />
                 <span className="text-sm font-bold">Recolher</span>
               </div>
             )}
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{activeTab}</span>
          <div className="flex items-center gap-3">
             <span className="text-xs font-bold text-slate-400">Ver como:</span>
             <select 
               value={userRole} 
               onChange={(e) => {
                 const newRole = e.target.value as any;
                 setUserRole(newRole);
                 if (newRole === 'equipe' && (activeTab === 'Configurações' || activeTab === 'Conexão')) {
                   setActiveTab('Dashboard');
                 }
               }}
               className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 outline-none hover:border-blue-500 transition-colors"
             >
               <option value="mega_super_admin">Mega Super Admin</option>
               <option value="super_admin">Super Admin (Whitelabel)</option>
               <option value="admin">Admin (Cliente)</option>
               <option value="equipe">Equipe (Atendente)</option>
             </select>
          </div>
        </header>
        <div className={cn("flex-1 overflow-y-auto w-full mx-auto relative", activeTab === 'Conversas' ? "p-0 max-w-full" : "p-8 max-w-[1400px]")}>
          <ErrorBoundary>
            {/* ConversationsPanel com AnimatePresence */}
            <AnimatePresence mode="wait">
              {activeTab === 'Conversas' && (
                <motion.div
                  key="conversations"
                  className="h-full"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <ConversationsPanel instances={whatsappInstances} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Demais abas com animação normal */}
            {activeTab !== 'Conversas' && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  className="h-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            )}
          </ErrorBoundary>
        </div>
      </main>
      <GlobalAIChat />
      <QRCodeModal qrCode={currentQRCode} instanceId={selectedWhatsAppInstance || undefined} isOpen={showQRModal} onClose={() => setShowQRModal(false)} />
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick, collapsed }: any) {
  return (
    <button 
      onClick={onClick} 
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center w-full rounded-xl text-sm font-bold transition-all relative group",
        collapsed ? "justify-center px-0 py-3.5" : "px-4 py-3 gap-3",
        active ? "bg-amber-400 text-[#151921] shadow-lg shadow-amber-400/20" : "text-slate-400 hover:text-white hover:bg-slate-800"
      )}
    >
      <Icon size={20} className="shrink-0" /> 
      {!collapsed && <span>{label}</span>}
      
      {/* Tooltip customizado via CSS no index.css */}
      {collapsed && (
        <div className="absolute left-[80px] bg-[#0F172A] text-white text-[12px] font-semibold py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl border border-slate-700">
          {label}
          <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-[#0F172A] rotate-45 border-l border-b border-slate-700"></div>
        </div>
      )}
    </button>
  );
}

function StatusCard({ icon: Icon, title, status, subtext, color, active = true }: any) {
  return <div className={cn("p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 bg-white", !active && "opacity-60")}><div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color)}><Icon size={24} className={cn(color.replace('bg-', 'text-').replace('-100', '-600'))} /></div><div><h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</h4><p className="text-lg font-black text-slate-800 leading-none my-1">{status}</p><p className="text-[10px] text-slate-500 font-medium">{subtext}</p></div></div>;
}

function MetricCard({ label, value, subtext, color }: any) {
  return <div className={cn("p-4 rounded-xl border flex flex-col gap-1", color)}><span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span><span className="text-lg font-black text-slate-800">{value}</span>{subtext && <span className="text-[9px] text-slate-400 font-medium">{subtext}</span>}</div>;
}

function SmallStat({ label, value }: any) {
  return <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</p><p className="text-lg font-black text-slate-800">{value}</p></div>;
}
