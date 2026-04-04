import React, { useState, useEffect } from 'react';
import { Search, Users, User, AlertCircle, RefreshCw, Megaphone, Star, Camera } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { InstanceConnectionState } from '../../types/chat';
import { isDisplayableHumanName, formatPhoneDisplay } from '../../lib/messageAdapter';

interface ConversationsSidebarProps {
  instances: InstanceConnectionState[];
  selectedInstance: string;
  setSelectedInstance: (id: string) => void;
  chats: any[];
  loadingChats: boolean;
  activeInstanceStatus: string;
  selectedChat: any | null;
  setSelectedChat: (chat: any | null) => void;
  onRefresh?: () => void;
  onToggleFavorite?: (jid: string, current: boolean) => void;
}

export function ConversationsSidebar({
  instances,
  selectedInstance,
  setSelectedInstance,
  chats,
  loadingChats,
  activeInstanceStatus,
  selectedChat,
  setSelectedChat,
  onRefresh,
  onToggleFavorite
}: ConversationsSidebarProps) {
  
  const [mainTab, setMainTab] = useState<'messages' | 'groups' | 'instagram'>('messages');
  const [subFilter, setSubFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [visibleCount, setVisibleCount] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset paginação ao mudar de aba ou busca
  useEffect(() => {
    setVisibleCount(50);
  }, [mainTab, subFilter, searchQuery]);

  // Cálculos de Não Lidas por Categoria
  const unreadMessagesCount = chats.filter(c => !c.isGroup && !c.isInstagram).reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const unreadGroupsCount = chats.filter(c => c.isGroup).reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const unreadInstagramCount = chats.filter(c => c.isInstagram).reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  
  const getCleanNumber = (chat: any) => {
    if (chat.id && chat.id.user) return chat.id.user;
    return '';
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    
    let date: Date;
    if (typeof ts === 'string') {
      // ISO string (ex: "2026-04-03T17:22:00.000Z")
      date = new Date(ts);
    } else if (typeof ts === 'number') {
      // Unix: se for menor que 10 bilhões, é segundos; senão é milissegundos
      date = ts < 10000000000 ? new Date(ts * 1000) : new Date(ts);
    } else {
      return '';
    }
    
    if (isNaN(date.getTime())) return '';
    
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  // [IDENTITY-SAFE] Formata nome do autor para preview na sidebar.
  // Rejeita IDs brutos, números puros e JIDs. Só exibe nomes humanos reais.
  const formatAuthorName = (name: string | null | undefined) => {
    if (!name || !isDisplayableHumanName(name)) return '';
    // Retorna a primeira palavra do nome humano (ex: "João Silva" → "João")
    return name.split(' ')[0] || '';
  };

  const getPreviewContent = (chat: any) => {
    if (!chat.lastMessage) {
      if (chat.isGroup) return <span className="italic text-slate-400">Grupo Fluo OS</span>;
      const fmtPhone = formatPhoneDisplay(getCleanNumber(chat));
      return fmtPhone 
        ? <span className="font-mono text-[10px] text-slate-400">{fmtPhone}</span>
        : <span className="italic text-slate-400">Conversa</span>;
    }

    const msg = chat.lastMessage;
    const isMe = msg.fromMe;
    const isGroup = chat.isGroup;
    const type = msg.type || 'chat';
    const body = msg.body || '';
    const caption = msg.caption || body;

    let icon = null;
    let text = caption || body;

    switch (type) {
      case 'image':
        icon = '📷 ';
        text = caption || 'Foto';
        break;
      case 'video':
        icon = '🎥 ';
        text = caption || 'Vídeo';
        break;
      case 'audio':
      case 'ptt':
        icon = '🎤 ';
        text = 'Áudio';
        break;
      case 'document':
        icon = '📄 ';
        text = msg.filename || 'Documento';
        break;
      case 'sticker':
        icon = '🎨 ';
        text = 'Figurinha';
        break;
      case 'location':
        icon = '📍 ';
        text = 'Localização';
        break;
      case 'revoked':
        icon = '🚫 ';
        text = 'Mensagem apagada';
        break;
    }

    return (
      <span className="flex items-center gap-1 truncate">
        {isMe && <span className="text-slate-400 font-bold mr-1">Você:</span>}
        {isGroup && !isMe && msg.authorName && (
          <span className="text-emerald-600 font-bold mr-1">
            {formatAuthorName(msg.authorName)}:
          </span>
        )}
        <span className="font-bold opacity-80">{icon}</span>
        <span className="truncate">{text}</span>
      </span>
    );
  };


  return (
    <div className="w-[350px] min-w-[350px] max-w-[360px] flex flex-col border-r border-slate-200 bg-slate-50/50 shrink-0 h-full">
      {/* Header da Sidebar */}
      <div className="pt-6 pb-2 border-b border-slate-200/60 bg-white shrink-0 z-10 relative">
        <div className="px-5 flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-bold text-[#0F172A] tracking-tight">Mensagens</h2>
            {onRefresh && (
              <button 
                onClick={onRefresh}
                disabled={loadingChats}
                className={cn(
                  "p-1.5 rounded-md border transition-all mt-0.5",
                  loadingChats 
                    ? "text-indigo-400 bg-indigo-50 border-indigo-100 cursor-not-allowed" 
                    : "text-slate-400 bg-slate-50 border-transparent hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 cursor-pointer"
                )}
                title="Sincronizar conversas manualmente"
              >
                <RefreshCw size={14} className={loadingChats ? "animate-spin" : ""} />
              </button>
            )}
          </div>
          
          {instances.filter(i => i.status === 'connected').length > 0 ? (
            <div className="relative">
               <select 
                className="appearance-none h-[34px] text-[12px] bg-white border border-[#E2E8F0] rounded-[10px] pl-3 pr-8 text-[#475569] font-semibold cursor-pointer outline-none hover:bg-slate-50 transition-all shadow-sm"
                value={selectedInstance}
                onChange={(e) => {
                  setSelectedInstance(e.target.value);
                  setSelectedChat(null);
                }}
              >
                {instances.filter(i => i.status === 'connected').map(inst => (
                  <option key={inst.instanceId} value={inst.instanceId}>{inst.instanceName || inst.phone || 'Instância'}</option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 border-l border-slate-100 pl-1.5 ml-1">
                 <User size={12} />
              </div>
            </div>
          ) : (
            <span className="text-[10px] bg-rose-50 text-rose-600 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider border border-rose-100">Offline</span>
          )}
        </div>

        {/* Categoria Principal (Abas Superiores) */}
        <div className="flex gap-2 px-5 mb-4">
            <button 
              onClick={() => { setMainTab('messages'); setSubFilter('all'); }}
              className={cn(
                "inline-flex items-center gap-2 h-[34px] px-3 rounded-[10px] text-[13px] font-semibold transition-all",
                mainTab === 'messages' ? "bg-[#EEF2FF] text-[#0F172A]" : "bg-transparent text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155]"
              )}
            >
              Privados
              {unreadMessagesCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1.5 flex items-center justify-center rounded-full bg-[#E2E8F0] text-[#475569] text-[11px] font-bold">
                  {unreadMessagesCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setMainTab('groups'); setSubFilter('all'); }}
              className={cn(
                "inline-flex items-center gap-2 h-[34px] px-3 rounded-[10px] text-[13px] font-semibold transition-all",
                mainTab === 'groups' ? "bg-[#EEF2FF] text-[#0F172A]" : "bg-transparent text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155]"
              )}
            >
              Grupos
              {unreadGroupsCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1.5 flex items-center justify-center rounded-full bg-[#E2E8F0] text-[#475569] text-[11px] font-bold">
                  {unreadGroupsCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setMainTab('instagram'); setSubFilter('all'); }}
              className={cn(
                "inline-flex items-center gap-2 h-[34px] px-3 rounded-[10px] text-[13px] font-semibold transition-all",
                mainTab === 'instagram' ? "bg-pink-50 text-pink-700" : "bg-transparent text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155]"
              )}
            >
              <Camera size={14} className={mainTab === 'instagram' ? "text-pink-600" : "text-slate-400"} />
              Instagram
              {unreadInstagramCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1.5 flex items-center justify-center rounded-full bg-pink-100 text-pink-700 text-[11px] font-bold">
                  {unreadInstagramCount}
                </span>
              )}
            </button>
        </div>
        
        <div className="px-5 mb-5">
          <div className="relative group">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar no chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl py-2 pl-10 pr-4 text-[14px] font-medium focus:bg-white focus:border-indigo-200 focus:ring-0 shadow-none outline-none transition-all placeholder:text-[#94A3B8]"
            />
          </div>
        </div>
        
        {/* Filtros Secundários (Sub-filtros) */}
        <div className="flex gap-2 px-5 overflow-x-auto pb-4 scrollbar-hide">
           <button 
              onClick={() => setSubFilter('all')}
              className={cn("text-[12px] font-semibold px-4 py-1.5 rounded-full shrink-0 transition-all", subFilter === 'all' ? "bg-emerald-100 text-emerald-800" : "bg-slate-50 text-slate-400 hover:bg-slate-100")}
           >Todas</button>
           <button 
              onClick={() => setSubFilter('unread')}
              className={cn("text-[12px] font-semibold px-4 py-1.5 rounded-full shrink-0 transition-all", subFilter === 'unread' ? "bg-emerald-100 text-emerald-800" : "bg-slate-50 text-slate-400 hover:bg-slate-100")}
           >Não Lidas</button>
           <button 
              onClick={() => setSubFilter('read')}
              className={cn("text-[12px] font-semibold px-4 py-1.5 rounded-full shrink-0 transition-all", subFilter === 'read' ? "bg-emerald-100 text-emerald-800" : "bg-slate-50 text-slate-400 hover:bg-slate-100")}
           >Lidas</button>
        </div>
      </div>

      {/* Lista de Chats */}
      <div className="flex-1 overflow-y-auto w-full">
        {loadingChats ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
             <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
             <span className="text-xs font-medium">Carregando contatos...</span>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-xs px-6 text-center gap-2">
            {activeInstanceStatus === 'starting' ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin mb-2"></div>
                <span className="font-bold text-slate-500">Iniciando o Robô...</span>
                <span>Aguarde um momento.</span>
              </>
            ) : activeInstanceStatus === 'qr_ready' ? (
              <>
                <AlertCircle size={24} className="text-amber-500 mb-2" />
                <span className="font-bold text-slate-500">Aguardando leitura do QR Code.</span>
                <span>Vá na aba "Conexão".</span>
              </>
            ) : (
              'Nenhuma conversa encontrada ou WhatsApp desconectado.'
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {(() => {
              const filtered = chats.filter(chat => {
                // 1. Filtro de Busca
                if (searchQuery && !chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !chat.id?.user?.includes(searchQuery)) return false;

                // 2. Filtro de Categoria (Main Tab)
                if (mainTab === 'messages' && (chat.isGroup || chat.isInstagram)) return false;
                if (mainTab === 'groups' && !chat.isGroup) return false;
                if (mainTab === 'instagram' && !chat.isInstagram) return false;

                // 3. Filtro de Estado (Sub Filter)
                if (subFilter === 'unread') return chat.unreadCount && chat.unreadCount > 0;
                if (subFilter === 'read') return !chat.unreadCount || chat.unreadCount === 0;

                return true; // 'all'
              });

              const paginated = filtered.slice(0, visibleCount);
              const hasMore = filtered.length > visibleCount;

              return (
                <>
                  {paginated.map(chat => {
                    const isGroup = chat.isGroup;
                    const rawNumber = getCleanNumber(chat);
                    // [PHONE-DISPLAY] Se o nome é uma identidade bruta ou igual ao rawNumber, formata como telefone BR
                    let name = chat.name || rawNumber;
                    if (!isDisplayableHumanName(name)) {
                      const fmtPhone = formatPhoneDisplay(rawNumber);
                      name = fmtPhone || 'Contato';
                    }
                    const isActive = selectedChat?.id?._serialized === chat.id._serialized;
                    const isFavorite = chat.isFavorite || false;
                    
                    return (
                      <div 
                        key={chat.id._serialized}
                        onClick={() => setSelectedChat(chat)}
                        className={cn(
                          "grid grid-template-columns-[42px_1fr_auto] gap-3 px-4 py-3.5 cursor-pointer border-b border-[#EEF2F7] transition-all duration-150 min-h-[72px] items-start group relative",
                          isActive 
                            ? "bg-[#EEF4FF] border-l-[3px] border-l-[#22C55E]" 
                            : "hover:bg-[#F8FAFC] border-l-[3px] border-l-transparent bg-white"
                        )}
                        style={{ gridTemplateColumns: '42px 1fr auto' }}
                      >
                        {/* Bloco A - Avatar */}
                        <div className="relative shrink-0 pt-0.5">
                          <div className={cn("w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 border border-slate-100 bg-[#F1F5F9] overflow-hidden")}>
                            {chat.profilePic ? (
                              <img src={chat.profilePic} alt="" className="w-full h-full object-cover" />
                            ) : (
                              chat.isInstagram ? <Camera size={22} className="text-pink-400" /> : 
                              isGroup ? <Users size={22} className="text-slate-400" /> : <User size={22} className="text-slate-400" />
                            )}
                          </div>
                          {isFavorite && (
                             <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-0.5 rounded-full border border-white">
                                <Star size={8} fill="currentColor" />
                             </div>
                          )}
                        </div>
                        
                        {/* Bloco B - Conteúdo Principal */}
                        <div className="min-w-0 flex flex-col pt-0.5">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={cn(
                              "text-[15px] text-[#0F172A] truncate leading-tight flex items-center justify-between",
                              chat.unreadCount > 0 ? "font-bold" : "font-semibold"
                            )} title={name}>
                              <span className="truncate pr-2">{name}</span>
                              {isFavorite && <Star size={12} className="text-amber-400 shrink-0" fill="currentColor" />}
                            </h4>
                          </div>
                          <p className={cn(
                            "text-[13px] truncate leading-[1.35] line-clamp-1", 
                            (chat.unreadCount || 0) > 0 ? "text-[#334155] font-semibold" : "text-[#475569] font-medium"
                          )} style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {getPreviewContent(chat)}
                          </p>
                        </div>

                        {/* Bloco C - Meta Informações */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                          <span className="text-[12px] font-medium text-[#64748B] whitespace-nowrap">
                            {formatTimestamp(chat.timestamp)}
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            {onToggleFavorite && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleFavorite(chat.id._serialized, isFavorite);
                                }}
                                className={cn(
                                  "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-amber-50",
                                  isFavorite ? "opacity-100 text-amber-500" : "text-slate-300 hover:text-amber-500"
                                )}
                              >
                                <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
                              </button>
                            )}
                            {chat.unreadCount > 0 && (
                              <div className="min-w-[18px] h-[18px] rounded-full bg-[#22C55E] flex items-center justify-center px-1">
                                <span className="text-[11px] font-bold text-white leading-none">{chat.unreadCount}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {hasMore && (
                    <button 
                      onClick={() => setVisibleCount(prev => prev + 100)}
                      className="py-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 border-t border-slate-100 transition-colors w-full uppercase tracking-widest"
                    >
                      Ver mais {filtered.length - visibleCount} conversas...
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
