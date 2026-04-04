import React from 'react';
import { User, Phone } from 'lucide-react';

interface ContactCardMessageProps {
  vcardName: string | null;
  vcardPhone: string | null;
  rawBody: string | null;
}

export function ContactCardMessage({ vcardName, vcardPhone, rawBody }: ContactCardMessageProps) {
  // Se falhar o parse nativo, renderiza o fallback estruturado
  const displayName = vcardName || 'Contato Compartilhado';
  const displayPhone = vcardPhone || 'Sem número detectado';
  
  return (
    <div className="flex flex-col bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden min-w-[240px] max-w-[300px] hover:shadow-md transition-shadow">
      {/* Header do Cartão */}
      <div className="flex items-center gap-3 p-3 border-b border-slate-100 bg-slate-50">
        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
          <User size={20} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-800 truncate" title={displayName}>
            {displayName}
          </h4>
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
            Cartão de Contato
          </p>
        </div>
      </div>
      
      {/* Corpo / Ações */}
      <div className="p-3 bg-white">
        <div className="flex items-center gap-2 text-slate-700 bg-slate-50 py-2 px-3 rounded-lg border border-slate-100">
          <Phone size={14} className="text-slate-400" />
          <span className="text-xs font-semibold font-mono tracking-tight cursor-copy hover:text-indigo-600 transition-colors" title="Clique para copiar" onClick={(e) => {
             e.stopPropagation();
             if (vcardPhone) navigator.clipboard.writeText(vcardPhone);
          }}>
            {displayPhone}
          </span>
        </div>
        
        {/* Se o parse falhar miseravelmente, mostra um fragmento minúsculo de debug se necessário na tooltip */}
        {!vcardName && !vcardPhone && rawBody && (
           <div className="mt-2 text-[10px] text-slate-400 font-mono opacity-50 truncate" title={rawBody}>
              {rawBody.slice(0, 30)}...
           </div>
        )}
      </div>
    </div>
  );
}
