import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export const socketEmitter = {
  setIO(ioInstance: SocketIOServer) {
    if (!ioInstance) {
      console.error('[SocketEmitter] Tentativa de registrar io nulo!');
      return;
    }
    io = ioInstance;
    console.log('[SocketEmitter] Central IO Engine vinculada com sucesso.');
  },

  emitToInstance(instanceId: string, event: string, payload: any) {
    if (!io) {
      console.warn(`[SocketEmitter/Forense] Evento ignorado (IO não inicializado). Room instance:${instanceId} Event: ${event}`);
      return;
    }
    const room = `instance:${instanceId}`;
    io.to(room).emit(event, payload);
    console.log(`[SocketEmitter/Forense] 📤 Emitindo "${event}" para "${room}". Payload UUID/Type: ${payload.messageId ? payload.messageId + ' (' + payload.type + ')' : '[Multi/System]'}`);
  },

  emitToChat(instanceId: string, chatId: string, event: string, payload: any) {
    if (!io) {
      console.warn(`[SocketEmitter/Forense] Evento ignorado (IO). Room chat:${instanceId}:${chatId} Event: ${event}`);
      return;
    }
    const room = `chat:${instanceId}:${chatId}`;
    io.to(room).emit(event, payload);
    console.log(`[SocketEmitter/Forense] 📤 Emitindo "${event}" para chat privativo "${room}".`);
  },

  emitToRoom(room: string, event: string, payload: any) {
    if (!io) return;
    io.to(room).emit(event, payload);
    console.log(`[SocketEmitter/Forense] 📤 Emitindo "${event}" para sala customizada "${room}".`);
  },

  emitGlobal(event: string, payload: any) {
    if (!io) return;
    io.emit(event, payload);
    if (event !== 'system:log' && event !== 'system:metrics') {
      console.log(`[SocketEmitter/Forense] 🌍 Emitindo Global "${event}".`);
    }
  }
};
