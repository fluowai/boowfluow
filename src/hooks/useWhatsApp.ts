import { useState, useEffect, useCallback, useRef } from 'react';
import { whatsappService } from '../services/whatsapp';
import { toCanonicalMessage } from '../lib/messageAdapter';
import { InstanceConnectionState } from '../types/chat';

export interface ChatContact {
  jid: string;
  name?: string;
  pushName?: string;
  imgUrl?: string;
  unreadCount?: number;
  lastMessage?: {
    message?: string;
    timestamp?: number;
  };
}

export interface ChatMessage {
  id: string;
  jid: string;
  text: string;
  fromMe: boolean;
  timestamp: number;
  pushName?: string;
}

export function useWhatsApp(instanceName: string = 'default') {
  const [connectionInfo, setConnectionInfo] = useState<InstanceConnectionState | null>(null);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [chats, setChats] = useState<ChatContact[]>([]);
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const status = await whatsappService.getStatus(instanceName);
      setConnectionInfo(status);
    } catch (err) {
      console.error('Failed to check status:', err);
    }
  }, [instanceName]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    pollingIntervalRef.current = setInterval(checkStatus, 10000); // Polling menos agressivo agora que temos snapshots no subscribe
  }, [checkStatus]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    whatsappService.connect();
    whatsappService.subscribeToInstance(instanceName);
    startPolling();

    // Snapshot Handler (Coração da Estabilização)
    const handleStatus = (status: InstanceConnectionState) => {
      if (status.instanceName !== instanceName) return;
      console.log(`[useWhatsApp][${instanceName}] Snapshot Received:`, status.status);
      setConnectionInfo(status);
    };

    const handleQr = ({ instanceId, qr, qrVersion }: { instanceId: string; qr: string, qrVersion: number }) => {
      if (instanceId !== instanceName) return;
      console.log(`[useWhatsApp][${instanceName}] QR Received (v${qrVersion})`);
      setConnectionInfo(prev => prev ? { ...prev, qr, qrVersion, status: 'qr_ready' } : null);
    };

    const handleMessage = ({ instanceId, messages: newMessages, message: singleMessage }: { instanceId: string; messages?: any[]; message?: any }) => {
      if (instanceId !== instanceName) return;
      
      const messagesToProcess = newMessages || (singleMessage ? [singleMessage] : []);
      
      messagesToProcess.forEach((msg) => {
        const canonical = toCanonicalMessage(msg);
        if (!canonical) return;

        const chatMessage: ChatMessage = {
          id: canonical.id,
          jid: canonical.remoteJid,
          text: canonical.renderedBody || canonical.body || '',
          fromMe: canonical.fromMe,
          timestamp: canonical.timestamp,
          pushName: canonical.senderName,
        };

        setMessages((prev) => {
          const updated = new Map(prev);
          const chatMessages = updated.get(canonical.remoteJid) || [];
          if (chatMessages.some(m => m.id === canonical.id)) return prev;
          updated.set(canonical.remoteJid, [...chatMessages, chatMessage]);
          return updated;
        });
      });
    };

    whatsappService.on('instance:status', handleStatus);
    whatsappService.on('instance:qr', handleQr);
    whatsappService.on('message', handleMessage);
    whatsappService.on('message:new', handleMessage);

    checkStatus();

    return () => {
      whatsappService.off('instance:status', handleStatus);
      whatsappService.off('instance:qr', handleQr);
      whatsappService.off('message', handleMessage);
      whatsappService.off('message:new', handleMessage);
      whatsappService.unsubscribeFromInstance(instanceName);
      stopPolling();
    };
  }, [instanceName, startPolling, stopPolling, checkStatus]);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await whatsappService.connectWhatsApp(instanceName);
      if (!result.success) throw new Error(result.error || 'Failed to connect');
      if (result.snapshot) setConnectionInfo(result.snapshot);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [instanceName]);

  const disconnect = useCallback(async () => {
    setLoading(true);
    try {
      const result = await whatsappService.disconnectWhatsApp(instanceName);
      if (!result.success) throw new Error(result.error || 'Failed to disconnect');
      setConnectionInfo(prev => prev ? { ...prev, status: 'disconnected', qr: null, needsQr: false } : null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [instanceName]);

  const sendMessage = useCallback(async (jid: string, text: string) => {
    try {
      const result = await whatsappService.sendMessage(jid, text, instanceName);
      if (!result.success) throw new Error(result.error);
      return result.message;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [instanceName]);

  const loadChats = useCallback(async () => {
    try {
      const result = await whatsappService.getChats(instanceName);
      if (result.success && result.chats) setChats(result.chats);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  }, [instanceName]);

  const loadContacts = useCallback(async () => {
    try {
      const result = await whatsappService.getContacts(instanceName);
      if (result.success && result.contacts) setContacts(result.contacts);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  }, [instanceName]);

  return {
    isConnected: connectionInfo?.status === 'connected',
    connectionInfo,
    qrCode: connectionInfo?.qr,
    contacts,
    chats,
    messages,
    loading,
    error,
    connect,
    disconnect,
    sendMessage,
    loadChats,
    loadContacts,
    checkStatus,
  };
}

function extractMessageText(message: any): string | null {
  if (!message) return null;
  
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentWithCaptionMessage?.message?.documentMessage?.caption) {
    return message.documentWithCaptionMessage.message.documentMessage.caption;
  }
  
  if (message.extendedTextMessage) {
    return message.extendedTextMessage.caption || null;
  }
  
  return null;
}
