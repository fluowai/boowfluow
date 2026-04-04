import 'dotenv/config';
import { initializeLogger } from './utils/logger';

// =============================================================================
// 🔎 AUDITORIA FORENSE MÁXIMA — CAMADA 1: IDENTIDADE E HEARTBEAT DO PROCESSO
// MANTER RIGOROSAMENTE IDÊNTICO AO ORIGINAL
// =============================================================================
initializeLogger();
const FORENSIC_BOOT_ID = Math.random().toString(36).substring(2, 10).toUpperCase();
const START_TIME_ISO = new Date().toISOString();
(global as any).FORENSIC_BOOT_ID = FORENSIC_BOOT_ID;

console.log(`\n[BOOT][FORENSE] >>> INICIALIZANDO PROCESSO BACKEND (MODULAR) <<<`);
console.log(`[BOOT][FORENSE] Boot ID: ${FORENSIC_BOOT_ID}`);
console.log(`[BOOT][FORENSE] PID: ${process.pid}\n`);

// Heartbeat
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`[HEARTBEAT][FORENSE] [${new Date().toISOString()}] pid=${process.pid} bootId=${FORENSIC_BOOT_ID} uptime=${Math.round(process.uptime())}s rss=${Math.round(mem.rss / 1024 / 1024)}MB`);
}, 10000);

// SIG Listeners
['SIGTERM', 'SIGINT', 'SIGHUP', 'exit'].forEach((signal) => {
  process.on(signal, (code) => {
    console.log(`[EVENTO_PROCESSO][FORENSE] sinal=${signal} código=${code} uptime=${Math.round(process.uptime())}s`);
  });
});

// =============================================================================
// 🏗️ INICIALIZAÇÃO DA ARQUITETURA LAMBORGHINI
// =============================================================================
import { httpServer } from './server';
import app from './app';
import routes from './routes';
import { initializeWorkers, bootstrapAllInstances } from './services/worker.service';

// Registro Central de Rotas
app.use('/api', routes);

// Inicialização de Background Workers
initializeWorkers();

// Sart Server
const PORT = process.env.VITE_WHATSAPP_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`[Bootstrap] WhatsApp modular server running on port ${PORT}`);
  // Inicia conexões de instâncias automáticas
  bootstrapAllInstances();
});
