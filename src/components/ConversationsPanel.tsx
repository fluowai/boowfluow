import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { whatsappService } from '../services/whatsapp';
import { InstanceConnectionState } from '../types/chat';
import * as whatsappDb from '../services/whatsappDb';

// Novas importações modulares
import { ConversationsSidebar } from './chat/ConversationsSidebar';
import { ChatContainer } from './chat/ChatContainer';
import { ContactDetailsPanel } from './chat/ContactDetailsPanel';
import { toCanonicalMessage, mergeMessages, isDisplayableHumanName } from '../lib/messageAdapter';

interface ConversationsPanelProps {
  instances: InstanceConnectionState[];
}

export function ConversationsPanel({ instances }: ConversationsPanelProps) {
  const [selectedInstance, setSelectedInstance] = useState<string>(instances.find(i => i.status === 'connected')?.instanceId || '');
  const [chats, setChats] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [selectedChat, setSelectedChat] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive connected instance once without dependency on instances reference
  const connectedInstance = useMemo(() => 
    instances.find(i => i.status === 'connected'),
    [instances.length, ...instances.map(i => i.instanceId + i.status)]
  );

  useEffect(() => {
    if (!selectedInstance && connectedInstance) {
      setSelectedInstance(connectedInstance.instanceId);
    }
  }, [selectedInstance, connectedInstance?.instanceId]);

  const activeInstanceId = selectedInstance;
  const activeInstance = instances.find(i => i.instanceId === selectedInstance);
  const activeInstanceName = activeInstance?.instanceName || 'default';
  const activeInstanceStatus = activeInstance?.status || 'idle';

  const loadChatsRef = useRef<() => void>(() => {});

  // Carregar lista de chats e metadados
  useEffect(() => {
    if (!activeInstanceName || !activeInstanceId) return;
    
    async function loadChats() {
      setLoadingChats(true);
      try {
        // 1. [INSTANTÂNEO] Carrega do Cache do Supabase (WhatsApp + Instagram)
        const [whatsappChats, instagramChats] = await Promise.all([
          whatsappDb.getChatsFromSupabase(activeInstanceId),
          whatsappDb.getInstagramChatsFromSupabase()
        ]);
        
        // 2. Carrega Metadados (Favoritos)
        const metadataRes = await whatsappService.getChatMetadata(activeInstanceName);
        const metadataMap = new Map();
        if (metadataRes.success && metadataRes.metadata) {
          metadataRes.metadata.forEach((m: any) => metadataMap.set(m.jid, m));
        }

        const enrichWithMetadata = (chatList: any[]) => {
          return chatList.map(c => ({
            ...c,
            isFavorite: metadataMap.get(c.id._serialized)?.is_favorite || false,
            customName: metadataMap.get(c.id._serialized)?.custom_name || null
          }));
        };

        const totalChats = [...whatsappChats, ...instagramChats];

        if (totalChats.length > 0) {
          setChats(enrichWithMetadata(totalChats));
          setLoadingChats(false);
        }

        // 3. [BACKGROUND] Atualiza do Device apenas se estiver conectado
        if (activeInstanceStatus === 'connected') {
          try {
            const res = await whatsappService.getChats(activeInstanceName);
            if (res.success && res.chats) {
              const enriched = enrichWithMetadata([...res.chats, ...instagramChats]);
              
              // [PUSHNAME-MERGE] Preserva pushnames do cache DB quando o device traz telefone formatado
              const cachedNameMap = new Map<string, string>();
              whatsappChats.forEach(c => {
                if (c.pushname && isDisplayableHumanName(c.pushname)) {
                  cachedNameMap.set(c.id._serialized, c.pushname);
                } else if (c.name && isDisplayableHumanName(c.name)) {
                  cachedNameMap.set(c.id._serialized, c.name);
                }
              });
              
              const mergedChats = enriched.map((deviceChat: any) => {
                if (deviceChat.isInstagram) return deviceChat;
                const jid = deviceChat.id?._serialized;
                const cachedName = jid ? cachedNameMap.get(jid) : null;
                
                if (cachedName && !isDisplayableHumanName(deviceChat.name)) {
                  return { ...deviceChat, name: cachedName };
                }
                return deviceChat;
              });
              
              setChats(mergedChats.sort((a: any, b: any) => {
                // Prioridade 1: Favoritos
                if (a.isFavorite && !b.isFavorite) return -1;
                if (!a.isFavorite && b.isFavorite) return 1;
                // Prioridade 2: Timestamp
                return b.timestamp - a.timestamp;
              }));
            }
          } catch (deviceErr) {
            console.warn("Ignorando falha no device ao consultar chats:", deviceErr);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar chats:", err);
      } finally {
        setLoadingChats(false);
      }
    }

    loadChatsRef.current = loadChats;
    loadChats();
  }, [selectedInstance, activeInstanceName, activeInstanceStatus, activeInstanceId]);

  const handleToggleFavorite = async (jid: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      // Atualização Otimista UI
      setChats(prev => prev.map(c => c.id._serialized === jid ? { ...c, isFavorite: newStatus } : c).sort((a: any, b: any) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return b.timestamp - a.timestamp;
      }));
      
      // Persistência no Banco
      await whatsappService.updateChatMetadata(jid, newStatus, null, activeInstanceName);
    } catch (err) {
      console.error("Erro ao alternar favorito:", err);
    }
  };

  const handleManualRefresh = async () => {
    if (!activeInstanceName) return;
    try {
      setLoadingChats(true);
      // Força a sincronização bruta via API
      await whatsappService.syncInstance(activeInstanceName);
    } catch(e) {
      console.error("Erro no sync manual:", e);
    } finally {
      // Recarrega a UI de qualquer forma
      if (loadChatsRef.current) loadChatsRef.current();
    }
  };

  // Carregar mensagens quando um chat for selecionado
  useEffect(() => {
    if (!selectedChat) return;
    
    const isInstagram = !!selectedChat.isInstagram;
    if (!isInstagram && (!activeInstanceName || !activeInstanceId)) return;

    async function loadMessages() {
      setLoadingMessages(true);
      try {
        if (isInstagram) {
          // 1. [INSTANTÂNEO] Carrega do Supabase (Instagram)
          const history = await whatsappDb.getInstagramMessagesFromSupabase(selectedChat.id._serialized, 200);
          setMessages(history);
        } else {
          // 1. [INSTANTÂNEO] Carrega do Supabase (WhatsApp)
          const history = await whatsappDb.getMessagesFromSupabase(activeInstanceId, selectedChat.id._serialized, 200);
          setMessages(history);
          
          // 2. [BACKGROUND] Carrega do Device (WhatsApp)
          const res = await whatsappService.getMessages(selectedChat.id._serialized, activeInstanceName, 200);
          if (res.success && res.messages) {
            const merged = mergeMessages(history, res.messages);
            setMessages(merged);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar mensagens:", err);
      } finally {
        setLoadingMessages(false);
      }
    }
    
    loadMessages();
  }, [selectedChat, activeInstanceName, activeInstanceId]);

  // Scroll pro final do chat sempre que mensagens mudarem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ref síncrono para o chat aberto: evita refazer subscribe no WebSocket toda vez que você clica em um chat
  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Socket.io Realtime Listener (Arquitetura 3 Camadas)
  const handleNewMessage = useCallback((data: any) => {
    // Regra de Ouro: Checagem Segura e Normalizada de Nomes
    const payloadInstance = data.instanceId?.toLowerCase();
    const currentInstance = activeInstanceName.toLowerCase();
    if (payloadInstance && payloadInstance !== currentInstance) return;
    
    // O payoff agora é o próprio objeto canônico (Arquitetura 3 Camadas)
    const normalizedMsg = toCanonicalMessage(data);
    if (!normalizedMsg) return;

    const msgJid = normalizedMsg.remoteJid;
    
    const currentSelectedJid = selectedChatRef.current?.id?._serialized;

    // 1. Atualiza Mensagens da Conversa Aberta
    if (currentSelectedJid === msgJid) {
      setMessages(prev => {
        // Se já existe, ignora (evita duplicidade do socket vs otimista)
        if (prev.find(m => m.id === normalizedMsg.id)) return prev;
        
        if (normalizedMsg.fromMe) {
          const tempIndex = prev.findIndex(m => 
            typeof m.id === 'string' && m.id.startsWith('temp-') && m.body === normalizedMsg.body
          );
          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = normalizedMsg;
            return updated;
          }
        }
        
        const newMessages = [...prev, normalizedMsg];
        return newMessages.sort((a, b) => a.timestamp - b.timestamp);
      });
    }
    
    // 2. Sidebar Dispatcher: Atualiza Lista Lateral (chats) e Reordena
    setChats(prevChats => {
      const chatIndex = prevChats.findIndex(c => c.id._serialized === msgJid);
      const updatedChats = [...prevChats];

      const isCurrentlyOpen = currentSelectedJid === msgJid;

      if (chatIndex !== -1) {
        const chat = { ...updatedChats[chatIndex] };
        
        // Atualiza dados da última mensagem
        chat.lastMessage = normalizedMsg;
        chat.timestamp = normalizedMsg.timestamp;
        
        // Incrementa não lidas se não for minha e não estiver com o chat aberto lendo ativamente
        if (!normalizedMsg.fromMe && !isCurrentlyOpen) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }

        // Move para o topo
        updatedChats.splice(chatIndex, 1);
        updatedChats.unshift(chat);
      } else {
        // Caso a conversa não esteja na lista (ex: nova conversa inédita), adota formato genérico
        // [V3-FIX] Previne que JIDs @lid exibam hashes como nome do chat
        const rawUser = msgJid.split('@')[0];
        const isLid = msgJid.includes('@lid');
        
        // Cascata de nome: senderName humano → authorName humano → phone formatado → label genérico
        let chatName = '';
        if (normalizedMsg.senderName && isDisplayableHumanName(normalizedMsg.senderName)) {
          chatName = normalizedMsg.senderName;
        } else if (normalizedMsg.authorName && isDisplayableHumanName(normalizedMsg.authorName)) {
          chatName = normalizedMsg.authorName;
        } else if (!isLid && rawUser.length <= 15) {
          chatName = `+${rawUser}`;
        } else {
          chatName = 'Contato';
        }
        
        const newChat = {
          id: { _serialized: msgJid, user: rawUser },
          isGroup: msgJid.includes('@g.us'),
          isNewsletter: msgJid.includes('@newsletter'),
          name: chatName,
          unreadCount: normalizedMsg.fromMe || isCurrentlyOpen ? 0 : 1,
          timestamp: normalizedMsg.timestamp,
          lastMessage: normalizedMsg,
          profilePic: null
        };
        
        updatedChats.unshift(newChat);
        console.log(`[Socket/Forense] Injetado novo chat dinamicamente para o JID: ${msgJid} (name: ${chatName})`);
      }

      return updatedChats;
    });
  }, [activeInstanceName, setMessages, setChats]);

  // [NOVO] Listener para Enriquecimento Progressivo (Qualidade que aparece depois)
  const handleMessageUpdate = useCallback((data: any) => {
    const payloadInstance = data.instanceId?.toLowerCase();
    if (payloadInstance && payloadInstance !== activeInstanceName.toLowerCase()) return;
    
    const currentSelectedJid = selectedChatRef.current?.id?._serialized;
    if (data.chatId !== currentSelectedJid && data.jid !== currentSelectedJid) return;

    const enrichedMsg = data.message;
    if (!enrichedMsg) return;

    setMessages(prev => {
      const index = prev.findIndex(m => m.id === enrichedMsg.id || m.id === data.messageId);
      if (index === -1) return prev; // Não temos essa mensagem na lista atual
      
      const newMessages = [...prev];
      newMessages[index] = enrichedMsg; // Substitui pela versão com alta qualidade
      return newMessages;
    });
  }, [activeInstanceName, setMessages]);

  // [NOVO] Listener específico e veloz para Atualizações de Status de Mídia da Fila Assíncrona
  const handleMediaUpdate = useCallback((data: any) => {
    const currentSelectedJid = selectedChatRef.current?.id?._serialized;
    if (data.chatId !== currentSelectedJid) return;

    setMessages(prev => {
      const index = prev.findIndex(m => m.id === data.messageId || m.id === data.waMessageId || m.raw?.id?._serialized === data.waMessageId || m.raw?.message_id === data.messageId);
      if (index === -1) return prev;

      const newMessages = [...prev];
      const updatedMsg = { ...newMessages[index] };
      
      // Garante que o objeto media existe e atualiza as chaves
      updatedMsg.media = {
        ...(updatedMsg.media || {}),
        status: data.mediaStatus,
        url: data.mediaUrl || updatedMsg.media?.url,
        error: data.mediaError,
        hasMedia: true
      };

      newMessages[index] = updatedMsg;
      return newMessages;
    });
  }, [setMessages]);

  const handleContactUpdate = useCallback((data: any) => {
    const payloadInstance = data.instanceId?.toLowerCase();
    if (payloadInstance && payloadInstance !== activeInstanceName.toLowerCase()) return;

    setChats(prevChats => {
      const index = prevChats.findIndex(c => c.id._serialized === data.jid);
      if (index === -1) return prevChats;

      const updatedChats = [...prevChats];
      const chat = { ...updatedChats[index] };
      
      // [PUSHNAME-MERGE] Usa isDisplayableHumanName para decidir se atualiza
      const newName = data.name || data.pushname;
      const currentNameIsHuman = isDisplayableHumanName(chat.name);
      const newNameIsHuman = isDisplayableHumanName(newName);
      
      // Atualiza se: nome novo é humano E (nome atual não é humano OU nome novo é diferente/melhor)
      if (newNameIsHuman && (!currentNameIsHuman || !chat.name)) {
        chat.name = newName;
        chat.pushname = data.pushname || chat.pushname;
        chat.identityQuality = data.identityQuality || 'rich';
        if (data.profilePic) chat.profilePic = data.profilePic;
        
        updatedChats[index] = chat;
        console.log(`[Socket/Identity] Sidebar enriched: ${data.jid} -> ${chat.name}`);
      }
      
      return updatedChats;
    });
  }, [activeInstanceName, setChats]);

  useEffect(() => {
    if (!activeInstanceName) return;

    // Inscrição dos Listeners da Arquitetura 3 Camadas
    whatsappService.on('message:new', handleNewMessage);
    whatsappService.on('message:update', handleMessageUpdate);
    whatsappService.on('message:media_update', handleMediaUpdate);
    whatsappService.on('contact:update', handleContactUpdate);

    return () => {
      // Limpeza robusta contra Zombies
      whatsappService.off('message:new', handleNewMessage);
      whatsappService.off('message:update', handleMessageUpdate);
      whatsappService.off('message:media_update', handleMediaUpdate);
      whatsappService.off('contact:update', handleContactUpdate);
    };
  }, [activeInstanceName, handleNewMessage, handleMessageUpdate, handleMediaUpdate, handleContactUpdate]);

  return (
    <div className="flex bg-white shadow-sm overflow-hidden h-[calc(100vh-64px)] w-full absolute inset-0 pt-16" style={{ zIndex: 0 }}>
      {/* Coluna 1: Sidebar de Chats (Largura Fixa 350px) */}
      <div className="w-[350px] min-w-[350px] h-full flex shrink-0">
        <ConversationsSidebar 
          instances={instances}
          selectedInstance={selectedInstance}
          setSelectedInstance={setSelectedInstance}
          chats={chats}
          loadingChats={loadingChats}
          activeInstanceStatus={activeInstanceStatus}
          selectedChat={selectedChat}
          setSelectedChat={setSelectedChat}
          onRefresh={handleManualRefresh}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>

      {/* Coluna 2: Chat Principal (50%) */}
      <ChatContainer 
        selectedChat={selectedChat}
        activeInstanceName={activeInstanceName}
        messages={messages}
        setMessages={setMessages}
        loadingMessages={loadingMessages}
        messagesEndRef={messagesEndRef}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Coluna 3: Painel CRM Lateral Rigth (25%) */}
      <ContactDetailsPanel 
        chat={selectedChat}
        instanceId={selectedInstance}
      />
    </div>
  );
}
