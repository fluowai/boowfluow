import { socketEmitter } from '../socketEmitter';
import { v4 as uuidv4 } from 'uuid';
import { notifyCriticalError } from './notifier';

export function initializeLogger() {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;

  function emitLog(level: 'info' | 'warn' | 'error' | 'critical' | 'success', args: any[]) {
    try {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg); } catch (e) { return String(arg); }
        }
        return String(arg);
      }).join(' ');

      // Trava de segurança contra Infinite Loops!
      if (message.includes('system:log') || message.includes('SocketEmitter') || message.includes('[Notifier]')) {
         return;
      }

      let finalLevel = level;
      if (level === 'error' || level === 'warn') {
        if (message.toLowerCase().includes('crítico') || message.toLowerCase().includes('fatal') || message.toLowerCase().includes('critical')) {
          finalLevel = 'critical';
          // Disparar notificação (E-mail e WhatsApp)
          notifyCriticalError(message).catch(err => {
             // Usa stdout para não cair no mesmo interceptor
             process.stdout.write(`[Logger] Falha ao notificar erro critico: ${err.message}\n`);
          });
        }
      } else if (level === 'info' && (message.toLowerCase().includes('sucesso') || message.toLowerCase().includes('success') || message.toLowerCase().includes('conectado'))) {
        finalLevel = 'success';
      }

      socketEmitter.emitGlobal('system:log', {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        level: finalLevel,
        message,
        source: 'backend'
      });
    } catch (e) {
      // Evita problemas de serialização ou loops
    }
  }

  // Intercepta e emite via Socket
  console.log = function (...args) {
    originalLog.apply(console, args);
    emitLog('info', args);
  };

  console.info = function (...args) {
    originalInfo.apply(console, args);
    emitLog('info', args);
  };

  console.warn = function (...args) {
    originalWarn.apply(console, args);
    emitLog('warn', args);
  };

  console.error = function (...args) {
    originalError.apply(console, args);
    emitLog('error', args);
  };
}
