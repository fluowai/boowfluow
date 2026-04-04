import React, { useState, useEffect } from 'react';
import { 
  Trello, 
  Plus, 
  Filter, 
  Search, 
  Zap, 
  TrendingUp, 
  Settings2,
  RefreshCw,
  ChevronDown,
  Layout,
  Tag
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import * as whatsappDb from '../services/whatsappDb';
import { KanbanBoard } from './KanbanBoard';
import { TagsModal } from './TagsModal';

export function KanbanPage() {
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);

  useEffect(() => {
    loadBoards();
  }, []);

  useEffect(() => {
    if (activeBoardId) {
      loadColumns();
    }
  }, [activeBoardId]);

  const loadBoards = async () => {
    try {
      const data = await whatsappDb.getKanbans();
      setBoards(data);
      if (data.length > 0 && !activeBoardId) {
        setActiveBoardId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadColumns = async () => {
    if (!activeBoardId) return;
    setLoading(true);
    try {
      const cols = await whatsappDb.getKanbanColumns(activeBoardId);
      setColumns(cols);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header do Funil */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
            <Trello size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              Kanban IA <span className="text-[10px] font-bold bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full uppercase">Alpha</span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
               <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-all relative group">
                  <Layout size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">
                    {boards.find(b => b.id === activeBoardId)?.name || 'Selecionar Quadro'}
                  </span>
                  <ChevronDown size={14} className="text-slate-400" />
                  
                  {/* Dropdown de Boards */}
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-100 shadow-xl rounded-xl py-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-2">
                    {boards.map(board => (
                      <button 
                        key={board.id}
                        onClick={() => setActiveBoardId(board.id)}
                        className={cn(
                          "w-full text-left px-4 py-2 text-xs font-bold transition-all hover:bg-slate-50",
                          activeBoardId === board.id ? "text-blue-600 bg-blue-50/50" : "text-slate-600"
                        )}
                      >
                        {board.name}
                      </button>
                    ))}
                    <div className="h-px bg-slate-50 my-1" />
                    <button className="w-full text-left px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">
                      + Novo Quadro
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar lead..."
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 ring-slate-900/5 focus:border-slate-400 transition-all w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all border border-slate-100">
            <Filter size={18} />
          </button>

          <button 
            onClick={() => setIsTagsModalOpen(true)}
            className="p-2.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-slate-100"
            title="Gerenciar Tags"
          >
            <Tag size={18} />
          </button>
          
          <button 
            onClick={loadColumns}
            className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all border border-slate-100"
          >
            <RefreshCw size={18} className={cn(loading && "animate-spin")} />
          </button>

          <div className="h-8 w-px bg-slate-100 mx-2" />

          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all">
            <Plus size={18} /> Novo Lead
          </button>
        </div>
      </div>

      {/* KPI Rápido */}
      <div className="grid grid-cols-4 gap-4">
        <KPISmall label="Pipeline Total" value="R$ 428.500" icon={TrendingUp} color="text-blue-500" />
        <KPISmall label="Leads Ativos" value="157" icon={Zap} color="text-amber-500" />
        <KPISmall label="Ações da IA" value="42" icon={Settings2} color="text-emerald-500" />
        <KPISmall label="Ticket Médio" value="R$ 2.729" icon={TrendingUp} color="text-purple-500" />
      </div>

      {/* Board principal */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Sincronizando Funil...</p>
          </div>
        ) : (
          <KanbanBoard 
            columns={columns} 
            searchTerm={searchTerm} 
            onRefresh={loadColumns} 
            kanbanId={activeBoardId || undefined} 
          />
        )}
      </div>

      <TagsModal 
        isOpen={isTagsModalOpen} 
        onClose={() => setIsTagsModalOpen(false)} 
      />
    </div>
  );
}

function KPISmall({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-lg font-black text-slate-800">{value}</p>
      </div>
      <div className={cn("p-2 rounded-lg bg-slate-50", color)}>
        <Icon size={18} />
      </div>
    </div>
  );
}
