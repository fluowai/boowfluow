import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import app from './app';
import { socketEmitter } from './socketEmitter';
import { whatsappService } from './whatsapp';
import { messageQueue } from './queue';

const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// --- INFRAESTRUTURA GLOBAL (PROMPT MESTRE) ---
(global as any).io = io;
socketEmitter.setIO(io);

// --- HANDLER ÚNICO DO EVENTBUS WHATSAPP (CORREÇÃO CIRÚRGICA) ---
whatsappService.setEventHandler((event: string, data: any) => {
  // 1. Enqueue para processamento em background (AI/CRM/Workers)
  if (event === 'message' || event === 'message:new') {
    messageQueue.enqueue('process_message', { event, data });
  }

  // 2. Emissão única via socketEmitter para a room correta
  if (data && data.instanceId) {
    const room = `instance:${data.instanceId}`;
    socketEmitter.emitToRoom(room, event, data);
  } else {
    socketEmitter.emitGlobal(event, data);
  }
});

// --- SOCKET.IO ROOM MANAGEMENT ---
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribe:instance', (instanceId: string) => {
    const name = instanceId || 'default';
    const room = `instance:${name}`;
    socket.join(room);
    
    // Entrega Imediata de Snapshot (Snapshot Replay)
    const snapshot = whatsappService.getInstanceSnapshot(name);
    socket.emit('instance:status', snapshot);
    
    if (snapshot.qr) {
      socket.emit('instance:qr', { 
        instanceId: name,
        qr: snapshot.qr, 
        qrVersion: snapshot.qrVersion 
      });
    }
  });

  socket.on('unsubscribe:instance', (instanceId: string) => {
    socket.leave(`instance:${instanceId || 'default'}`);
  });

  socket.on('disconnect', () => { console.log('Client disconnected:', socket.id); });
});

export { httpServer, io };
