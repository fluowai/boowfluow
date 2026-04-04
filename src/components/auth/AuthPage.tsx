import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Zap, Mail, Lock, User, ArrowRight, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../providers/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedBackground } from '../ui/AnimatedBackground';

/**
 * AUT-03: Página de Autenticação PREMIUM
 * Design Glassmorphism, animações Stagger e suporte Whitelabel dinâmico.
 */

export const AuthPage: React.FC = () => {
  const { theme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role: 'admin' },
          },
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 sm:p-8 font-sans overflow-hidden">
      <AnimatedBackground />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-white/70 backdrop-blur-2xl rounded-[48px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white/50 overflow-hidden">
          
          {/* Header Animado */}
          <div className="p-10 text-center space-y-6">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="mx-auto h-20 w-20 bg-brand rounded-3xl flex items-center justify-center shadow-2xl shadow-brand/30 transition-shadow"
            >
              {theme?.logo_url ? (
                <img src={theme.logo_url} alt="Logo" className="h-12 w-12 object-contain" />
              ) : (
                <Zap className="text-white fill-current" size={40} />
              )}
            </motion.div>
            
            <div className="space-y-2">
              <motion.h2 variants={itemVariants} className="text-3xl font-black text-slate-900 tracking-tighter">
                {isLogin ? (theme?.app_name || 'Fluow Ai') : 'Junte-se ao Futuro'}
              </motion.h2>
              <motion.p variants={itemVariants} className="text-slate-500 font-medium text-sm px-4">
                {isLogin 
                  ? 'A plataforma de automação inteligente líder do mercado.' 
                  : 'Crie sua conta e comece a escalar seus resultados com IA.'}
              </motion.p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-10 pb-10 space-y-5">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-rose-500/10 border border-rose-200 rounded-2xl text-rose-600 text-xs font-bold text-center flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={14} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div 
                  key="name-field"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-1.5"
                >
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1.5">Nome Completo</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand transition-colors">
                      <User size={20} />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-50/50 backdrop-blur-sm border-2 border-slate-100/50 text-slate-900 pl-12 pr-4 py-4 rounded-3xl focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none text-sm font-bold placeholder:text-slate-300"
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div variants={itemVariants} className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1.5">E-mail Corporativo</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50/50 backdrop-blur-sm border-2 border-slate-100/50 text-slate-900 pl-12 pr-4 py-4 rounded-3xl focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none text-sm font-bold placeholder:text-slate-300"
                  placeholder="nome@empresa.com"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1.5">Senha Segura</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50/50 backdrop-blur-sm border-2 border-slate-100/50 text-slate-900 pl-12 pr-4 py-4 rounded-3xl focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none text-sm font-bold placeholder:text-slate-300"
                  placeholder="••••••••"
                />
              </div>
            </motion.div>

            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:brightness-110 text-white font-black py-5 rounded-[24px] shadow-2xl shadow-brand/30 flex items-center justify-center gap-3 transform transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 text-sm"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  {isLogin ? 'Explorar Sistema' : 'Começar Gratuitamente'}
                  <Sparkles size={20} />
                </>
              )}
            </motion.button>

            <motion.div variants={itemVariants} className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs text-slate-500 font-bold hover:text-brand transition-colors uppercase tracking-widest"
              >
                {isLogin ? 'Não tem conta? Cadastre-se' : 'Já é membro? Entrar agora'}
              </button>
            </motion.div>
          </form>
        </div>
        
        {/* Footer Minimalista */}
        <p className="mt-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          SaaS Enterprise Powered by <span className="text-slate-600">Fluow</span>
        </p>
      </motion.div>
    </div>
  );
};
