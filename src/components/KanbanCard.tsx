import React from 'react';
import { 
  Bot, 
  Phone, 
  Building2, 
  Calendar,
  Zap,
  MoreVertical,
  ChevronRight,
  User,
  AudioLines,
  MessageSquareQuote,
  Tag
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function KanbanCard({ lead, columnColor }: { lead: any, columnColor: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: lead.id,
    data: { type: 'Lead', lead }
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const getSourceIcon = (source: string) => {
    switch (source?.toLowerCase()) {
      case 'whatsapp': return <Phone size={10} className="text-emerald-500" />;
      case 'prospect': return <Zap size={10} className="text-amber-500" />;
      default: return <User size={10} className="text-blue-500" />;
    }
  };

  return (
    <div 
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-white border border-slate-200/60 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] group flex flex-col gap-3 relative",
        isDragging && "opacity-20 ring-2 ring-slate-900/5 rotate-2 z-50",
        "border-l-4"
      )}
      style={{ ...style, borderLeftColor: columnColor }}
    >
      {/* Header do Card */}
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-slate-800 tracking-tight leading-tight group-hover:text-amber-600 transition-colors capitalize">
            {lead.name || 'Sem Nome'}
          </h4>
          <div className="flex items-center gap-2 opacity-60">
             <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter truncate max-w-[100px]">
               {lead.phone || 'Sem Telefone'}
             </span>
          </div>
        </div>
        <button className="text-slate-200 group-hover:text-slate-400 transition-colors p-1 -mr-2">
           <MoreVertical size={14} />
        </button>
      </div>

      {/* Resumo IA (Novidade v2) */}
      {lead.summary && (
        <div className="bg-slate-50/80 border border-slate-100 p-2 rounded-xl flex items-start gap-2">
           <MessageSquareQuote size={12} className="text-blue-500 mt-0.5 shrink-0" />
           <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2 italic">
             "{lead.summary}"
           </p>
        </div>
      )}

      {/* Info Body */}
      <div className="space-y-1.5 px-0.5">
        <div className="flex items-center gap-2 text-slate-500">
           <Building2 size={12} className="shrink-0" />
           <span className="text-[10px] font-medium truncate italic">{lead.company || 'Empresa não informada'}</span>
        </div>
        
        <div className="flex flex-wrap gap-1.5 pt-1">
           <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
              {getSourceIcon(lead.lead_source)}
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                {lead.lead_source || 'Indireto'}
              </span>
           </div>
           
           {lead.estimated_value > 0 && (
             <div className="bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="text-[9px] font-black text-emerald-600">R$ {Number(lead.estimated_value).toLocaleString()}</span>
             </div>
           )}

           {lead.ai_label && (
             <div className="bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Bot size={8} className="text-amber-500 fill-amber-500/20" />
                <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">{lead.ai_label}</span>
             </div>
           )}

           {/* Tags (v2) */}
           {lead.tags && lead.tags.map((tag: any) => (
             <div 
               key={tag.id}
               className="px-2 py-0.5 rounded-md flex items-center gap-1 border"
               style={{ backgroundColor: `${tag.color}10`, borderColor: `${tag.color}30` }}
             >
                <Tag size={8} style={{ color: tag.color }} />
                <span className="text-[8px] font-bold" style={{ color: tag.color }}>{tag.name}</span>
             </div>
           ))}
        </div>
      </div>

      {/* Footer / Meta */}
      <div className="pt-3 border-t border-slate-50 flex justify-between items-center mt-1">
         <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 border border-white">
               {lead.responsible_id ? 'R' : '?'}
            </div>
            <div className="flex -space-x-1">
               {/* Placeholders para tags ou indicadores de conversa */}
               {Math.random() > 0.5 && <AudioLines size={12} className="text-amber-400" title="Contém áudio transcrito" />}
            </div>
         </div>
         <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-[9px] font-bold font-mono">
              {lead.updated_at ? new Date(lead.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '--/--'}
            </span>
            <ChevronRight size={10} />
         </div>
      </div>
      
      {/* Indicador de Movimentação por IA (Sutil) */}
      {lead.confidence > 0.8 && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white shadow-sm ring-2 ring-amber-100 animate-pulse" title="Mapeado pela IA" />
      )}
    </div>
  );
}
