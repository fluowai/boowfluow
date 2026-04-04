import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Otimização de dependências — pré-bundling explícito
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'socket.io-client',
        '@supabase/supabase-js',
      ],
      force: false,
    },
    build: {
      // Code splitting agressivo — cada lib vira chunk separado
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-socket': ['socket.io-client'],
            'vendor-motion': ['framer-motion', 'motion/react'],
            'vendor-charts': ['recharts'],
            'vendor-google': ['@google/genai'],
          },
        },
      },
      // Aumenta o limite de warning de chunk (padrão 500kb é muito baixo)
      chunkSizeWarningLimit: 1000,
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://127.0.0.1:3001',
          ws: true,
          changeOrigin: true,
        },
      },
      watch: {
        ignored: ['**/.wwebjs_auth/**', '**/.wwebjs_cache/**', '**/node_modules/**'],
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      // Aumenta o timeout do HMR para evitar reload desnecessário
      warmup: {
        clientFiles: ['./src/App.tsx', './src/main.tsx'],
      },
    },
  };
});
