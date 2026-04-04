import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Trash2, 
  Download, 
  Pause, 
  Play, 
  Search, 
  AlertCircle, 
  Info, 
  Zap,
  Filter,
  ShieldCheck,
  BellRing,
  Brain,
  Loader2,
  Send,
  RefreshCw,
  AlertTriangle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { whatsappService } from '../../services/whatsapp';
import { supabase } from '../../lib/supabase';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'critical' | 'success';
  message: string;
  source?: string;
}

interface InstanceInfo {
  instanceName: string;
  status: string;
}

export function NocAlertsPanel() {
  // ===== LOGS STATE =====
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'critical'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const maxLogs = 500;

  // ===== DISPATCH STATE =====
  const [availableInstances, setAvailableInstances] = useState<InstanceInfo[]>([]);
  const [selectedInstance, setSelectedInstance] = useState('');
  const [targetPhone, setTargetPhone] = useState('5548991138937');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // ===== GROQ AI STATE =====
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  // ===== METRICS STATE =====
  const [metrics, setMetrics] = useState({ cpu: 0, ram: 0, ramUsedMB: 0, uptime: '0h 0m' });

  // ===== SOCKET LISTENER =====
  useEffect(() => {
    const handleNewLog = (log: LogEntry) => {
      if (isPaused) return;
      setLogs(prev => {
        const updated = [log, ...prev];
        return updated.slice(0, maxLogs);
      });
    };

    whatsappService.on('system:log', handleNewLog);
    return () => { whatsappService.off('system:log', handleNewLog); };
  }, [isPaused]);

  useEffect(() => {
    const handleMetrics = (data: any) => setMetrics(data);
    whatsappService.on('system:metrics', handleMetrics);
    return () => { whatsappService.off('system:metrics', handleMetrics); };
  }, []);

  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, isPaused]);

  // ===== LOAD INSTANCES =====
  useEffect(() => {
    loadInstances();
    loadSavedConfig();
  }, []);

  const loadInstances = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/config/whatsapp/instances', {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      if (data.instances) setAvailableInstances(data.instances);
    } catch (e) {
      console.warn('Failed to fetch instances', e);
    }
  };

  const loadSavedConfig = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/config', {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const phone = data.find((c: any) => c.key === 'support_phone')?.value;
        const instance = data.find((c: any) => c.key === 'support_instance')?.value;
        if (phone) setTargetPhone(phone);
        if (instance) setSelectedInstance(instance);
      }
    } catch (e) {}
  };

  // ===== FILTERED LOGS =====
  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (log.source || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const errorLogs = logs.filter(l => l.level === 'error' || l.level === 'critical' || l.level === 'warn');

  // ===== HELPERS =====
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      case 'critical': return 'text-white bg-rose-600 border-rose-700 shadow-lg shadow-rose-600/20';
      case 'warn': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'success': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      default: return 'text-blue-300 bg-blue-300/10 border-blue-300/20';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': case 'critical': return <AlertCircle size={14} />;
      case 'warn': return <AlertTriangle size={14} />;
      case 'success': return <ShieldCheck size={14} />;
      default: return <Info size={14} />;
    }
  };

  const clearLogs = () => setLogs([]);

  const downloadLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source || 'SYS'}] ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noc-logs-${new Date().toISOString()}.txt`;
    a.click();
  };

  // ===== DISPATCH ALERT =====
  const handleDispatchAlert = async () => {
    setDispatching(true);
    setDispatchResult(null);
    try {
      // Save config first
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      await fetch('/api/config/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify([
          { key: 'support_phone', value: targetPhone },
          { key: 'support_instance', value: selectedInstance }
        ])
      });

      const res = await fetch('/api/config/test-alert', { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setDispatchResult({ 
        type: res.ok ? 'success' : 'error', 
        message: data.message || data.error || 'Erro desconhecido' 
      });
    } catch (e: any) {
      setDispatchResult({ type: 'error', message: e.message });
    } finally {
      setDispatching(false);
      setTimeout(() => setDispatchResult(null), 8000);
    }
  };

  // ===== GROQ AI ANALYSIS =====
  const handleGroqAnalysis = async () => {
    if (errorLogs.length === 0) {
      setDispatchResult({ type: 'error', message: 'Nenhum log de erro/warning capturado. Aguarde eventos ou crie um problema de teste.' });
      setTimeout(() => setDispatchResult(null), 5000);
      return;
    }

    setAnalyzing(true);
    setShowAiPanel(true);
    setAiAnalysis(null);

    try {
      const logsToSend = errorLogs.slice(0, 50).map(l => ({
        timestamp: l.timestamp,
        level: l.level,
        message: l.message
      }));

      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/noc/analyze-errors', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ logs: logsToSend })
      });

      const data = await res.json();
      
      if (res.ok) {
        setAiAnalysis(data.analysis);
      } else {
        setAiAnalysis(`## ❌ Erro na Análise\n\n${data.error}`);
      }
    } catch (e: any) {
      setAiAnalysis(`## ❌ Falha de Conexão\n\n${e.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // ===== COUNTERS =====
  const errorCount = logs.filter(l => l.level === 'error' || l.level === 'critical').length;
  const warnCount = logs.filter(l => l.level === 'warn').length;

  return (
    <div className="flex flex-col h-full gap-4 overflow-hidden">
      {/* ====== HEADER BAR ====== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-rose-500 to-amber-500 p-3 rounded-2xl text-white shadow-lg shadow-rose-500/20">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">NOC / Centro de Alertas</h2>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Monitoramento em tempo real • Operação Lamborghini
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGroqAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-bold text-xs hover:from-purple-700 hover:to-violet-700 shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
          >
            {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
            Auditor Groq IA
          </button>

          <button 
            onClick={handleDispatchAlert}
            disabled={dispatching}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold text-xs hover:from-rose-600 hover:to-pink-600 shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50"
          >
            {dispatching ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
            Disparar Alerta VIP
          </button>

          <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden lg:block" />

          <button onClick={() => setIsPaused(!isPaused)}
            className={cn("p-2.5 rounded-xl transition-all border flex items-center gap-1.5 font-bold text-[11px]",
              isPaused ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-slate-50 border-slate-200 text-slate-600"
            )}
          >
            {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
            {isPaused ? "PLAY" : "PAUSE"}
          </button>
          <button onClick={clearLogs} className="p-2.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all" title="Limpar"><Trash2 size={14} /></button>
          <button onClick={downloadLogs} className="p-2.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all" title="Baixar"><Download size={14} /></button>
        </div>
      </div>

      {/* ====== DISPATCH CONFIG BAR ====== */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 px-5 py-3 rounded-2xl border border-slate-700 shrink-0">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Destino VIP:</span>
        <input 
          type="text"
          value={targetPhone}
          onChange={(e) => setTargetPhone(e.target.value)}
          placeholder="5548991138937"
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-44 font-mono"
        />
        <select
          value={selectedInstance}
          onChange={(e) => setSelectedInstance(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none cursor-pointer min-w-[180px]"
        >
          <option value="">Qualquer instância</option>
          {availableInstances.map((inst, i) => (
            <option key={i} value={inst.instanceName}>
              {inst.instanceName} ({inst.status})
            </option>
          ))}
        </select>
        <button onClick={loadInstances} className="p-2 text-slate-500 hover:text-blue-400 transition-colors" title="Recarregar instâncias"><RefreshCw size={14} /></button>

        {/* Status Counters */}
        <div className="ml-auto flex items-center gap-3">
          {errorCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-[11px] font-black animate-pulse">
              <AlertCircle size={12} /> {errorCount} ERROS
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[11px] font-black">
              <AlertTriangle size={12} /> {warnCount} WARNS
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.6)]" /> {filteredLogs.length} logs
          </span>
        </div>
      </div>

      {/* ====== DISPATCH RESULT NOTIFICATION ====== */}
      <AnimatePresence>
        {dispatchResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 shrink-0",
              dispatchResult.type === 'success' 
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700" 
                : "bg-rose-50 border border-rose-200 text-rose-700"
            )}
          >
            {dispatchResult.type === 'success' ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
            <span className="flex-1">{dispatchResult.message}</span>
            <button onClick={() => setDispatchResult(null)} className="opacity-50 hover:opacity-100"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== MAIN CONTENT (SPLIT: Terminal + AI Panel) ====== */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Terminal de Logs */}
        <div className={cn(
          "bg-slate-950 rounded-[28px] border border-slate-800 shadow-2xl overflow-hidden flex flex-col relative transition-all duration-300",
          showAiPanel ? "w-[55%]" : "w-full"
        )}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          
          {/* Filter Bar */}
          <div className="flex items-center gap-3 px-5 py-3 bg-slate-900/60 border-b border-slate-800/50 relative z-10 backdrop-blur-sm shrink-0">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filtrar:</span>
            <div className="relative group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={13} />
              <input 
                type="text" placeholder="Buscar..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 outline-none focus:ring-1 focus:ring-blue-500/40 w-40"
              />
            </div>
            {(['all', 'info', 'warn', 'error', 'critical'] as const).map(lvl => (
              <button 
                key={lvl}
                onClick={() => setFilter(lvl)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border",
                  filter === lvl 
                    ? "bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20" 
                    : "bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300"
                )}
              >
                {lvl === 'all' ? 'TUDO' : lvl}
              </button>
            ))}
          </div>

          {/* Log Entries */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar font-mono text-[12px] relative z-10">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3 opacity-50">
                <Terminal size={40} className="animate-pulse" />
                <p className="font-bold text-xs">Aguardando sinais do motor...</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredLogs.map((log) => (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2 group/item py-0.5 px-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span className="text-slate-600 shrink-0 select-none min-w-[75px] text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    
                    <div className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded border font-black text-[9px] uppercase tracking-wide shrink-0",
                      getLevelColor(log.level)
                    )}>
                      {getLevelIcon(log.level)}
                      {log.level}
                    </div>

                    {log.source && (
                      <span className="text-blue-400/60 font-bold shrink-0 uppercase tracking-tighter text-[10px]">
                        [{log.source}]
                      </span>
                    )}

                    <span className={cn(
                      "font-medium leading-relaxed break-all",
                      log.level === 'error' || log.level === 'critical' ? "text-rose-200" : "text-slate-300"
                    )}>
                      {log.message}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Status Bar */}
          <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-500 relative z-10 shrink-0">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.6)]" /> Stream Ativo</span>
              <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Socket.IO</span>
              <div className="h-3 w-[1px] bg-slate-700 mx-1 hidden md:block" />
              <span className="hidden md:flex items-center gap-1.5 tracking-wider">
                CPU: <span className={cn(metrics.cpu > 80 ? "text-rose-400" : "text-emerald-400")}>{metrics.cpu}%</span>
              </span>
              <span className="hidden md:flex items-center gap-1.5 tracking-wider">
                RAM: <span className={cn(metrics.ram > 80 ? "text-rose-400" : "text-amber-400")}>{metrics.ram}% ({metrics.ramUsedMB}MB)</span>
              </span>
              <span className="hidden md:flex items-center gap-1.5 tracking-wider">
                UPTIME: <span className="text-blue-400">{metrics.uptime}</span>
              </span>
            </div>
            <span>Max Buffer: {maxLogs}</span>
          </div>
        </div>

        {/* ====== AI ANALYSIS PANEL ====== */}
        <AnimatePresence>
          {showAiPanel && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '45%' }}
              exit={{ opacity: 0, width: 0 }}
              className="bg-white rounded-[28px] border border-slate-200 shadow-xl overflow-hidden flex flex-col"
            >
              {/* AI Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-violet-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-2 rounded-xl text-white shadow-lg shadow-purple-500/20">
                    <Brain size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight">Auditor Groq IA</h3>
                    <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Llama 3 · 70B · Análise de Erros</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleGroqAnalysis}
                    disabled={analyzing}
                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-black hover:bg-purple-200 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {analyzing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Re-analisar
                  </button>
                  <button 
                    onClick={() => setShowAiPanel(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* AI Content */}
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                {analyzing ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-xl shadow-purple-500/30">
                        <Brain size={28} className="text-white animate-pulse" />
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 border-purple-400 animate-ping opacity-20" />
                    </div>
                    <p className="text-sm font-black text-slate-700">Analisando {errorLogs.length} eventos...</p>
                    <p className="text-xs text-slate-400 font-medium">O Llama 3 está processando a trilha de erros do sistema</p>
                  </div>
                ) : aiAnalysis ? (
                  <div className="prose prose-sm prose-slate max-w-none">
                    <div className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {aiAnalysis.split('\n').map((line, i) => {
                        if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-black text-slate-800 mt-4 mb-2">{line.replace('## ', '')}</h2>;
                        if (line.startsWith('### ')) return <h3 key={i} className="text-base font-black text-slate-700 mt-3 mb-1">{line.replace('### ', '')}</h3>;
                        if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-black text-slate-900 mt-4 mb-2">{line.replace('# ', '')}</h1>;
                        if (line.startsWith('- ')) return <div key={i} className="flex items-start gap-2 py-0.5"><span className="text-purple-500 mt-1 shrink-0">•</span><span>{line.replace('- ', '')}</span></div>;
                        if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-black text-slate-800 my-1">{line.replaceAll('**', '')}</p>;
                        if (line.trim() === '') return <div key={i} className="h-2" />;
                        return <p key={i} className="my-0.5">{line}</p>;
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                    <Brain size={40} className="opacity-30" />
                    <p className="text-xs font-bold">Clique em "Auditor Groq IA" para iniciar</p>
                  </div>
                )}
              </div>

              {/* AI Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[10px] font-bold text-slate-400 shrink-0">
                <span>Powered by Groq · Llama 3 70B</span>
                <span>{errorLogs.length} erros capturados</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
