import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Bot, 
  Library, 
  Play, 
  Settings, 
  ChevronRight, 
  Zap, 
  Scale,
  Stethoscope,
  Building2,
  GraduationCap,
  Briefcase,
  Target,
  Terminal,
  CheckCircle2,
  MessageSquare,
  Share2,
  Check,
  Brain,
  Cpu,
  Mic,
  Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { agentTemplates, AgentTemplate } from './templatesData';
import * as whatsappDb from '../../services/whatsappDb';
import { supabase } from '../../lib/supabase';
import { AgentSandbox } from './AgentSandbox';

// Removida a MASTER_API_KEY global do frontend por razões de segurança.

const niches = [
  { id: 'all', name: 'Todos', icon: Bot },
  { id: 'juridico', name: 'Jurídico', icon: Scale },
  { id: 'saude', name: 'Saúde', icon: Stethoscope },
  { id: 'imobiliario', name: 'Imobiliário', icon: Building2 },
  { id: 'educacao', name: 'Educação', icon: GraduationCap },
  { id: 'negocios', name: 'Negócios Locais', icon: Briefcase },
];

export function AgentsPanel() {
  const [activeTab, setActiveTab] = useState<'library' | 'my-agents' | 'wizard' | 'sandbox'>('library');
  const [selectedNiche, setSelectedNiche] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [myAgents, setMyAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [selectedAgentForSandbox, setSelectedAgentForSandbox] = useState<any | null>(null);
  const [bindingAgent, setBindingAgent] = useState<any | null>(null);
  const [instances, setInstances] = useState<any[]>([]);
  const [selectedInstanceGroups, setSelectedInstanceGroups] = useState<any[]>([]);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [groupConfig, setGroupConfig] = useState({
     respondToGroups: false,
     mode: 'all' as 'all' | 'whitelist' | 'blacklist',
     selectedJids: [] as string[]
  });

  useEffect(() => {
     fetchAgents();
     fetchInstances();
  }, [activeTab]);

  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const data = await whatsappDb.getAgents();
      setMyAgents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const fetchInstances = async () => {
    try {
      const data = await whatsappDb.getWhatsAppInstances();
      setInstances(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este agente?')) {
      await whatsappDb.deleteAgent(id);
      fetchAgents();
    }
  };

  const handleBind = async (instanceId: string, agentId: string) => {
    setLoadingAgents(true);
    try {
      // 1. Atualizar a Instância para vincular o agente
      await whatsappDb.updateWhatsAppInstance(instanceId, { active_agent_id: agentId });
      
      // 2. Atualizar as configurações de grupo no próprio AGENTE
      await whatsappDb.updateAgent(agentId, {
         respond_to_groups: groupConfig.respondToGroups,
         group_mode: groupConfig.mode,
         group_list: groupConfig.selectedJids
      });

      setBindingAgent(null);
      fetchInstances();
      alert('Agente vinculado e configurado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao vincular agente.');
    } finally {
      setLoadingAgents(false);
      fetchAgents();
    }
  };

  const fetchGroupsForInstance = async (instanceId: string) => {
     const { data, error } = await supabase
       .from('whatsapp_groups')
       .select('jid, group_name')
       .eq('instance_id', instanceId);
     if (!error && data) {
        setSelectedInstanceGroups(data);
     }
  };

  const handleTestBot = async (instanceName: string) => {
    if (!instanceName) return alert('Nenhuma instância válida.');
    try {
       setLoadingAgents(true);
       const { data: { session } } = await supabase.auth.getSession();
       const res = await fetch('/api/whatsapp/send', {
         method: 'POST',
         headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${session?.access_token || ''}`
         },
         body: JSON.stringify({
           instanceName: instanceName,
           jid: '5548988003260@c.us',
           text: '🤖 *Teste de Validação do Robô*\n\nOlá! Estou validando a conexão da inteligência artificial. Se o modo autônomo estiver ligado, eu deverei responder suas mensagens a partir de agora.'
         })
       });
       const data = await res.json();
       if (data.success) {
          alert('Mensagem de Validação Enviada com Sucesso para 5548988003260!');
       } else {
          alert(`Falha ao disparar validacão: ${data.error}`);
       }
    } catch (err: any) {
       alert(`Erro externo: ${err.message}`);
    } finally {
       setLoadingAgents(false);
    }
  };

  const handleEdit = async (agent: any) => {
     setLoadingAgents(true);
     try {
        const fullAgent = await whatsappDb.getAgentFullMetadata(agent.id);
        setEditingAgent(fullAgent);
        setActiveTab('wizard');
     } catch (err) {
        console.error('Erro ao buscar metadados do agente:', err);
        alert('Falha ao carregar dados do agente para edição.');
     } finally {
        setLoadingAgents(false);
     }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'library':
        return (
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {niches.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedNiche(n.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border-2",
                    selectedNiche === n.id 
                      ? "bg-slate-900 border-slate-900 text-white" 
                      : "bg-white border-slate-100 text-slate-500 hover:border-slate-300"
                  )}
                >
                  <n.icon size={16} />
                  {n.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agentTemplates
                .filter(t => selectedNiche === 'all' || t.category.toLowerCase().includes(selectedNiche) || t.niche.toLowerCase().includes(selectedNiche))
                .map((t) => (
                <TemplateCard 
                  key={t.id} 
                  template={t} 
                  onUse={() => {
                    setSelectedTemplate(t);
                    setActiveTab('wizard');
                  }} 
                />
              ))}
              
              <div 
                onClick={() => {
                  setSelectedTemplate(null);
                  setActiveTab('wizard');
                }}
                className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-amber-400 hover:bg-amber-50 group transition-all"
              >
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-amber-400 group-hover:text-white transition-all">
                  <Plus size={24} />
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-slate-800">Criar Agente do Zero</h4>
                  <p className="text-xs text-slate-500">Comece do rascunho e personalize tudo</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'my-agents':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myAgents.length === 0 ? (
              <div className="col-span-full p-20 text-center space-y-4">
                 <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto">
                    <Bot size={40} />
                 </div>
                 <p className="text-slate-400 text-sm font-medium">Você ainda não criou nenhum agente personalizado.</p>
                 <button onClick={() => setActiveTab('library')} className="text-amber-500 font-black uppercase text-[10px] tracking-widest hover:underline">Ir para Biblioteca</button>
              </div>
            ) : (
              myAgents.map(agent => (
                <div key={agent.id} className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm hover:border-slate-300 transition-all group">
                   <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl">
                         {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        agent.status === 'active' ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                      )}>
                        {agent.status}
                      </span>
                   </div>
                   <h3 className="font-bold text-slate-800 text-lg mb-1">{agent.name}</h3>
                   <p className="text-xs text-slate-500 line-clamp-2 mb-4 h-8">{agent.description || agent.objective || 'Sem descrição'}</p>
                   
                   <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                      <button 
                        onClick={() => {
                          setSelectedAgentForSandbox(agent);
                          setActiveTab('sandbox');
                        }}
                        className={cn(
                          "text-[10px] font-black uppercase hover:bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5",
                          selectedAgentForSandbox?.id === agent.id ? "text-amber-500 bg-amber-50" : "text-slate-900"
                        )}
                      >
                         <Play size={12} className={cn(selectedAgentForSandbox?.id === agent.id ? "fill-amber-500" : "fill-current")} /> Testar
                      </button>

                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleEdit(agent)}
                          title="Editar Agente"
                          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                        >
                           <Settings size={16} />
                        </button>
                        <button 
                          onClick={() => setBindingAgent(agent)}
                          title="Vincular ao WhatsApp"
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        >
                           <Share2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(agent.id)}
                          title="Excluir Agente"
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                           <Plus size={16} className="rotate-45" />
                        </button>
                      </div>
                   </div>

                   {/* Indicador de Vinculação */}
                   {instances.some(i => i.active_agent_id === agent.id) ? (
                     <button onClick={() => setBindingAgent(agent)} className="w-full mt-3 flex items-center justify-center gap-2 bg-blue-50/80 hover:bg-blue-100 p-2 rounded-xl border border-blue-200 transition-all cursor-pointer">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Conectado a: {instances.find(i => i.active_agent_id === agent.id)?.name || 'Sem Nome'}</span>
                     </button>
                   ) : (
                     <button onClick={() => setBindingAgent(agent)} className="w-full mt-3 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl border border-slate-200 transition-all cursor-pointer">
                        <div className="w-2 h-2 bg-slate-300 rounded-full" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Não Vinculado - Clique para Conectar</span>
                     </button>
                   )}
                </div>
              ))
            )}
          </div>
        );
      case 'wizard':
        return (
          <AgentWizard 
            template={selectedTemplate} 
            editingAgent={editingAgent}
            onCancel={() => {
              setActiveTab('library');
              setEditingAgent(null);
            }} 
            onFinish={(savedAgent?: any) => {
              setActiveTab('my-agents');
              setEditingAgent(null);
              if (savedAgent) setBindingAgent(savedAgent);
            }} 
          />
        );
      case 'sandbox':
        if (!selectedAgentForSandbox) {
          return (
            <div className="p-20 text-center space-y-6">
               <div className="w-24 h-24 bg-slate-100 rounded-[40px] flex items-center justify-center text-slate-300 mx-auto border-2 border-dashed border-slate-200">
                  <Terminal size={48} />
               </div>
               <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight">Ambiente de Testes (Sandbox)</h3>
                  <p className="text-slate-500 text-sm">Escolha um agente na lista "Meus Agentes" para testar sua proatividade e tom de voz.</p>
               </div>
               <button onClick={() => setActiveTab('my-agents')} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">Ver Meus Agentes</button>
            </div>
          );
        }
        return <AgentSandbox agent={selectedAgentForSandbox} onBack={() => setSelectedAgentForSandbox(null)} />;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 relative">
      {/* Modal de Vinculação */}
      <AnimatePresence>
        {bindingAgent && (
          <motion.div 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
             <motion.div 
               initial={{ scale: 0.9, y: 20 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-8 overflow-hidden"
             >
                <div className="flex justify-between items-center mb-8">
                   <div>
                      <h3 className="text-xl font-black text-slate-800">Vincular no WhatsApp</h3>
                      <p className="text-xs text-slate-500">Selecione para qual conta o <strong>{bindingAgent.name}</strong> responderá.</p>
                   </div>
                   <button onClick={() => setBindingAgent(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                      <Plus size={24} className="rotate-45 text-slate-400" />
                   </button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   {instances.length === 0 && <p className="text-center text-slate-400 py-10 italic">Nenhuma instância WhatsApp encontrada.</p>}
                   {instances.map((instance: any, idx: number) => (
                     <div key={instance.id || instance.instanceName || instance.name || idx} className="space-y-4">
                       <button 
                         onClick={() => {
                           // Se já for a selecionada, desfaz a seleção local (opcional)
                           // Caso contrário, carrega os grupos
                           fetchGroupsForInstance(instance.id);
                           // Reset configs para os valores atuais do agente se existirem (idealmente)
                           setGroupConfig({
                              respondToGroups: bindingAgent.respond_to_groups || false,
                              mode: bindingAgent.group_mode || 'all',
                              selectedJids: bindingAgent.group_list || []
                           });
                         }}
                         className={cn(
                           "w-full flex items-center justify-between p-4 rounded-3xl border-2 transition-all",
                           instance.active_agent_id === bindingAgent.id ? "border-amber-400 bg-amber-50" : "border-slate-50 hover:border-slate-200 bg-slate-50/30"
                         )}
                       >
                         <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              instance.status === 'connected' ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                            )}>
                               <MessageSquare size={18} />
                            </div>
                            <div className="text-left">
                               <div className="text-sm font-bold text-slate-800">{instance.name}</div>
                               <div className="text-[10px] text-slate-400 uppercase font-bold">{instance.phone || 'Sem Telefone'}</div>
                            </div>
                         </div>
                         {instance.active_agent_id === bindingAgent.id ? (
                            <div className="w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-slate-900 shadow-sm shadow-amber-200">
                               <Check size={14} />
                            </div>
                         ) : (
                            <ChevronRight size={18} className="text-slate-300" />
                         )}
                       </button>

                       {/* Se esta instância está sendo selecionada ou já é a ativa, mostra configs de grupo */}
                       {instance.status === 'connected' && (
                         <div className="ml-4 pl-4 border-l-2 border-slate-100 space-y-4 py-2">
                            <div className="flex items-center justify-between">
                               <span className="text-xs font-bold text-slate-700">Responder em Grupos?</span>
                               <button 
                                 onClick={() => setGroupConfig(prev => ({ ...prev, respondToGroups: !prev.respondToGroups }))}
                                 className={cn(
                                   "w-10 h-5 rounded-full transition-all relative",
                                   groupConfig.respondToGroups ? "bg-emerald-500" : "bg-slate-300"
                                 )}
                               >
                                 <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", groupConfig.respondToGroups ? "right-1" : "left-1")} />
                               </button>
                            </div>

                            {groupConfig.respondToGroups && (
                               <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                  <div className="flex gap-2">
                                     {['all', 'whitelist', 'blacklist'].map(m => (
                                       <button 
                                         key={m}
                                         onClick={() => setGroupConfig(prev => ({ ...prev, mode: m as any }))}
                                         className={cn(
                                           "flex-1 py-1 rounded-lg text-[10px] font-black uppercase border-2 transition-all",
                                           groupConfig.mode === m ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-100 text-slate-400"
                                         )}
                                       >
                                         {m === 'all' ? 'Todos' : m === 'whitelist' ? 'Apenas' : 'Exceto'}
                                       </button>
                                     ))}
                                  </div>

                                  {(groupConfig.mode === 'whitelist' || groupConfig.mode === 'blacklist') && (
                                     <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                        {selectedInstanceGroups.length === 0 ? (
                                          <p className="text-[10px] text-slate-400 italic text-center py-4">Nenhum grupo sincronizado nesta conta.</p>
                                        ) : (
                                          selectedInstanceGroups.map(g => (
                                            <div key={g.jid} className="flex items-center gap-2">
                                               <input 
                                                 type="checkbox"
                                                 checked={groupConfig.selectedJids.includes(g.jid)}
                                                 onChange={(e) => {
                                                   if (e.target.checked) {
                                                      setGroupConfig(prev => ({ ...prev, selectedJids: [...prev.selectedJids, g.jid] }));
                                                   } else {
                                                      setGroupConfig(prev => ({ ...prev, selectedJids: prev.selectedJids.filter(j => j !== g.jid) }));
                                                   }
                                                 }}
                                                 className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                               />
                                               <span className="text-[11px] text-slate-600 truncate">{g.group_name || 'Grupo Sem Nome'}</span>
                                            </div>
                                          ))
                                        )}
                                     </div>
                                  )}
                               </div>
                            )}

                            <button 
                              onClick={() => handleBind(instance.id, bindingAgent.id)}
                              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase hover:bg-slate-800 transition-all shadow-lg mb-2"
                            >
                               Confirmar Vinculação
                            </button>

                            {instance.active_agent_id === bindingAgent.id && (
                              <button 
                                onClick={() => handleTestBot(instance.name)}
                                className="w-full py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl text-xs font-black uppercase hover:bg-amber-100 transition-all flex justify-center items-center gap-2"
                              >
                                 <Zap size={14} /> Enviar Ping de Validação
                              </button>
                            )}
                         </div>
                       )}
                     </div>
                   ))}
                </div>
                
                <p className="mt-8 text-[10px] text-slate-400 leading-relaxed text-center italic">
                   Note: Ao vincular, as respostas automáticas via IA nesta conta passarão a ser geridas exclusivamente por este agente profissional.
                </p>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Central de Agentes AI <span className="text-xs font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full uppercase">Professional</span>
          </h2>
          <p className="text-slate-500 text-sm font-medium">Orquestração completa de atendimento inteligente multicanal.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
          <TabButton active={activeTab === 'library'} label="Biblioteca" icon={Library} onClick={() => setActiveTab('library')} />
          <TabButton active={activeTab === 'my-agents'} label="Meus Agentes" icon={Bot} onClick={() => setActiveTab('my-agents')} />
          <TabButton active={activeTab === 'sandbox'} label="Sandbox" icon={Play} onClick={() => setActiveTab('sandbox')} />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function TabButton({ active, label, icon: Icon, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function TemplateCard({ template, onUse }: { template: AgentTemplate, onUse: () => void }) {
  const Icon = template.icon || Bot;
  return (
    <div className="bg-white rounded-2xl p-6 border-2 border-slate-100 hover:border-amber-400 transition-all group flex flex-col h-full shadow-sm hover:shadow-xl hover:shadow-slate-100">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500 group-hover:bg-amber-400 group-hover:text-white transition-all">
          <Icon size={20} />
        </div>
        <div className="flex gap-1">
          {template.compatibilities.map(c => (
            <span key={c} className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">{c}</span>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="font-bold text-slate-800 mb-1">{template.name}</h4>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{template.niche}</span>
          <span className="text-slate-300">|</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{template.category}</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{template.description}</p>
      </div>

      <div className="mt-auto pt-6 border-t border-slate-50 flex gap-2">
        <button 
          onClick={onUse}
          className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
        >
          Usar Modelo <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function AgentWizard({ template, editingAgent, onCancel, onFinish }: { template: AgentTemplate | null, editingAgent?: any, onCancel: () => void, onFinish: (agent?: any) => void }) {
  const [step, setStep] = useState(editingAgent ? 2 : (template ? 2 : 1));
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState({
    name: editingAgent?.name || template?.name || '',
    personality: editingAgent?.personality || template?.prompt_base || '',
    provider: (editingAgent?.provider as any) || 'groq',
    objective: editingAgent?.objective ? (editingAgent.objective.split(',').map((o: string) => o.trim())) : ([] as string[]),
    variables: editingAgent?.variables || [] as { key: string, value: string, label?: string }[],
    uploadedFiles: editingAgent?.knowledgeFiles?.map((f: any) => ({ name: f.file_name, url: f.file_url })) || [] as { name: string, url: string }[],
    voiceEnabled: editingAgent?.voice_enabled || false,
    workingHours: editingAgent?.working_hours || { enabled: false, timezone: 'America/Sao_Paulo', schedule: { mon: ['08:00', '18:00'], tue: ['08:00', '18:00'], wed: ['08:00', '18:00'], thu: ['08:00', '18:00'], fri: ['08:00', '18:00'], sat: ['09:00', '12:00'], sun: ['00:00', '00:00'] } },
    prompt: editingAgent?.personality || template?.prompt_base || ''
  });

  const getPreviewPrompt = () => {
    let final = formData.personality;
    formData.variables.forEach(v => {
      const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g');
      final = final.replace(regex, v.value || `[${v.key}]`);
    });
    return final;
  };

  useEffect(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = Array.from(formData.personality.matchAll(regex));
    const keys = Array.from(new Set(matches.map(m => m[1])));
    
    setFormData(prev => {
      const existingKeys = prev.variables.map(v => v.key);
      const newVars = keys.map(k => {
        const existing = prev.variables.find(v => v.key === k);
        return existing || { key: k, value: '', label: k.replace(/_/g, ' ') };
      });
      
      if (JSON.stringify(existingKeys.sort()) !== JSON.stringify(keys.sort())) {
        return { ...prev, variables: newVars };
      }
      return prev;
    });
  }, [formData.personality]);

  const nextStep = () => setStep(prev => Math.min(8, prev + 1));
  const prevStep = () => setStep(prev => Math.max(1, prev - 1));

  const toggleObjective = (obj: string) => {
    setFormData(prev => {
      const current = prev.objective;
      if (current.includes(obj)) {
        return { ...prev, objective: current.filter(o => o !== obj) };
      } else {
        return { ...prev, objective: [...current, obj] };
      }
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editingAgent) {
        // MODO EDIÇÃO
        await whatsappDb.updateProfessionalAgent(editingAgent.id, {
          name: formData.name,
          personality: formData.personality,
          description: editingAgent.description,
          objective: formData.objective.join(', '),
          respond_to_groups: editingAgent.respond_to_groups,
          group_mode: editingAgent.group_mode,
          group_list: editingAgent.group_list,
          working_hours: formData.workingHours,
          voice_enabled: formData.voiceEnabled
        }, formData.variables);
        
        // Novos arquivos?
        const newFiles = formData.uploadedFiles.filter(f => !editingAgent.knowledgeFiles.some((ef: any) => ef.file_url === f.url));
        const { data: { session: editSession } } = await supabase.auth.getSession();
        
        for (const file of newFiles) {
          await whatsappDb.saveAgentKnowledgeFile(editingAgent.id, file.name, file.url, file.name.split('.').pop() || 'bin');
          await fetch('/api/agents/process-pdf', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${editSession?.access_token || ''}`
            },
            body: JSON.stringify({ agentId: editingAgent.id, fileUrl: file.url })
          });
        }
        
        onFinish(editingAgent);
      } else {
        // MODO CRIAÇÃO (Legado mantido)
        const agent = await whatsappDb.saveProfessionalAgent({
          name: formData.name,
          personality: formData.personality,
          description: template?.description || '',
          objective: formData.objective.join(', '),
          template_id: template?.id,
          working_hours: formData.workingHours,
          voice_enabled: formData.voiceEnabled
        }, formData.variables);

        if (agent && formData.uploadedFiles.length > 0) {
          const { data: { session: createSession } } = await supabase.auth.getSession();
          
          for (const file of formData.uploadedFiles) {
            await whatsappDb.saveAgentKnowledgeFile(agent.id, file.name, file.url, file.name.split('.').pop() || 'bin');
            await fetch('/api/agents/process-pdf', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${createSession?.access_token || ''}`
              },
              body: JSON.stringify({ agentId: agent.id, fileUrl: file.url })
            });
          }
        }

        if (agent) {
          onFinish(agent);
        }
      }
    } catch (err) {
      console.error('Erro ao salvar agente:', err);
      alert('Erro ao salvar o agente. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: 
        return (
          <div className="space-y-4 text-center">
            <h4 className="text-lg font-bold">Escolha um Modelo Inicial</h4>
            <p className="text-sm text-slate-500">Você pode começar do zero ou usar nossa biblioteca.</p>
            <div className="flex justify-center gap-4 py-8">
               <button onClick={nextStep} className="px-6 py-12 border-2 border-dashed rounded-2xl hover:border-amber-400 hover:bg-amber-50 transition-all flex-1 max-w-[200px]">
                  <Plus className="mx-auto mb-2 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">Totalmente do Zero</span>
               </button>
               <button onClick={onCancel} className="px-6 py-12 border-2 border-slate-100 rounded-2xl hover:border-amber-400 hover:bg-slate-50 transition-all flex-1 max-w-[200px]">
                  <Library className="mx-auto mb-2 text-amber-500" />
                  <span className="text-xs font-bold text-slate-600">Usar Biblioteca</span>
               </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 block text-left">Identidade do Agente</label>
                <input 
                  type="text" 
                  placeholder="Ex: Recepcionista Clínica" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition-all shadow-inner"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-700 block text-left">Motor de Inteligência (IA)</label>
                <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 h-[58px]">
                  {[
                    { id: 'gemini', icon: Brain, label: 'Gemini' },
                    { id: 'groq', icon: Zap, label: 'Groq' },
                    { id: 'openai', icon: Cpu, label: 'GPT' }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => setFormData({...formData, provider: p.id as any})}
                      className={cn(
                        "flex-1 flex flex-col items-center justify-center rounded-xl transition-all",
                        formData.provider === p.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      <p.icon size={14} className={formData.provider === p.id ? "text-amber-500" : ""} />
                      <span className="text-[10px] font-black uppercase mt-0.5">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700 block">Personalidade / Tom de Voz (Engenharia de Prompt Profissional)</label>
              <textarea 
                placeholder="Defina o contexto completo, regras e comportamento técnico..." 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 h-40 resize-none font-mono text-xs leading-relaxed"
                value={formData.personality}
                onChange={(e) => setFormData({...formData, personality: e.target.value})}
              />
              <p className="text-[10px] text-slate-400">Dica: Use {"{{chave}}"} para criar variáveis dinâmicas que você preenche depois.</p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-slate-700 text-center">Quais os objetivos deste agente? (Selecione um ou mais)</h4>
            <div className="grid grid-cols-2 gap-4">
              {['Geração de Leads', 'Atendimento e Tirar Dúvidas', 'Suporte Técnico', 'Agendamento de Consultas', 'Venda Direta', 'Qualificação Técnica'].map(obj => (
                <button 
                  key={obj}
                  onClick={() => toggleObjective(obj)}
                  className={cn(
                    "p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden",
                    formData.objective.includes(obj) ? "border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-400/20" : "border-slate-100 hover:border-slate-200"
                  )}
                >
                  <span className="text-sm font-bold block">{obj}</span>
                  {formData.objective.includes(obj) && (
                    <div className="absolute top-2 right-2 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-slate-900 border border-white">
                      <Check size={10} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
             <div className="bg-amber-50 p-4 rounded-xl text-xs text-amber-800 font-medium border border-amber-100 flex items-center gap-3">
               <Zap className="text-amber-500 shrink-0" size={16} />
               {formData.variables.length > 0 
                 ? `Detectamos ${formData.variables.length} chaves dinâmicas. Preencha os valores padrões para este agente.` 
                 : "Nenhuma variável detectada no prompt. Adicione {{variavel}} no prompt (Etapa 2) para personalizar campos."}
             </div>
             {formData.variables.length > 0 && (
               <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {formData.variables.map((v, idx) => (
                  <div key={v.key} className="flex gap-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl transition-all hover:bg-white hover:shadow-sm">
                      <div className="shrink-0 w-32 font-mono text-[10px] bg-slate-100 p-2 rounded text-slate-500 capitalize flex items-center justify-center">
                        {"{{" + v.key + "}}"}
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{v.label}</label>
                        <input 
                          type="text" 
                          placeholder={`Valor padrão para ${v.key}`} 
                          className="w-full bg-white p-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-400"
                          value={v.value}
                          onChange={(e) => {
                            const newVars = [...formData.variables];
                            newVars[idx].value = e.target.value;
                            setFormData({...formData, variables: newVars});
                          }}
                        />
                      </div>
                  </div>
                ))}
               </div>
             )}
             
             <button 
               onClick={() => setStep(2)}
               className="text-xs font-bold text-slate-400 hover:text-slate-600 underline flex items-center gap-2"
             >
                <Plus size={14} /> Editar prompt para adicionar mais variáveis
             </button>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
             <h4 className="text-sm font-bold text-slate-700">Base de Conhecimento (RAG)</h4>
             <div 
                onClick={() => document.getElementById('knowledge-upload')?.click()}
                className="border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center space-y-4 hover:border-amber-400 hover:bg-slate-50 transition-all cursor-pointer"
             >
                <input 
                  type="file" 
                  id="knowledge-upload" 
                  hidden 
                  accept=".pdf,.txt" 
                  multiple
                  onChange={async (e) => {
                    if (!e.target.files) return;
                    setLoading(true);
                    for (const file of Array.from(e.target.files)) {
                      try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${formData.name}_${Date.now()}.${fileExt}`;
                        const filePath = `knowledge/${fileName}`;
                        
                        const { error: uErr } = await supabase.storage
                          .from('fluowai')
                          .upload(filePath, file);

                        if (uErr) throw uErr;

                        const { data: { publicUrl } } = supabase.storage
                          .from('fluowai')
                          .getPublicUrl(filePath);

                        setFormData(prev => ({
                          ...prev, 
                          uploadedFiles: [...prev.uploadedFiles, { name: file.name, url: publicUrl }]
                        }));
                        
                      } catch (err) {
                        console.error('Upload Error:', err);
                      }
                    }
                    setLoading(false);
                  }}
                />
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                   <Plus size={32} />
                </div>
                <div>
                   <p className="text-sm font-bold text-slate-700">Clique para selecionar PDFs ou TXTs</p>
                   <p className="text-xs text-slate-400">O agente consultará estes arquivos antes de responder.</p>
                </div>
             </div>
             
             {formData.uploadedFiles.length > 0 && (
               <div className="space-y-2">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arquivos Selecionados:</h5>
                  {formData.uploadedFiles.map((f, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 italic text-xs text-slate-600">
                       <span className="flex items-center gap-2 truncate">
                          <CheckCircle2 size={14} className="text-emerald-500" /> {f.name}
                       </span>
                       <span className="text-[9px] font-black text-slate-400">READY</span>
                    </div>
                  ))}
               </div>
             )}
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
             <div className="flex justify-between items-center">
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                   <button 
                     onClick={() => setPreviewMode(false)}
                     className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", !previewMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                   >
                     Editor
                   </button>
                   <button 
                     onClick={() => setPreviewMode(true)}
                     className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", previewMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                   >
                     Preview Profissional
                   </button>
                </div>
                <button className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1">
                  <Zap size={10} /> Otimizar com IA
                </button>
             </div>
             {previewMode ? (
               <div className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl h-64 overflow-y-auto text-xs text-slate-700 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {getPreviewPrompt()}
               </div>
             ) : (
               <textarea 
                  className="w-full p-6 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl h-64 outline-none border border-slate-800 leading-relaxed shadow-inner"
                  value={formData.personality} 
                  onChange={(e) => setFormData({...formData, personality: e.target.value})}
               />
             )}
          </div>
        );
        case 7:
          return (
            <div className="space-y-6">
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                     <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", formData.voiceEnabled ? "bg-orange-100 text-orange-600" : "bg-slate-200 text-slate-400")}>
                        <Mic size={20} />
                     </div>
                     <div>
                        <h4 className="text-sm font-bold">Respostas por Voz (TTS)</h4>
                        <p className="text-[10px] text-slate-500">O robô responderá enviando áudios em vez de texto.</p>
                     </div>
                  </div>
                  <button 
                    onClick={() => setFormData({...formData, voiceEnabled: !formData.voiceEnabled})}
                    className={cn("w-12 h-6 rounded-full p-1 transition-all relative", formData.voiceEnabled ? "bg-orange-500" : "bg-slate-300")}
                  >
                    <div className={cn("w-4 h-4 bg-white rounded-full transition-all", formData.voiceEnabled ? "translate-x-6" : "translate-x-0")} />
                  </button>
               </div>

               <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between border-b pb-4 border-slate-200">
                     <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all", formData.workingHours.enabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-400")}>
                           <Clock size={20} />
                        </div>
                        <div>
                           <h4 className="text-sm font-bold">Horário de Atendimento</h4>
                           <p className="text-[10px] text-slate-500">Defina quando o robô estará ativo.</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setFormData({...formData, workingHours: {...formData.workingHours, enabled: !formData.workingHours.enabled}})}
                       className={cn("w-12 h-6 rounded-full p-1 transition-all relative", formData.workingHours.enabled ? "bg-emerald-500" : "bg-slate-300")}
                     >
                       <div className={cn("w-4 h-4 bg-white rounded-full transition-all", formData.workingHours.enabled ? "translate-x-6" : "translate-x-0")} />
                     </button>
                  </div>

                  {formData.workingHours.enabled && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                        {Object.entries(formData.workingHours.schedule).map(([day, times]: any) => (
                           <div key={day} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[10px] font-black text-slate-400 uppercase w-8">{day}</span>
                              <div className="flex items-center gap-2">
                                 <input 
                                   type="time" 
                                   value={times[0]} 
                                   onChange={(e) => {
                                      const newSched = {...formData.workingHours.schedule, [day]: [e.target.value, times[1]]};
                                      setFormData({...formData, workingHours: {...formData.workingHours, schedule: newSched}});
                                   }}
                                   className="text-[10px] font-bold bg-slate-50 border-none rounded p-1" 
                                 />
                                 <span className="text-slate-300">-</span>
                                 <input 
                                   type="time" 
                                   value={times[1]} 
                                   onChange={(e) => {
                                      const newSched = {...formData.workingHours.schedule, [day]: [times[0], e.target.value]};
                                      setFormData({...formData, workingHours: {...formData.workingHours, schedule: newSched}});
                                   }}
                                   className="text-[10px] font-bold bg-slate-50 border-none rounded p-1" 
                                 />
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>
          );
        case 8:
          return (
            <div className="space-y-6">
               <h4 className="text-lg font-bold text-center">Tudo Pronto! 🚀</h4>
               <div className="bg-slate-50 p-6 rounded-2xl space-y-3">
                  <div className="flex justify-between border-b pb-2"><span className="text-xs text-slate-500">Nome:</span> <span className="text-xs font-bold">{formData.name}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-xs text-slate-500">Voz Ativa:</span> <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", formData.voiceEnabled ? "bg-orange-100 text-orange-700" : "bg-slate-200 text-slate-500")}>{formData.voiceEnabled ? 'SIM' : 'NÃO'}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-xs text-slate-500">Horário Ativo:</span> <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded", formData.workingHours.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500")}>{formData.workingHours.enabled ? 'SIM' : 'NÃO'}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-xs text-slate-500">Variáveis:</span> <span className="text-xs font-bold italic text-slate-600">{formData.variables.length} configuradas</span></div>
                  <div className="flex justify-between"><span className="text-xs text-slate-500">Status:</span> <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-1 rounded">PRONTO PARA USO</span></div>
               </div>
            </div>
          );
      }
    };

  return (
    <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl p-8 max-w-4xl mx-auto w-full flex flex-col min-h-[600px] relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 bg-white/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
           <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
           <p className="font-bold text-slate-800">Processando informações...</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-800">
             <Settings size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Construtor Profissional</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Etapa {step} de 7: {getStepTitle(step)}</p>
          </div>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-2 transform transition-transform hover:rotate-90">
           <Plus size={24} className="rotate-45" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-12">
        {[1,2,3,4,5,6,7,8].map(s => (
          <div key={s} className={cn(
            "h-1 px-1 rounded-full flex-1 transition-all",
            s <= step ? "bg-slate-900" : "bg-slate-100"
          )} />
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-between pt-12 border-t border-slate-100 mt-8">
        <button 
          onClick={step === 1 ? onCancel : prevStep} 
          className="px-8 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
        >
          {step === 1 ? 'Cancelar' : 'Voltar'}
        </button>
        <button 
          onClick={step === 8 ? handleSave : nextStep}
          className="px-10 py-4 bg-slate-900 text-white rounded-[20px] font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-2"
        >
          {step === 8 ? 'Salvar Agente' : 'Continuar'} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function getStepTitle(step: number) {
  const titles = [
    'Modelo Inicial',
    'Identidade do Agente',
    'Objetivo Operacional',
    'Variáveis de Injeção',
    'Base de Conhecimento',
    'Prompt Mestre',
    'Automações (Voz e Horário)',
    'Revisão Final'
  ];
  return titles[step - 1];
}
