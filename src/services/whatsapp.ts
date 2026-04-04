import { io, Socket } from 'socket.io-client';
import { CanonicalMessage, InstanceConnectionState } from '../types/chat';
import { toCanonicalMessage, normalizeMessages } from '../lib/messageAdapter';
import { supabase } from '../lib/supabase';

const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || '';
const SOCKET_URL = BACKEND_URL || '/'; 
const API_URL = BACKEND_URL ? `${BACKEND_URL}/api/whatsapp` : '/api/whatsapp';

const getHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  
  if (!token) {
    console.warn('[WhatsAppService] Sessão não encontrada ou expirada.');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || ''}`
  };
};

class WhatsAppService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect() {
    if (this.socket) {
      if (!this.socket.connected) this.socket.connect();
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('WhatsApp socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WhatsApp socket disconnected');
    });

    this.socket.onAny((event, data) => {
      // Normalização automática de eventos de mensagem vindos do socket (velho e novo)
      if (['message', 'message:new', 'message:update'].includes(event)) {
        if (data && data.messages) {
          data.messages = normalizeMessages(data.messages);
        } else if (data && data.message) {
          data.message = toCanonicalMessage(data.message);
        }
      }

      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach((listener) => listener(data));
      }
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Limpa todos os listeners de uma instância específica para evitar duplicação.
   */
  removeAllInstanceListeners(instanceName: string) {
    if (!this.socket) return;
    this.socket.off(`instance:${instanceName}:status`);
    this.socket.off(`instance:${instanceName}:qr`);
    this.socket.off(`instance:${instanceName}:error`);
    this.socket.off(`instance:${instanceName}:message`);
  }

  async subscribeToInstance(instanceName: string = 'default') {
    if (!this.socket) {
      console.warn('Socket not initialized, cannot subscribe to instance');
      return;
    }
    
    // Limpeza preventiva antes de subscrição
    this.removeAllInstanceListeners(instanceName);

    const performSubscribe = async () => {
      this.socket?.emit('subscribe:instance', instanceName);
      console.log(`[Socket] Subscribed to instance: ${instanceName}`);
      
      // Aguarda 1s para garantir que o JWT está disponível antes de reidratar
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reidratação Imediata: Busca o estado atual para não esperar o próximo evento
      this.getStatus(instanceName).then(status => {
        // Guarda seguro: só emite se a resposta tem dados válidos
        if (!status || !status.instanceName) {
          console.warn(`[Socket] Rehydration ignorada para ${instanceName}: resposta inválida`, status);
          return;
        }
        const eventListeners = this.listeners.get('instance:status');
        if (eventListeners) {
          console.log(`[Socket] Rehydrating state for ${instanceName}:`, status.status);
          eventListeners.forEach((listener) => listener(status));
        }
      }).catch(err => console.error('[Socket] Rehydration failed:', err));
    };

    if (this.socket.connected) {
      performSubscribe();
    } else {
      this.socket.once('connect', performSubscribe);
    }
  }

  unsubscribeFromInstance(instanceName: string = 'default') {
    if (!this.socket?.connected) return;
    this.socket.emit('unsubscribe:instance', instanceName);
    this.removeAllInstanceListeners(instanceName);
    console.log(`Unsubscribed from instance: ${instanceName}`);
  }

  async getStatus(instanceName: string = 'default'): Promise<InstanceConnectionState> {
    const headers = await getHeaders();
    const res = await fetch(`/api/whatsapp/status?instanceName=${encodeURIComponent(instanceName)}`, {
      headers: { 'Authorization': headers['Authorization'] }
    });
    return res.json();
  }

  async getAllInstances(): Promise<{ instances: InstanceConnectionState[] }> {
    const headers = await getHeaders();
    const res = await fetch(`/api/whatsapp/instances`, {
      headers: { 'Authorization': headers['Authorization'] }
    });
    return res.json();
  }

  async connectWhatsApp(instanceName: string = 'default'): Promise<{ success: boolean; message?: string; error?: string; snapshot?: InstanceConnectionState }> {
    const res = await fetch(`/api/whatsapp/connect`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ instanceName }),
    });
    return res.json();
  }

  async disconnectWhatsApp(instanceName: string = 'default'): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch(`${API_URL}/disconnect`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ instanceName }),
    });
    return res.json();
  }

  async sendMessage(jid: string, text: string, instanceName: string = 'default'): Promise<{ success: boolean; message?: CanonicalMessage; error?: string }> {
    const res = await fetch(`${API_URL}/send`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ instanceName, jid, text }),
    });
    const data = await res.json();
    if (data.success && data.message) {
      data.message = toCanonicalMessage(data.message);
    }
    return data;
  }

  async sendMedia(jid: string, base64: string, mimetype: string, filename?: string, caption?: string, instanceName: string = 'default'): Promise<{ success: boolean; message?: CanonicalMessage; error?: string }> {
    const res = await fetch(`${API_URL}/send-media`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ instanceName, jid, base64, mimetype, filename, caption }),
    });
    const data = await res.json();
    if (data.success && data.message) {
      data.message = toCanonicalMessage(data.message);
    }
    return data;
  }

  async getContacts(instanceName: string = 'default'): Promise<{ success: boolean; contacts?: any[]; error?: string }> {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/contacts?instanceName=${encodeURIComponent(instanceName)}`, {
      headers: { 'Authorization': headers['Authorization'] }
    });
    return res.json();
  }

  async getChats(instanceName: string = 'default'): Promise<{ success: boolean; chats?: any[]; error?: string }> {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/chats?instanceName=${encodeURIComponent(instanceName)}`, {
      headers: { 'Authorization': headers['Authorization'] }
    });
    const data = await res.json();
    if (data.success && data.chats) {
      data.chats = data.chats.map((chat: any) => ({
        ...chat,
        lastMessage: chat.lastMessage ? toCanonicalMessage(chat.lastMessage) : null
      }));
    }
    return data;
  }

  async getMessages(jid: string, instanceName: string = 'default', limit: number = 50): Promise<{ success: boolean; messages?: CanonicalMessage[]; error?: string }> {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/messages/${encodeURIComponent(jid)}?instanceName=${encodeURIComponent(instanceName)}&limit=${limit}`, {
      headers: { 'Authorization': headers['Authorization'] }
    });
    const data = await res.json();
    if (data.success && data.messages) {
      data.messages = normalizeMessages(data.messages);
    }
    return data;
  }

  async getProfilePicture(jid: string, instanceName: string = 'default'): Promise<{ success: boolean; picture?: string | null; error?: string }> {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/profile/${encodeURIComponent(jid)}?instanceName=${encodeURIComponent(instanceName)}`, {
      headers: { 'Authorization': headers['Authorization'] }
    });
    return res.json();
  }

  async syncInstance(instanceName: string = 'default'): Promise<{ success: boolean; message?: string; error?: string; totalSynced?: number }> {
    console.log(`[WhatsAppService] Invocando sincronização para: ${instanceName}`);
    try {
      const res = await fetch(`${API_URL}/sync`, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ instanceName }),
      });
      const data = await res.json();
      console.log(`[WhatsAppService] Resposta da sincronização:`, data);
      return data;
    } catch (err) {
      console.error(`[WhatsAppService] Erro ao chamar endpoint de sync:`, err);
      throw err;
    }
  }

  async getChatMetadata(instanceName: string = 'default'): Promise<{ success: boolean; metadata?: any[]; error?: string }> {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}/chat-metadata?instanceName=${encodeURIComponent(instanceName)}`, {
      headers: { 'Authorization': headers['Authorization'] }
    });
    return res.json();
  }

  async updateChatMetadata(jid: string, isFavorite: boolean, customName?: string | null, instanceName: string = 'default'): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`${API_URL}/chat-metadata`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ instanceName, jid, is_favorite: isFavorite, custom_name: customName }),
    });
    return res.json();
  }
}

export const whatsappService = new WhatsAppService();
