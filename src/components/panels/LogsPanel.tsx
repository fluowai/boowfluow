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
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { whatsappService } from '../../services/whatsapp';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'critical' | 'success';
  message: string;
  source?: string;
}

export function LogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'critical'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const maxLogs = 500;

  useEffect(() => {
    const handleNewLog = (log: LogEntry) => {
      if (isPaused) return;
      
      setLogs(prev => {
        const updated = [log, ...prev];
        return updated.slice(0, maxLogs);
      });
    };

    // Ouvinte para logs do sistema vindo do Socket
    whatsappService.on('system:log', handleNewLog);

    return () => {
      whatsappService.off('system:log', handleNewLog);
    };
  }, [isPaused]);

  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, isPaused]);

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (log.source || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

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
      case 'warn': return <Filter size={14} />;
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
    a.download = `lamborghini-logs-${new Date().toISOString()}.txt`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header com Controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg">
            <Terminal size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Monitor do Sistema</h2>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Operação Lamborghini em tempo real
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar nos logs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-full md:w-64"
            />
          </div>

          <div className="h-10 w-[1px] bg-slate-200 mx-2 hidden md:block" />

          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              "p-2.5 rounded-xl transition-all border flex items-center gap-2 font-bold text-xs",
              isPaused 
                ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100" 
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            )}
            title={isPaused ? "Retomar logs" : "Pausar logs (Congela a tela)"}
          >
            {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
            {isPaused ? "RETOMAR" : "PAUSAR"}
          </button>

          <button 
            onClick={clearLogs}
            className="p-2.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-xl transition-all"
            title="Limpar todos os logs"
          >
            <Trash2 size={16} />
          </button>

          <button 
            onClick={downloadLogs}
            className="p-2.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-xl transition-all"
            title="Baixar logs (.txt)"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Terminal de Logs */}
      <div className="flex-1 bg-slate-950 rounded-[32px] border border-slate-800 shadow-2xl overflow-hidden flex flex-col relative group/terminal">
        {/* Mirror Reflection Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none opacity-20" />
        
        {/* Barra de Filtros Rápida */}
        <div className="flex items-center gap-4 px-6 py-4 bg-slate-900/50 border-b border-slate-800/50 relative z-10 backdrop-blur-sm">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">Filtrar por:</span>
          {(['all', 'info', 'warn', 'error', 'critical'] as const).map(lvl => (
            <button 
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border",
                filter === lvl 
                  ? "bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20" 
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
              )}
            >
              {lvl === 'all' ? 'TUDO' : lvl}
            </button>
          ))}
          
          <div className="ml-auto flex items-center gap-4">
             <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">{filteredLogs.length} exibidos</span>
             </div>
          </div>
        </div>

        {/* Scrollable Log Content */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar font-mono text-[13px] relative z-10"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
               <Zap size={48} className="animate-pulse" />
               <p className="font-bold text-sm">Aguardando novos sinais do motor...</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredLogs.map((log) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 group/item py-0.5 px-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <span className="text-slate-600 shrink-0 select-none min-w-[140px] border-r border-slate-800 pr-3">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-black text-[10px] uppercase tracking-wide shrink-0",
                    getLevelColor(log.level)
                  )}>
                    {getLevelIcon(log.level)}
                    {log.level}
                  </div>

                  {log.source && (
                    <span className="text-blue-400 font-bold opacity-60 shrink-0 uppercase tracking-tighter text-[11px]">
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
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-500 relative z-10">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" /> Stream Ativo</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Socket.IO Conectado</span>
          </div>
          <div className="flex items-center gap-3">
            <span>RAM: 142MB</span>
            <span>Uptime: 4h 12m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
