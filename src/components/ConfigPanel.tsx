import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ShieldCheck,
  ShieldAlert,
  Eye, 
  EyeOff, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Cpu,
  Brain,
  Globe,
  Loader2,
  X,
  RefreshCw,
  Users,
  Settings as SettingsIcon,
  CreditCard,
  BellRing,
  Mail,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { UserManagementPanel } from './panels/UserManagementPanel';

import { supabase } from '../lib/supabase';

// Removida a MASTER_API_KEY global do frontend por razões de segurança.

interface ConfigItem {
  id: string;
  key: string;
  value: string;
  label: string;
  category: string;
  is_secret: boolean;
}

interface ConfigPanelProps {
  userRole?: 'mega_super_admin' | 'super_admin' | 'admin' | 'equipe';
}

export function ConfigPanel({ userRole = 'admin' }: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<'ai' | 'users' | 'billing' | 'support'>('ai');
  const [configs, setConfigs] = useState<ConfigItem[]>([
    { id: '1', key: 'gemini_api_key', value: '', label: 'Gemini Key', category: 'ai_providers', is_secret: true },
    { id: '2', key: 'openai_api_key', value: '', label: 'OpenAI Key', category: 'ai_providers', is_secret: true },
    { id: '3', key: 'claude_api_key', value: '', label: 'Claude Key', category: 'ai_providers', is_secret: true },
    { id: '4', key: 'groq_api_key', value: '', label: 'Groq Key', category: 'ai_providers', is_secret: true },
    { id: '5', key: 'active_ai_provider', value: 'gemini', label: 'Provedor Ativo', category: 'general', is_secret: false },
    { id: '6', key: 'support_email', value: '', label: 'E-mail de Alertas', category: 'support', is_secret: false },
    { id: '7', key: 'support_phone', value: '5548991138937', label: 'Número WhatsApp (Alertas)', category: 'support', is_secret: false },
    { id: '8', key: 'support_instance', value: '', label: 'Instância Local', category: 'support', is_secret: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [availableInstances, setAvailableInstances] = useState<any[]>([]);

  useEffect(() => {
    loadConfigs();
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/config/whatsapp/instances', {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      if(data.instances) {
        setAvailableInstances(data.instances);
      }
    } catch(e) {
      console.warn("Failed to fetch instances", e);
    }
  };

  const loadConfigs = async () => {
    try {
      setHasError(false);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/config', {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      if (!res.ok) {
        setNotification({ type: 'error', message: `O servidor backend não está respondendo (ECONNREFUSED). Verifique se o processo [0] iniciou corretamente.` });
        setHasError(true);
        throw new Error('Falha ao carregar');
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setConfigs(prev => prev.map(p => {
          const loaded = data.find((d: any) => d.key === p.key);
          return loaded ? { ...p, value: loaded.value, is_secret: !!loaded.is_secret } : p;
        }));
      }
    } catch (err: any) {
      console.error('Error loading config:', err);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const itemsToSave = configs.map(c => ({ key: c.key, value: c.value }));
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/config/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(itemsToSave)
      });
      
      if (res.ok) {
        setNotification({ type: 'success', message: 'Configurações salvas com sucesso!' });
        await loadConfigs(); // Recarrega os dados para atualizar o status (Ativo/Vazio)
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Falha ao salvar');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: `Erro ao salvar: ${err.message}` });
    } finally {
      setSaving(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleTest = async (provider: string, key: string) => {
    if (!key) {
      setNotification({ type: 'error', message: 'Insira uma chave para testar.' });
      return;
    }
    
    setNotification({ type: 'success', message: `Testando conexão com ${provider?.toUpperCase()}...` });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/config/test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ provider, key })
      });
      const result = await res.json();
      setNotification({ 
        type: result.success ? 'success' : 'error', 
        message: result.message || 'Erro ao testar.' 
      });
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro de rede ao testar.' });
    }
  };

  const handleTestAlert = async () => {
    setNotification({ type: 'success', message: 'Disparando evento de teste...' });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/config/test-alert', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: data.message });
      } else {
         throw new Error(data.error || 'Falha no servidor ao disparar teste.');
      }
    } catch(e: any) {
      setNotification({ type: 'error', message: e.message || 'Erro ao conectar-se à API de testes.' });
    }
  };

  const handleInit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/config/init', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      if (res.ok) {
        setNotification({ type: 'success', message: 'Campos inicializados! Você já pode configurar suas chaves.' });
        loadConfigs();
      } else {
        throw new Error(data.error || 'Erro ao inicializar.');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Erro ao inicializar. A tabela system_config existe no banco?' });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (key: string, value: string) => {
    setConfigs(prev => {
      const exists = prev.some(c => c.key === key);
      if (!exists) {
        return [...prev, { id: 'auto_' + Date.now(), key, value, label: key, category: 'support', is_secret: false }];
      }
      return prev.map(c => c.key === key ? { ...c, value } : c);
    });
  };

  const toggleShowKey = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const aiProviders = (configs || []).filter(c => c?.category === 'ai_providers');
  const activeProvider = (configs || []).find(c => c?.key === 'active_ai_provider')?.value || 'gemini';

  const renderAITab = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Inteligência Artificial</h2>
          <p className="text-slate-500 font-medium font-mono text-sm tracking-tighter">LLM API CREDENTIAL MANAGER / VERSION 2.0</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || aiProviders.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#141820] text-white rounded-xl font-bold text-sm hover:bg-slate-800 shadow-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Salvar Chaves API
        </button>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-2 text-slate-400">
          <Globe size={16} />
          <h3 className="text-xs font-bold uppercase tracking-widest">Provedor de IA Ativo</h3>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {['gemini', 'openai', 'claude', 'groq'].map((provider) => (
            <button
              key={provider}
              onClick={() => updateConfig('active_ai_provider', provider)}
              className={cn(
                "p-5 rounded-2xl border-2 transition-all flex flex-col gap-3 relative overflow-hidden group text-left",
                activeProvider === provider 
                  ? "bg-white border-amber-400 shadow-2xl shadow-amber-100 ring-4 ring-amber-50" 
                  : "bg-slate-50 border-slate-100 hover:border-slate-200 grayscale opacity-70 hover:opacity-100 hover:grayscale-0"
              )}
            >
              {activeProvider === provider && (
                <div className="absolute top-3 right-3 text-amber-500">
                  <CheckCircle2 size={18} />
                </div>
              )}
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                provider === 'gemini' ? "bg-blue-600 text-white" :
                provider === 'openai' ? "bg-emerald-600 text-white" :
                provider === 'claude' ? "bg-amber-600 text-white" :
                "bg-purple-600 text-white"
              )}>
                {provider === 'gemini' ? <Brain size={24} /> :
                 provider === 'openai' ? <Cpu size={24} /> :
                 provider === 'claude' ? <ShieldCheck size={24} /> :
                 <Zap size={24} />}
              </div>
              <div>
                <span className="font-black text-sm text-slate-900 capitalize block">{provider}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Provedor Oficial</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2 text-slate-400">
          <Key size={16} />
          <h3 className="text-xs font-bold uppercase tracking-widest">Credenciais do Sistema</h3>
        </div>

        {aiProviders.length === 0 && !hasError ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center text-center gap-6 bg-slate-50/50"
          >
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-[30px] flex items-center justify-center animate-bounce">
              <Key size={40} />
            </div>
            <div className="max-w-md">
              <h3 className="text-xl font-black text-slate-800">Nenhuma Credencial Encontrada</h3>
              <p className="text-slate-500 mt-2 font-medium">As chaves de API não foram detectadas no seu banco de dados. Você pode inicializar os campos agora com os padrões seguros.</p>
            </div>
            <button 
              onClick={handleInit}
              className="px-8 py-4 bg-amber-500 text-white rounded-2xl font-black shadow-xl shadow-amber-200 hover:bg-amber-600 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
              <Zap size={20} />
              INICIALIZAR CREDENCIAIS
            </button>
          </motion.div>
        ) : hasError ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-12 border-2 border-rose-100 rounded-[40px] flex flex-col items-center text-center gap-4 bg-rose-50/30"
          >
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center animate-pulse">
              <AlertCircle size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Servidor de Configuração Offline</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">Não foi possível estabelecer conexão com o backend. Verifique se o processo do servidor está rodando.</p>
            </div>
            <button 
              onClick={loadConfigs}
              className="mt-2 px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center gap-2"
            >
              <RefreshCw size={14} /> Tentar Reconectar
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aiProviders.map((config) => (
              <div 
                key={config.id}
                className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl transition-all space-y-4 group overflow-hidden relative"
              >
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider">{config.label || 'Chave API'}</label>
                  <div className="flex gap-2">
                     <button 
                       onClick={() => handleTest(config.key?.split('_')[0] || '', config.value)}
                       className="px-3 py-1.5 rounded-xl text-[10px] font-black bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white transition-all flex items-center gap-1.5"
                     >
                       <RefreshCw size={12} /> TESTAR
                     </button>
                     <div className={cn(
                       "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight",
                       config.value ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                     )}>
                       {config.value ? 'Ativo' : 'Vazio'}
                     </div>
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type={showKeys[config.key] ? "text" : "password"}
                    value={config.value || ''}
                    onChange={(e) => updateConfig(config.key, e.target.value)}
                    placeholder={`Insira sua chave ${config.label?.split(' ')[0]}...`}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-mono text-slate-700 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all cursor-text pr-14"
                  />
                  <button 
                    onClick={() => toggleShowKey(config.key)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 transition-colors p-2"
                  >
                    {showKeys[config.key] ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <div className="bg-slate-50 -mx-6 -mb-6 p-4 border-t border-slate-100 mt-4 group-hover:bg-amber-50 group-hover:border-amber-100 transition-colors">
                  <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-2">
                    <ShieldCheck size={12} /> Criptografado em repouso
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const renderSupportTab = () => {
    const emailConfig = configs.find(c => c.key === 'support_email') || { key: 'support_email', value: '' };
    const phoneConfig = configs.find(c => c.key === 'support_phone') || { key: 'support_phone', value: '5548991138937' };
    const instanceConfig = configs.find(c => c.key === 'support_instance') || { key: 'support_instance', value: '' };

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Destinos de Alerta</h2>
            <p className="text-slate-500 font-medium font-mono text-sm tracking-tighter">TELEFONE E E-MAIL PARA SUPORTE TÉCNICO</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={handleSave}
               disabled={saving}
               className="flex items-center gap-2 px-6 py-2.5 bg-[#141820] text-white rounded-xl font-bold text-sm hover:bg-slate-800 shadow-xl transition-all"
             >
               {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
               Salvar Alertas
             </button>
          </div>
        </div>

        <section className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center animate-pulse">
               <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Olho de Águia Automático</h3>
              <p className="text-sm font-medium text-slate-500">O servidor monitora falhas críticas. Configure onde receber os chamados de SOS.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Mail size={14} /> E-mail de Suporte Técnico
              </label>
              <input 
                type="email"
                value={emailConfig.value}
                onChange={(e) => updateConfig('support_email', e.target.value)}
                placeholder="suporte@agencia.com.br"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
              />
              <p className="text-[10px] text-slate-500">Caso o WhatsApp caia, os erros irão para o E-mail via SMTP.</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <MessageCircle size={14} /> Número do WhatsApp (Destino)
              </label>
              <input 
                type="text"
                value={phoneConfig.value}
                onChange={(e) => updateConfig('support_phone', e.target.value)}
                placeholder="5548991138937"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
              />
              <p className="text-[10px] text-slate-500">Número completo com código de país e DDD (somente números).</p>
            </div>
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className="flex h-full max-w-[1400px] mx-auto gap-8">
      {/* Sidebar Interno de Configurações */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-4 mb-2">Painel de Ajustes</h3>
        
        <button 
          onClick={() => setActiveTab('ai')}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left w-full",
            activeTab === 'ai' 
              ? "bg-slate-900 text-white shadow-xl shadow-slate-200/50" 
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          )}
        >
          <Brain size={18} /> Inteligência Artificial
        </button>

        {['mega_super_admin', 'super_admin', 'admin'].includes(userRole) && (
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left w-full",
              activeTab === 'users' 
                ? "bg-blue-600 text-white shadow-xl shadow-blue-200/50" 
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            <Users size={18} /> {userRole === 'admin' ? 'Equipe & Atendentes' : 'Usuários & Clientes'}
          </button>
        )}

        {['mega_super_admin', 'super_admin'].includes(userRole) && (
          <button 
            onClick={() => setActiveTab('support')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left w-full",
              activeTab === 'support' 
                ? "bg-rose-500 text-white shadow-xl shadow-rose-200/50" 
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            <ShieldAlert size={18} /> Alertas de Sistema
          </button>
        )}

        {userRole === 'admin' && (
          <button 
            onClick={() => setActiveTab('billing')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left w-full",
              activeTab === 'billing' 
                ? "bg-amber-500 text-white shadow-xl shadow-amber-200/50" 
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            <CreditCard size={18} /> Minha Assinatura
          </button>
        )}

        <button 
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left w-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 mt-auto"
        >
          <SettingsIcon size={18} /> Preferências do Sistema
        </button>
      </div>

      {/* Área de Conteúdo */}
      <div className="flex-1 bg-[#F8FAFC] rounded-[40px] border border-slate-200 relative">
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={cn(
                "absolute top-4 right-4 z-50 p-4 rounded-2xl flex items-center gap-3 border shadow-2xl",
                notification.type === 'success' ? "bg-emerald-600 border-emerald-500 text-white" : "bg-rose-600 border-rose-500 text-white"
              )}
            >
              {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <span className="font-bold drop-shadow-md">{notification.message}</span>
              <button className="ml-auto p-2 hover:bg-white/10 rounded-xl transition-colors" onClick={() => setNotification(null)}>
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-8 h-full max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'ai' && renderAITab()}
              {activeTab === 'users' && <UserManagementPanel />}
              {activeTab === 'support' && renderSupportTab()}
              {activeTab === 'billing' && (
                <div className="p-12 text-center text-slate-400 font-medium border-2 border-dashed border-slate-200 rounded-[32px]">
                  Módulo de Cobrança / Stripe - Em construção
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}

