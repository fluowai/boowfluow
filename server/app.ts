import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { whitelabelResolver } from './middleware/whitelabelResolver';
import { initializeLogger } from './utils/logger';

const app = express();

// Configuração robusta de CORS
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['*'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf('*') !== -1 || allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy: This origin is not allowed'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger de todas as requisições para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// --- RESOLUÇÃO DE WHITELABEL (DOMÍNIO) ---
// Deve rodar antes de tudo para injetar req.whitelabel
app.use('/api', whitelabelResolver);

// --- ROTAS PÚBLICAS (NÃO EXIGEM LOGIN) ---
app.get('/api/health', (req, res) => res.json({ status: 'up', whitelabel: (req as any).whitelabel?.slug || 'default' }));
app.get('/api/theme', (req, res) => {
  const whitelabel = (req as any).whitelabel;
  if (!whitelabel) return res.status(404).json({ error: 'Domínio não configurado.' });
  res.json(whitelabel.theme);
});

// --- PROTEÇÃO GLOBAL (RESTO DA API) ---
app.use('/api', authMiddleware);

export default app;
