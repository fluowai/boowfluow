import React, { useState, useEffect } from 'react';
import { 
  MoreHorizontal, 
  Plus, 
  CircleDot
} from 'lucide-react';
import { cn } from '../lib/utils';
import { KanbanCard } from './KanbanCard';
import * as whatsappDb from '../services/whatsappDb';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function KanbanColumn({ column, searchTerm }: { column: any, searchTerm: string }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // DnD Hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: column.id,
    data: { type: 'Column', column }
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  useEffect(() => {
    fetchLeads();
  }, [column.id]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await whatsappDb.getLeadsByColumn(column.id);
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(l => 
    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone?.includes(searchTerm) ||
    l.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col w-[320px] h-full bg-slate-50/50 rounded-[32px] border border-slate-100/80 p-4 transition-all",
        isDragging && "opacity-50 scale-95 ring-2 ring-slate-900/10 shadow-xl"
      )}
    >
      {/* Header da Coluna */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <div 
            className="w-2 h-2 rounded-full shadow-sm" 
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            {column.name}
            <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-400 font-black">
              {filteredLeads.length}
            </span>
          </h3>
        </div>
        <div className="flex gap-1">
          <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 transition-all">
             <Plus size={14} />
          </button>
          <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 transition-all">
             <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Leads na Coluna */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[100px]">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <SortableContext items={filteredLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
            {filteredLeads.map((lead) => (
              <KanbanCard key={lead.id} lead={lead} columnColor={column.color} />
            ))}
          </SortableContext>
        )}
        
        {filteredLeads.length === 0 && !loading && (
          <div className="py-12 text-center space-y-2 opacity-20 group">
             <CircleDot size={20} className="mx-auto text-slate-400 group-hover:scale-110 transition-transform" />
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vazio</p>
          </div>
        )}
      </div>
    </div>
  );
}
