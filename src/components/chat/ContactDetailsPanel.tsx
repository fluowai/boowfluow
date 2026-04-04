import React, { useState, useEffect } from 'react';
import { User, Phone, Tag, Building2, Flag, AlignLeft, Edit3, Briefcase, Calendar, ShieldBan, Forward, Bot, AlertCircle } from 'lucide-react';
import { whatsappDb } from '../../services/whatsappDb';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { formatPhoneDisplay } from '../../lib/messageAdapter';

interface ContactDetailsPanelProps {
  chat: any | null;
  instanceId: string | null;
}

// Temporary Mock Data for CRM representation
const MOCK_TAGS = ['Cliente VIP', 'Em fechameto', 'Dúvida Técnica'];
const MOCK_FUNNEL = ['Qualificação', 'Apresentação', 'Negociação', 'Fechamento'];

export function ContactDetailsPanel({ chat, instanceId }: ContactDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'notes'>('info');
  const [funnelStage, setFunnelStage] = useState('Negociação');
  const [isAiEnabled, setIsAiEnabled] = useState(chat?.isAiEnabled !== false);
  const [loading, setLoading] = useState(false);

  // Sincroniza estado local quando o chat muda
  useEffect(() => {
    if (chat && chat.id) {
       setIsAiEnabled(chat.isAiEnabled !== false);
    }
  }, [chat?.id?._serialized]);

  const handleToggleAi = async () => {
     if (!instanceId || !chat) return;
     setLoading(true);
     const newVal = !isAiEnabled;
     const success = await whatsappDb.updateChatAiStatus(instanceId, chat.id._serialized, chat.isGroup, { is_ai_enabled: newVal });
     if (success) {
        setIsAiEnabled(newVal);
        chat.isAiEnabled = newVal; // Update local reference
     }
     setLoading(false);
  };

  if (!chat) {
    return (
      <div className="w-[340px] border-l border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
        <p className="text-sm font-medium text-slate-400">Nenhum contato selecionado</p>
      </div>
    );
  }

  const isGroup = chat?.isGroup || false;
  const rawNumber = chat?.id?.user || '';
  const displayName = chat?.name || rawNumber || 'Contato';

  return (
    <div className="w-[340px] border-l border-slate-200 bg-white flex flex-col shrink-0 h-full overflow-y-auto overflow-x-hidden relative">
      <div className="p-6 pb-4 flex flex-col items-center border-b border-slate-100 relative">
        <button className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 transition-colors">
          <Edit3 size={16} />
        </button>
        
        <div className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-sm mb-4 border-4 border-white",
          isGroup ? "bg-indigo-100 text-indigo-500" : "bg-emerald-100 text-emerald-500"
        )}>
          {chat?.profilePic ? (
             <img src={chat.profilePic} alt="Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
             isGroup ? <Building2 size={32} /> : <User size={32} />
          )}
        </div>
        
        <h2 className="text-xl font-bold text-slate-800 text-center leading-tight mb-1">{displayName}</h2>
        
        {!isGroup && (() => {
          const formattedPhone = formatPhoneDisplay(rawNumber);
          return formattedPhone ? (
            <div className="flex items-center gap-1.5 text-slate-500 text-sm font-mono mt-1">
              <Phone size={14} />
              <span>{formattedPhone}</span>
            </div>
          ) : null;
        })()}
        
        {isGroup && (
          <div className="text-xs text-indigo-500 font-bold bg-indigo-50 px-2.5 py-1 rounded-full mt-2">
            Grupo do WhatsApp
          </div>
        )}
      </div>

      <div className="flex px-4 pt-2 border-b border-slate-200">
        <button 
          className={cn("flex-1 pb-2 text-sm font-bold border-b-2 transition-colors", activeTab === 'info' ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600")}
          onClick={() => setActiveTab('info')}
        >
          Detalhes
        </button>
        <button 
          className={cn("flex-1 pb-2 text-sm font-bold border-b-2 transition-colors", activeTab === 'notes' ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400 hover:text-slate-600")}
          onClick={() => setActiveTab('notes')}
        >
          Notas Internas
        </button>
      </div>

      <div className="flex-1 p-5 space-y-6">
        {activeTab === 'info' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            
            {/* Status Pipeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Flag size={14} /> Etapa do Funil</h4>
              </div>
              <select 
                value={funnelStage}
                onChange={(e) => setFunnelStage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 outline-none focus:border-emerald-500 transition-colors font-medium cursor-pointer"
              >
                {MOCK_FUNNEL.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>

            {/* Tags CRM */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><Tag size={14} /> Tags do Cliente</h4>
                <button className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600 uppercase">Editar</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {MOCK_TAGS.map((tag, idx) => (
                  <span key={idx} className={cn(
                    "text-xs px-2.5 py-1 rounded-md font-bold border cursor-default transition-colors",
                    idx === 0 ? "bg-amber-50 text-amber-700 border-amber-200" : 
                    idx === 1 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"
                  )}>
                    {tag}
                  </span>
                ))}
                <button className="text-xs px-2 py-1 rounded-md font-bold border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors flex items-center gap-1">
                  + Adicionar
                </button>
              </div>
            </div>

            {/* Atribuição */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
               <div className="flex items-center justify-between text-sm">
                 <span className="text-slate-500 flex items-center gap-2"><Briefcase size={16} /> Responsável</span>
                 <span className="font-bold text-slate-800">João Vendas</span>
               </div>
               <div className="flex items-center justify-between text-sm">
                 <span className="text-slate-500 flex items-center gap-2"><Calendar size={16} /> Última interação</span>
                 <span className="font-medium text-slate-700 truncate">Hoje, 14:32</span>
               </div>
            </div>

          </motion.div>
        )}

        {activeTab === 'notes' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 h-full flex flex-col">
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex gap-3 text-amber-800 text-xs">
              <AlignLeft size={16} className="shrink-0 mt-0.5" />
              <p>Notas adicionadas aqui ficam visíveis apenas para sua equipe.</p>
            </div>
            
            <textarea 
              placeholder="Digite uma observação sobre este contato..."
              className="w-full flex-1 min-h-[150px] p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none"
            />
            
            <button className="w-full py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-colors">
              Salvar Nota Interna
            </button>
            <div className="pt-4 border-t border-slate-100 space-y-3">
               <h4 className="text-xs font-bold text-slate-400 uppercase">Histórico de Notas</h4>
               <p className="text-[11px] text-slate-400 text-center py-4 italic">Nenhuma nota salva ainda.</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Configuração de IA e Transbordo */}
      <div className="px-5 py-4 border-t border-slate-100 space-y-4">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className={cn(
                 "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                 isAiEnabled ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"
               )}>
                  <Bot size={18} />
               </div>
               <div>
                  <h4 className="text-xs font-bold text-slate-700">Assistente de IA</h4>
                  <p className="text-[10px] text-slate-400">{isAiEnabled ? 'Ativo e monitorando' : 'Desativado para este chat'}</p>
               </div>
            </div>
            <button 
              onClick={handleToggleAi}
              disabled={loading}
              className={cn(
                "w-11 h-6 rounded-full p-1 transition-all relative",
                isAiEnabled ? "bg-emerald-500" : "bg-slate-200"
              )}
            >
              <div className={cn(
                "w-4 h-4 bg-white rounded-full shadow-sm transition-all transform",
                isAiEnabled ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
         </div>

         {chat.needsHuman && (
            <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
               <AlertCircle className="text-rose-500 shrink-0" size={20} />
               <div>
                  <p className="text-[11px] font-bold text-rose-700 uppercase leading-none">Atenção Especial</p>
                  <p className="text-[10px] text-rose-500 font-medium">Lead solicitou atendimento humano.</p>
               </div>
            </div>
         )}
      </div>

      {/* Ações Rápidas Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2 mt-auto">
         <button className="w-full py-2 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
           <Forward size={16} /> Transferir Atendimento
         </button>
         <button className="w-full py-2 flex items-center justify-center gap-2 text-sm font-bold text-rose-500 bg-white border border-rose-100 rounded-lg shadow-sm hover:bg-rose-50 transition-colors">
           <ShieldBan size={16} /> Bloquear Contato
         </button>
      </div>

    </div>
  );
}
