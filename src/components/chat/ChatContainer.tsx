import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Search, Send, Image as ImageIcon, FileText, Mic, AlertCircle, Users, User, Phone, Reply, EyeOff, Video, PhoneCall, MoreVertical, Play, Pause, Check, CheckCheck, Clock, Star, Megaphone, Globe } from 'lucide-react';
import { ContactCardMessage } from './ContactCardMessage';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { whatsappService } from '../../services/whatsapp';
import { instagramApi } from '../../services/instagram/api';
import { isDisplayableHumanName, formatPhoneDisplay } from '../../lib/messageAdapter';

import { supabase } from '../../lib/supabase';

// Removida a MASTER_API_KEY global do frontend por razões de segurança.

interface ChatContainerProps {
  selectedChat: any | null;
  activeInstanceName: string;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;
  loadingMessages: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputMessage: string;
  setInputMessage: (msg: string) => void;
  onToggleFavorite?: (jid: string, current: boolean) => void;
}

export function ChatContainer({
  selectedChat,
  activeInstanceName,
  messages,
  setMessages,
  loadingMessages,
  messagesEndRef,
  inputMessage,
  setInputMessage,
  onToggleFavorite
}: ChatContainerProps) {
  
  // [PHONE-DISPLAY] Retorna número limpo formatado ou null se for LID/sistema
  const getCleanNumber = (chat: any) => {
    if (chat.id && chat.id.user) return chat.id.user;
    return '';
  };
  const getFormattedPhone = (chat: any) => {
    const raw = getCleanNumber(chat);
    return formatPhoneDisplay(raw);
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    
    let date: Date;
    if (typeof ts === 'string') {
      date = new Date(ts);
    } else if (typeof ts === 'number') {
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
  
  const [copied, setCopied] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRetrievingMedia, setIsRetrievingMedia] = useState<string | null>(null);

  const handleRetrieveMedia = async (msg: any) => {
    const msgId = msg.message_id || msg.id?._serialized || msg.id;
    if (!msgId || isRetrievingMedia === msgId) return;
    
    setIsRetrievingMedia(msgId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/whatsapp/retrieve-media', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          instanceName: activeInstanceName || selectedChat?.instanceName,
          jid: selectedChat?.jid || msg.jid,
          messageId: msgId,
          type: msg.type
        })
      });
      
      const result = await response.json();
      if (!result.success) {
        alert('Falha ao baixar mídia: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (err) {
      console.error('[Retrieve Media Error]', err);
    } finally {
      setIsRetrievingMedia(null);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat || !activeInstanceName) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        await whatsappService.sendMedia(
          selectedChat.id._serialized, 
          base64, 
          file.type, 
          file.name, 
          '', 
          activeInstanceName
        );
      } catch(err) {
        console.error('Error sending media:', err);
      }
    };
    reader.readAsDataURL(file);
    setTimeout(() => { if (e.target) e.target.value = ''; }, 500);
  };

  const toggleAudioRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm; codecs=opus' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            await whatsappService.sendMedia(
              selectedChat.id._serialized, 
              base64data, 
              'audio/ogg; codecs=opus', 
              'voice.ogg', 
              '', 
              activeInstanceName
            );
          };
        };
        
        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);
      } catch (err) {
        console.error('Error accessing microphone', err);
        alert('Permissão de microfone negada ou não disponível.');
      }
    }
  };

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => a.timestamp - b.timestamp);
  }, [messages]);

  const renderMessageTextWithLinks = (text: string, mentions?: any[]) => {
    if (!text || typeof text !== 'string') return null;
    
    // 1. Resolver Menções (substituindo @55... pelo Nome)
    let processedText = text;
    if (mentions && mentions.length > 0) {
      mentions.forEach(m => {
        const number = m.phone_normalized || m.raw_id?.split('@')[0];
        if (number) {
          processedText = processedText.replace(new RegExp(`@${number}`, 'g'), `@${m.display_name}`);
        }
      });
    }

    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const mentionRegex = /(@[^\s]+)/g;
    
    // Combina os regex para split
    const parts = processedText.split(/(https?:\/\/[^\s]+|www\.[^\s]+|@[^\s]+)/g);
    
    return parts.map((part, i) => {
      if (!part) return null;

      // Link match
      if (part.match(urlRegex)) {
        const href = part.startsWith('http') ? part : `https://${part}`;
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 font-bold underline cursor-pointer hover:underline break-all transition-opacity" onClick={(e) => e.stopPropagation()}>
            {part}
          </a>
        );
      }

      // Mention match
      if (part.startsWith('@') && mentions) {
        const mention = mentions.find(m => `@${m.display_name}` === part || `@${m.phone_normalized}` === part);
        if (mention) {
          return (
            <span key={i} className="text-indigo-600 font-black cursor-pointer hover:bg-indigo-50 px-1 rounded transition-colors" title={mention.phone_normalized}>
              {part}
            </span>
          );
        }
      }

      return <span key={i}>{part}</span>;
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedChat || !activeInstanceName) return;

    const textToSend = inputMessage;
    setInputMessage(''); // optimistic clear
    
    // Add optimistic message to the view immediately
    const optimisticMsg: any = {
      id: 'temp-' + Date.now(),
      body: textToSend,
      renderedBody: textToSend,
      fromMe: true,
      timestamp: Math.floor(Date.now() / 1000),
      media: { hasMedia: false, url: null, status: 'none' },
      authorName: 'Me',
      authorPhone: '',
      senderName: 'Me',
      senderPhone: '',
      type: 'chat',
      mentions: [],
      isGroup: isGroup,
      __normalized: true // Blindagem: evita que adapters tentem re-normalizar
    };
    setMessages(prev => [...prev, optimisticMsg as any]);

    try {
      if (selectedChat.isInstagram) {
        // Envia via Instagram API
        // Nota: recipientUsers espera array de IDs. Usamos o ID do usuário da conversa.
        await instagramApi.direct.send(selectedChat.accountId, {
          recipientUsers: [selectedChat.id.user],
          text: textToSend
        });
      } else {
        // Envia via WhatsApp
        await whatsappService.sendMessage(selectedChat.id._serialized, textToSend, activeInstanceName);
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex flex-col bg-[#F9FAFB] items-center justify-center text-slate-400">
        <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-4">
          <Search size={24} className="text-slate-300" />
        </div>
        <p className="font-bold text-slate-600">Selecione uma conversa</p>
        <p className="text-xs mt-1 text-slate-500">Clique em um contato na coluna esquerda para ver as mensagens</p>
      </div>
    );
  }

  const isGroup = selectedChat.isGroup;
  const rawNumber = getCleanNumber(selectedChat);
  const name = selectedChat.name || rawNumber;

  return (
    <div className="flex-1 flex flex-col bg-[#F9FAFB] min-w-0">
      {/* Header do Chat Ativo */}
      <div className="h-20 px-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-sm z-10 sticky top-0">
        {/* Info Direita (Contato) */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center border-2 border-slate-100 shadow-sm transition-transform hover:scale-105",
              isGroup ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
            )}>
              {selectedChat.profilePic ? (
                <img src={selectedChat.profilePic} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                isGroup ? <Users size={24} /> : <User size={24} />
              )}
            </div>
            {/* Status Indicator (Sempre "Online/Disponível" como mock CRM) */}
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full z-10 shadow-sm ring-2 ring-emerald-500/20"></div>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-[17px] mb-0.5 tracking-tight flex items-center gap-2">
              {name}
              {selectedChat.isFavorite && (
                <Star size={16} fill="#fbbf24" className="text-amber-400" />
              )}
            </h3>
            <div className="flex items-center gap-2">
              {!isGroup ? (
                (() => {
                  const formattedPhone = getFormattedPhone(selectedChat);
                  return formattedPhone ? (
                    <div 
                      className="group flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-500 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer select-none" 
                      title="Copiar número" 
                      onClick={() => {
                        navigator.clipboard.writeText(formattedPhone);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      {copied ? (
                        <span className="text-emerald-600">Copiado ✓</span>
                      ) : (
                        <>
                          <Phone size={10} className="opacity-70 group-hover:opacity-100" /> {formattedPhone}
                        </>
                      )}
                    </div>
                  ) : null; // LID/sistema — não exibe telefone
                })()
              ) : (
                <span className="flex items-center gap-1 text-[11px] bg-indigo-50 text-indigo-700 font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm border border-indigo-100/50">
                  <Users size={12} className="opacity-70" /> Grupo Fluo OS
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions (Botões Auxiliares) */}
        <div className="flex items-center gap-1.5 opacity-90">
           <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="Início de Chamada (Em Breve)">
              <Video size={18} strokeWidth={2.5} />
           </button>
           <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors" title="Ligação de Voz (Em Breve)">
              <PhoneCall size={18} strokeWidth={2.5} />
           </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            {onToggleFavorite && (
              <button 
                onClick={() => onToggleFavorite(selectedChat.id._serialized, selectedChat.isFavorite)}
                className={cn(
                  "w-10 h-10 flex items-center justify-center rounded-full transition-all",
                  selectedChat.isFavorite 
                    ? "text-amber-500 bg-amber-50 shadow-inner" 
                    : "text-slate-400 hover:text-amber-500 hover:bg-amber-50"
                  )} 
                title={selectedChat.isFavorite ? "Remover dos Favoritos" : "Marcar como Favorito"}
              >
                <Star size={18} fill={selectedChat.isFavorite ? "currentColor" : "none"} strokeWidth={2.5} />
              </button>
            )}
            <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors" title="Buscar nesta conversa">
              <Search size={18} strokeWidth={2.5} />
           </button>
           <button className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors" title="Mais Opções">
              <MoreVertical size={18} strokeWidth={2.5} />
           </button>
        </div>
      </div>

      {/* Container das Mensagens */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-slate-50/30">
        {loadingMessages ? (
           <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
           </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-full mb-4 text-amber-500 shadow-sm">
              <AlertCircle size={24} />
            </div>
            <h4 className="text-base font-bold text-slate-700">Comece a conversa</h4>
            <p className="text-xs font-medium text-slate-500 mt-1 max-w-xs leading-relaxed">As mensagens serão salvas automaticamente e refletidas aqui e no WhatsApp.</p>
          </div>
        ) : (
          sortedMessages.map((msg, index) => {
            const isMe = msg.fromMe;
            const messageText = msg.body; // Use original body to let render function handle mentions
            const mentions = msg.mentions_json || [];
            const hasMedia = msg.media?.hasMedia;

            // [IDENTITY-SAFE] Resolução segura de nome do autor
            // Nunca exibe ID bruto, número puro ou JID como nome humano.
            const resolveAuthorDisplay = (): string => {
              // 1. authorName se for nome humano real
              if (isDisplayableHumanName(msg.authorName)) return msg.authorName!;
              // 2. senderName se for nome humano real
              if (isDisplayableHumanName(msg.senderName)) return msg.senderName!;
              // 3. notifyName/pushname se for nome humano real
              if (isDisplayableHumanName(msg.notifyName)) return msg.notifyName!;
              if (isDisplayableHumanName((msg as any).pushname)) return (msg as any).pushname;
              // 4. Fallback seguro — telefone formatado em vez de "Participante"
              const phone = msg.authorPhone || msg.senderPhone;
              return phone ? `+${phone}` : 'Participante';
            };
            const author = resolveAuthorDisplay();
            
            return (
              <motion.div 
                key={msg.id?.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex flex-col w-full max-w-[75%] relative mb-[12px]", isMe ? "ml-auto items-end" : "mr-auto items-start")}
              >
                {/* Name tag in groups (if not me) */}
                {!isMe && isGroup && (
                  <span className="text-[14px] font-semibold text-[#0F172A] ml-2 mb-1 truncate max-w-[200px]">
                     {author || "Participante"}
                  </span>
                )}
                
                {/* Bubble */}
                <div className={cn(
                  "px-[14px] py-[10px] rounded-[16px] relative group shadow-sm transition-all hover:brightness-[0.98]",
                  isMe 
                    ? "bg-[#DCFCE7] text-[#1E293B] rounded-tr-none border border-emerald-100/30" 
                    : "bg-white border border-[#E2E8F0] text-[#1E293B] rounded-tl-none"
                )}>
                  {msg.quotedMsg && (
                    <div className={cn(
                      "mb-3 p-3 rounded-xl text-xs border-l-4 opacity-95 shadow-inner transition-all hover:bg-opacity-80 cursor-pointer",
                      isMe ? "bg-emerald-600/40 border-emerald-300 text-emerald-50" : "bg-slate-50 border-indigo-500 text-slate-600"
                    )}>
                      <div className="font-black mb-1.5 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider">
                        <span className="flex items-center gap-1.5 text-current">
                          <Reply size={12} strokeWidth={3} /> {msg.quotedMsg.authorName}
                        </span>
                        {msg.quotedMsg.isGroup && <span className="text-[9px] opacity-60 font-bold bg-black/5 px-1.5 py-0.5 rounded">Grupo</span>}
                      </div>
                      <div className="line-clamp-3 text-[11px] leading-relaxed italic opacity-90">
                        {msg.quotedMsg.fullText || msg.quotedMsg.body || (
                          <span className="flex items-center gap-1.5 opacity-70">
                            <ImageIcon size={12} /> Mídia/Arquivo
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                   {/* Media Content */}
                   {(() => {
                      const mUrl = msg.media?.url || (msg as any).media_url;
                      const mediaStatus = msg.media?.status || (msg as any).media_status;
                      const hasMedia = msg.media?.hasMedia || !!mUrl || mediaStatus === 'on-demand';
                      
                      if (!hasMedia) return null;
                      
                      // Caso 1: Mídia disponível (Ready)
                      if (mUrl && mediaStatus !== 'on-demand') {
                        const isViewOnce = msg.quotedMsg?.is_view_once || msg._data?.isViewOnce || msg.type === 'view_once';
                        
                        return (
                          <div className="mb-3 rounded-xl overflow-hidden border border-slate-100/50 bg-black/5 min-w-[200px] relative">
                            {isViewOnce && (
                              <div className="absolute top-2 left-2 bg-rose-500/90 backdrop-blur-sm text-white text-[10px] font-black tracking-wider px-2 py-1 rounded shadow-lg z-10 flex items-center gap-1.5 pointer-events-none">
                                <EyeOff size={12} strokeWidth={2.5} /> <span className="uppercase">View Once Interceptado</span>
                              </div>
                            )}
                            {mUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <img src={mUrl} alt="Mídia" className="max-w-full h-auto cursor-zoom-in hover:opacity-95 transition-opacity" onClick={() => window.open(mUrl, '_blank')} />
                            ) : mUrl.match(/\.(ogg|mp3|wav|m4a)$/i) || msg.type === 'audio' || msg.type === 'ptt' ? (
                              <div className="p-2 bg-slate-50 rounded-lg">
                                 <audio controls className="w-full h-8 scale-[0.85] origin-left">
                                   <source src={mUrl} type="audio/ogg" />
                                   Áudio
                                 </audio>
                              </div>
                            ) : (
                              <div className="p-3 flex items-center gap-3 hover:bg-slate-100/50 transition-colors cursor-pointer" onClick={() => window.open(mUrl, '_blank')}>
                                <div className="w-10 h-10 bg-black/10 rounded-lg flex items-center justify-center text-current opacity-80">
                                   <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold truncate">{msg.media?.filename || 'Arquivo em Anexo'}</p>
                                  <p className="text-[10px] opacity-70">Clique para abrir</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Caso 2: Mídia Sob Demanda (Grupos)
                      if (mediaStatus === 'on-demand') {
                        const isDownloading = isRetrievingMedia === msg.message_id;
                        return (
                          <div className="mb-3 p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-3 min-w-[220px]">
                             <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-400">
                                {msg.type === 'image' ? <ImageIcon size={24} /> : <FileText size={24} />}
                             </div>
                             <div className="text-center">
                                <p className="text-[12px] font-bold text-slate-700">Mídia em Grupo</p>
                                <p className="text-[10px] text-slate-500">Clique para baixar e visualizar</p>
                             </div>
                             <button 
                                onClick={() => handleRetrieveMedia(msg)}
                                disabled={isDownloading}
                                className={cn(
                                  "px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shadow-sm",
                                  isDownloading 
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                                    : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
                                )}
                             >
                                {isDownloading ? (
                                  <span className="flex items-center gap-2">
                                     <div className="w-3 h-3 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                                     Baixando...
                                  </span>
                                ) : (
                                  "Baixar Agora"
                                )}
                             </button>
                          </div>
                        );
                      }

                      return null;
                   })()}

                  {msg.media?.hasMedia && msg.media?.status === 'pending' && (
                    <div className="flex items-center justify-center gap-2 mb-2 text-[11px] opacity-60 italic font-medium p-2.5 bg-slate-100/50 rounded-lg">
                      <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                      Preparando fila de mídia...
                    </div>
                  )}

                  {msg.media?.hasMedia && msg.media?.status === 'processing' && (
                    <div className="flex items-center justify-center gap-2 mb-2 text-[11px] text-indigo-600 italic font-bold p-2.5 bg-indigo-50 rounded-lg shadow-inner w-full min-w-[200px]">
                      <div className="w-3.5 h-3.5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
                      Baixando mídia...
                    </div>
                  )}
                  
                  {msg.media?.hasMedia && msg.media?.status === 'failed' && (
                    <div className="flex items-start gap-2 mb-2 text-xs text-rose-500 italic p-3 bg-rose-50 border border-rose-100 rounded-lg relative group cursor-help min-w-[200px]">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <div className="flex-1">
                         <span className="font-bold flex items-center justify-between w-full">
                           Sem acesso à mídia local
                         </span>
                         {msg.media?.error && (
                            <div className="text-[10px] opacity-80 mt-1 leading-tight break-all font-mono whitespace-normal max-w-full truncate group-hover:whitespace-normal group-hover:break-words">
                               {msg.media?.error}
                            </div>
                         )}
                      </div>
                    </div>
                  ) /* Fim Media */}
                  
                  {/* Se FOR vCard, engole e plota o Card */}
                  {(msg.type === 'vcard' || msg.type === 'contact' || msg.type === 'contact_card') ? (
                    <ContactCardMessage 
                       vcardName={msg.vcardName || null} 
                       vcardPhone={msg.vcardPhone || null} 
                       rawBody={messageText} 
                    />
                  ) : messageText ? (
                    <>
                      <p className="text-[16px] whitespace-pre-wrap word-break wrap-break-word leading-[1.6] font-medium text-[#1E293B] tracking-tight">
                        {renderMessageTextWithLinks(messageText, mentions)}
                      </p>
                      
                      {/* --- 🏎️ TRADUÇÃO LAMBORGHINI (Fase 2) --- */}
                      {(msg as any).translated_content && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100/10 bg-slate-50/10 rounded-lg p-2">
                           <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 opacity-70">
                              <Globe size={10} strokeWidth={3} /> Traduzido pela IA ({(msg as any).detected_language || '?'})
                           </div>
                           <p className="text-[14px] italic text-slate-500 leading-relaxed">
                              {(msg as any).translated_content}
                           </p>
                        </div>
                      )}
                    </>
                  ) : null}
                  
                  <div className={cn(
                    "text-[12px] flex items-center gap-1 font-medium select-none mt-1.5 justify-end",
                    isMe ? "text-[#94A3B8]" : "text-[#94A3B8]"
                  )}>
                    {formatTimestamp(msg.timestamp)}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Composer Fixo */}
      {selectedChat.isNewsletter ? (
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-center text-slate-500 gap-2 shrink-0">
          <Megaphone size={16} />
          <span className="text-sm font-bold uppercase tracking-widest">Este é um canal unidirecional. Apenas leitura.</span>
        </div>
      ) : (
        <form onSubmit={handleSendMessage} className="p-5 bg-white border-t border-slate-200 shrink-0 sticky bottom-0">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            {/* Anexos */}
            <div className="flex items-center gap-1 pb-1">
              <input type="file" accept="image/*,video/*" ref={imageInputRef} hidden onChange={handleMediaSelect} />
              <input type="file" ref={fileInputRef} hidden onChange={handleMediaSelect} />
              
              <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Enviar Imagem">
                <ImageIcon size={20} />
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Enviar Arquivo">
                <FileText size={20} />
              </button>
              <button type="button" onClick={toggleAudioRecording} className={cn("p-2.5 rounded-xl transition-all", isRecording ? "bg-rose-100 text-rose-600 animate-pulse relative" : "text-slate-400 hover:text-orange-600 hover:bg-orange-50")} title={isRecording ? "Parar e Enviar Áudio" : "Gravar Áudio"}>
                {isRecording && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>}
                <Mic size={20} />
              </button>
            </div>

            <div className="flex-1 relative">
              {isRecording ? (
                 <div className="w-full bg-rose-50 border border-rose-200 rounded-2xl px-5 h-[56px] flex items-center justify-between transition-all">
                   <div className="flex items-center gap-3 text-rose-600 font-bold text-sm">
                      <div className="flex items-center gap-2">
                         <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                         Gravando Áudio...
                      </div>
                   </div>
                   <div className="font-mono text-rose-500 font-bold">
                      {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
                   </div>
                 </div>
              ) : (
                  <textarea
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    placeholder="Escreva uma mensagem..."
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 rounded-[12px] px-[14px] py-[12px] text-[15px] font-medium outline-none transition-all resize-none min-h-[48px] max-h-[150px] shadow-sm scrollbar-hide"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (inputMessage.trim()) handleSendMessage(e);
                      }
                    }}
                  />
              )}
            </div>
            
            {isRecording ? (
              <button 
                type="button" 
                onClick={toggleAudioRecording}
                className="mb-1 bg-emerald-500 hover:bg-emerald-600 text-white w-14 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0 shadow-lg shadow-emerald-200/50"
              >
                <Send size={20} className="translate-x-0.5" />
              </button>
            ) : (
              <button 
                type="submit"
                disabled={!inputMessage.trim()}
                className="mb-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white w-14 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0 shadow-lg shadow-emerald-200/50"
              >
                <Send size={20} className={inputMessage.trim() ? "translate-x-0.5" : ""} />
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
