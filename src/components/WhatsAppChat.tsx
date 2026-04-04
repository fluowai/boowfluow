import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  MoreVertical, 
  Phone, 
  Video, 
  Search, 
  X,
  Check,
  CheckCheck,
  Clock,
  Image,
  File,
  Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useWhatsApp, ChatContact, ChatMessage } from '../hooks/useWhatsApp';
import { QRCodeModal } from './QRCodeModal';

export function WhatsAppChat() {
  const {
    isConnected,
    connectionInfo,
    qrCode,
    chats,
    messages,
    loading,
    error,
    connect,
    disconnect,
    sendMessage,
    loadChats,
  } = useWhatsApp();

  const [selectedChat, setSelectedChat] = useState<ChatContact | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isConnected) {
      loadChats();
    }
  }, [isConnected, loadChats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedChat]);

  useEffect(() => {
    if (qrCode) {
      setShowQRModal(true);
    }
  }, [qrCode]);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedChat) return;
    
    try {
      await sendMessage(selectedChat.jid, inputText);
      setInputText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredChats = chats.filter((chat) =>
    chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.pushName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentMessages = selectedChat ? messages.get(selectedChat.jid) || [] : [];

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            WhatsApp não conectado
          </h2>
          <p className="text-slate-500 mb-6">
            Conecte sua conta do WhatsApp para começar a conversar com seus clientes.
          </p>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          <button
            onClick={() => connect()}
            disabled={loading}
            className={cn(
              "px-6 py-3 rounded-xl font-medium text-white transition-all",
              "bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 animate-spin" />
                Conectando...
              </span>
            ) : (
              'Conectar WhatsApp'
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white">
      <div className={cn(
        "w-80 border-r border-slate-200 flex flex-col",
        selectedChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Conversas</h2>
            <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.jid}
                onClick={() => setSelectedChat(chat)}
                className={cn(
                  "flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors",
                  selectedChat?.jid === chat.jid && "bg-slate-100"
                )}
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-700 font-bold text-lg">
                    {chat.name?.[0]?.toUpperCase() || chat.pushName?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-slate-900 truncate">
                      {chat.name || chat.pushName || 'Desconhecido'}
                    </span>
                    {chat.lastMessage?.timestamp && (
                      <span className="text-xs text-slate-400">
                        {formatTime(chat.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate">
                    {chat.lastMessage?.message || 'Inicie uma conversa'}
                  </p>
                </div>
                {chat.unreadCount && chat.unreadCount > 0 && (
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-medium">{chat.unreadCount}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span>Conectado como {connectionInfo.pushName || 'WhatsApp'}</span>
          </div>
        </div>
      </div>

      <div className={cn(
        "flex-1 flex flex-col",
        !selectedChat && "hidden md:flex"
      )}>
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-slate-200 flex items-center gap-4">
              <button
                onClick={() => setSelectedChat(null)}
                className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-emerald-700 font-bold">
                  {selectedChat.name?.[0]?.toUpperCase() || selectedChat.pushName?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">
                  {selectedChat.name || selectedChat.pushName || 'Desconhecido'}
                </h3>
                <p className="text-xs text-slate-500">{selectedChat.jid}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Phone className="w-5 h-5 text-slate-500" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Video className="w-5 h-5 text-slate-500" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <div className="max-w-lg mx-auto space-y-2">
                {currentMessages.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    Nenhuma mensagem ainda. Envie uma mensagem para iniciar a conversa!
                  </div>
                ) : (
                  currentMessages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex",
                        message.fromMe ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-xs px-4 py-2 rounded-2xl",
                        message.fromMe
                          ? "bg-emerald-500 text-white rounded-br-md"
                          : "bg-white text-slate-900 rounded-bl-md shadow-sm"
                      )}>
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                        <div className={cn(
                          "flex items-center justify-end gap-1 mt-1",
                          message.fromMe ? "text-emerald-100" : "text-slate-400"
                        )}>
                          <span className="text-xs">{formatTime(message.timestamp)}</span>
                          {message.fromMe && (
                            message.id.startsWith('BAE') ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex items-end gap-2 max-w-4xl mx-auto">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Smile className="w-5 h-5 text-slate-500" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <Image className="w-5 h-5 text-slate-500" />
                </button>
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <File className="w-5 h-5 text-slate-500" />
                </button>
                <div className="flex-1 relative">
                  <textarea
                    placeholder="Digite uma mensagem..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    rows={1}
                    className="w-full px-4 py-3 bg-slate-100 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    style={{ maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className={cn(
                    "p-3 rounded-xl transition-all",
                    inputText.trim()
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-400"
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500">Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>

      <QRCodeModal
        qrCode={qrCode}
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
      />
    </div>
  );
}
