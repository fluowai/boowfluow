import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Zap, 
  Clock, 
  Terminal, 
  Variable, 
  ChevronRight,
  RefreshCw,
  Search,
  BookOpen
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as whatsappDb from '../../services/whatsappDb';

import { supabase } from '../../lib/supabase';

// Removida a MASTER_API_KEY global do frontend por razões de segurança.

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  latency?: number;
  timestamp: Date;
}

export function AgentSandbox({ agent, onBack }: { agent: any, onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [agentVars, setAgentVars] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVars();
  }, [agent.id]);

  const fetchVars = async () => {
    try {
      const vars = await whatsappDb.getAgentVariables(agent.id);
      setAgentVars(vars);
    } catch (err) {
      console.error(err);
    }
  };

  const replaceVariables = (text: string, vars: any[]) => {
    let final = text;
    vars.forEach(v => {
      const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, 'g');
      final = final.replace(regex, v.value || `[${v.key}]`);
    });
    return final;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const startTime = Date.now();
      // CORREÇÃO DE MEMÓRIA: Envia o histórico completo para a IA
      const history = messages.map(m => ({
        role: m.role === 'agent' ? 'assistant' : 'user',
        content: m.content
      }));

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/agents/sandbox-test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ 
          agentId: agent.id, 
          message: input,
          history: history
        })
      });
      
      const result = await response.json();
      const endTime = Date.now();
      const latency = endTime - startTime;

      if (result.success) {
        const agentMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: result.response,
          latency: result.latency || latency,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, agentMsg]);
        
        // Add log
        setLogs(prev => [{
          time: new Date().toLocaleTimeString(),
          event: 'Inference',
          latency: `${result.latency || latency}ms`,
          status: 'Success',
          provider: result.provider,
          model: result.model
        }, ...prev]);
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error('Sandbox Error:', err);
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full gap-6 overflow-hidden">
      {/* --- LADO ESQUERDO: CHAT SIMULADO --- */}
      <div className="flex-1 flex flex-col bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden border-b-8 border-b-slate-900/5">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-900 text-white">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center text-slate-900 font-black">
                {agent.name.charAt(0).toUpperCase()}
             </div>
             <div>
                <h3 className="text-sm font-bold">{agent.name}</h3>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                   <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Sandbox Ativo</span>
                </div>
             </div>
          </div>
          <button onClick={onBack} className="text-xs font-bold text-slate-400 hover:text-white transition-all">Encerrar Sessão</button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 italic">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
               <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                  <Terminal size={24} />
               </div>
               <p className="text-sm font-medium text-slate-500">Inicie uma conversa para <br/> validar o comportamento do agente.</p>
            </div>
          )}
          
          <AnimatePresence>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm shadow-sm",
                  m.role === 'user' ? "bg-slate-900 text-white rounded-tr-none" : "bg-white border border-slate-100 text-slate-700 rounded-tl-none font-medium leading-relaxed"
                )}>
                  {m.content}
                </div>
                {m.latency && (
                   <span className="text-[9px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                      <Zap size={8} className="text-amber-500" /> {m.latency}ms
                   </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none mr-auto max-w-[80%]"
            >
               <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
               </div>
            </motion.div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100">
           <div className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Envie uma mensagem de teste..."
                className="w-full bg-slate-100 p-4 pr-16 rounded-2xl outline-none focus:ring-2 ring-amber-400/20 text-sm border border-transparent transition-all"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={handleSend}
                disabled={loading}
                className="absolute right-2 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                 <Send size={18} />
              </button>
           </div>
        </div>
      </div>

      {/* --- LADO DIREITO: TECH LOGS & PROMPT ANALYSIS --- */}
      <div className="w-[380px] flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
        {/* Sessão de Variáveis */}
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Variable size={12} className="text-amber-500" /> Injeção de Contexto
           </h4>
           
           <div className="space-y-4">
              <div className="flex flex-col gap-2">
                 <span className="text-[10px] font-bold text-slate-500 font-mono italic"># Prompt Final (Substituído):</span>
                 <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[9px] text-emerald-400 font-mono line-clamp-6 leading-relaxed">
                    {replaceVariables(agent.personality || '', agentVars)}
                 </div>
              </div>

              <div className="space-y-2">
                 <span className="text-[10px] font-bold text-slate-500 font-mono italic"># Variáveis Ativas:</span>
                 {agentVars.length === 0 && <p className="text-[9px] text-slate-400 italic">Nenhuma variável configurada.</p>}
                 {agentVars.map(v => (
                    <div key={v.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                       <span className="text-[9px] font-mono text-slate-500">{"{{" + v.key + "}}"}</span>
                       <span className="text-[9px] font-bold text-slate-900">{v.value}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Console de Logs */}
        <div className="flex-1 bg-slate-900 rounded-[32px] border border-slate-800 p-6 flex flex-col overflow-hidden shadow-2xl">
           <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Terminal size={12} /> Tech Console
              </h4>
              <button className="text-[10px] font-bold text-slate-500 hover:text-white flex items-center gap-1">
                 <RefreshCw size={10} /> Clear
              </button>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-4 font-mono text-[10px]">
              {logs.length === 0 && (
                <div className="h-full flex items-center justify-center text-slate-700 italic">Aguardando eventos...</div>
              )}
              {logs.map((log, i) => (
                 <div key={i} className="border-l-2 border-emerald-500/30 pl-3 py-1 space-y-1">
                    <div className="flex justify-between items-center">
                       <span className="text-emerald-500 font-bold">[{log.time}] {log.event}</span>
                       <span className="bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-sm">{log.status}</span>
                    </div>
                    <div className="text-slate-400">Latência: <span className="text-white">{log.latency}</span></div>
                    <div className="text-slate-400 text-[9px] italic flex items-center gap-1">
                       <ChevronRight size={10} /> Invocando {log.provider} ({log.model})... ok
                    </div>
                 </div>
              ))}
           </div>

           <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-[10px]">
                 <span className="text-slate-500">Modelo Ativo:</span>
                 <span className="text-white font-bold">{logs[0]?.model || 'Aguardando...'}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                 <span className="text-slate-500">Provedor:</span>
                 <span className="text-emerald-400 font-black uppercase tracking-tighter">{logs[0]?.provider || '---'}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                 <span className="text-slate-500">RAG Readiness:</span>
                 <span className={cn(
                   "font-black uppercase px-2 py-0.5 rounded-full text-[8px]",
                   agent.knowledge ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                 )}>
                   {agent.knowledge ? 'Ready' : 'Missing'}
                 </span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
