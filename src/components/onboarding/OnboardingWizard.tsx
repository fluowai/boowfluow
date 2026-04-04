import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  User, 
  Bot, 
  Sparkles, 
  Loader2,
  Rocket,
  LayoutDashboard,
  Zap
} from 'lucide-react';
import { useTheme } from '../../providers/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedBackground } from '../ui/AnimatedBackground';

/**
 * ONB-02: Wizard de Onboarding PREMIUM
 * Transições horizontais, design Glassmorphism e correção de layout de botões.
 */

export const OnboardingWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    agentName: 'Meu Assistente IA',
    agentGoal: 'Vendas e Suporte'
  });

  const totalSteps = 3;

  const handleNext = () => setStep(s => Math.min(s + 1, totalSteps + 1));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não identificado.');

      await supabase
        .from('profiles')
        .update({ 
          full_name: formData.fullName, 
          phone: formData.phone,
          onboarding_completed: true 
        })
        .eq('id', user.id);

      await supabase
        .from('agents')
        .insert([{
          name: formData.agentName,
          description: `Objetivo: ${formData.agentGoal}`,
          user_id: user.id,
          sector: 'Vendas'
        }]);

      onComplete();
    } catch (err) {
      console.error('[Onboarding] Erro ao finalizar:', err);
      alert('Ocorreu um erro ao salvar suas configurações.');
    } finally {
      setLoading(false);
    }
  };

  // Variantes para animação de slide horizontal
  const slideVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.95
    }),
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: "easeOut" } as any
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -100 : 100,
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.3, ease: "easeIn" } as any
    })
  };

  // Direção da animação (baseada no step atual vs anterior)
  const [direction, setDirection] = useState(1);

  const changeStep = (newStep: number) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 font-sans overflow-hidden">
      <AnimatedBackground />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-2xl rounded-[48px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.15)] border border-white/60 overflow-hidden flex flex-col h-[700px]">
          
          {/* Header & Progress */}
          <div className="p-8 pb-4 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-brand rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand/20">
                  <Zap size={20} className="fill-current" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 tracking-tight">Onboarding</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Passo {step} de {totalSteps}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((s) => (
                  <div 
                    key={s} 
                    className={`h-1.5 rounded-full transition-all duration-500 ${step === s ? 'w-8 bg-brand' : step > s ? 'w-4 bg-emerald-400' : 'w-4 bg-slate-200'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Content Area - Scrollable */}
          <div className="flex-1 overflow-hidden relative p-10 pt-4">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full flex flex-col items-center justify-center space-y-10"
              >
                {step === 1 && (
                  <div className="w-full space-y-10">
                     <div className="space-y-3 text-center">
                        <div className="mx-auto h-20 w-20 bg-blue-50 rounded-[24px] flex items-center justify-center text-blue-500 shadow-sm border border-blue-100 mb-4 transform rotate-3">
                          <User size={40} />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Quem é você?</h2>
                        <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">Precisamos de alguns detalhes para preparar seu escritório virtual.</p>
                     </div>
                     <div className="space-y-5 max-w-md mx-auto w-full">
                        <OnboardingInput 
                          label="Qual o seu nome completo?" 
                          value={formData.fullName} 
                          onChange={v => setFormData(f => ({...f, fullName: v}))}
                          placeholder="Ex: Paulo Silva"
                          icon={<User size={20} />}
                        />
                        <OnboardingInput 
                          label="Celular para contato" 
                          value={formData.phone} 
                          onChange={v => setFormData(f => ({...f, phone: v}))}
                          placeholder="+55 (00) 90000-0000"
                          icon={<Sparkles size={20} />}
                        />
                     </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="w-full space-y-10">
                     <div className="space-y-3 text-center">
                        <div className="mx-auto h-20 w-20 bg-brand-light rounded-[24px] flex items-center justify-center text-brand shadow-sm border border-brand/10 mb-4 transform -rotate-3">
                          <Bot size={40} />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Seu Primeiro Agente</h2>
                        <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto">O motor da sua operação. Como seu novo colega de trabalho se chamará?</p>
                     </div>
                     <div className="space-y-5 max-w-md mx-auto w-full">
                        <OnboardingInput 
                          label="Apelido do Agente IA" 
                          value={formData.agentName} 
                          onChange={v => setFormData(f => ({...f, agentName: v}))}
                          placeholder="Ex: Jarvis"
                          icon={<Bot size={20} />}
                        />
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Especialidade do Agente</label>
                          <select 
                            value={formData.agentGoal}
                            onChange={e => setFormData(f => ({...f, agentGoal: e.target.value}))}
                            className="w-full bg-slate-50/50 backdrop-blur-sm border-2 border-slate-100 text-slate-900 px-6 py-5 rounded-[24px] focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none font-bold text-sm appearance-none shadow-sm cursor-pointer"
                          >
                            <option>Vendas e Qualificação de Leads</option>
                            <option>Suporte ao Cliente e FAQ</option>
                            <option>Agendamento de Reuniões</option>
                            <option>Especialista em Produto</option>
                          </select>
                        </div>
                     </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="w-full space-y-10 text-center">
                     <div className="mx-auto h-28 w-28 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10 border border-emerald-100 relative mb-4">
                       <Rocket size={56} className="animate-bounce" />
                       <div className="absolute -top-2 -right-2 h-8 w-8 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center">
                         <div className="h-4 w-4 bg-emerald-500 rounded-full animate-pulse" />
                       </div>
                     </div>
                     <div className="space-y-4">
                       <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Decolagem Autorizada!</h2>
                       <p className="text-slate-500 font-medium text-xl leading-relaxed max-w-sm mx-auto">
                         Ambiente configurado com sucesso. Clique no botão abaixo para acessar o Dashboard da <strong>{theme?.app_name}</strong>.
                       </p>
                     </div>
                     <div className="max-w-md mx-auto p-8 bg-slate-900 rounded-[32px] text-left flex items-start gap-4 transform -rotate-1 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CheckCircle2 className="text-emerald-400 shrink-0 mt-1 relative z-10" size={28} />
                        <div className="relative z-10">
                          <h4 className="text-white font-black uppercase tracking-[0.2em] text-[10px] opacity-60">Status do Provisionamento</h4>
                          <p className="text-slate-300 text-sm font-bold leading-normal mt-1">Conecte sua instância do WhatsApp para ativar o {formData.agentName}.</p>
                        </div>
                     </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Navigation - FIXED BOTTOM */}
          <div className="p-10 pt-6 border-t border-slate-100 flex gap-4 bg-white/50">
            {step > 1 && (
              <button 
                onClick={() => changeStep(step - 1)}
                className="flex-1 border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-500 font-black py-5 rounded-[24px] transition-all flex items-center justify-center gap-3 transform active:scale-95 shadow-sm text-sm"
              >
                <ArrowLeft size={20} />
                Voltar
              </button>
            )}
            
            {step < 3 ? (
              <button 
                onClick={() => changeStep(step + 1)}
                disabled={(step === 1 && !formData.fullName)}
                className="flex-[2] bg-brand hover:brightness-110 text-white font-black py-5 rounded-[24px] shadow-2xl shadow-brand/30 transition-all flex items-center justify-center gap-3 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Próximo Passo
                <ArrowRight size={20} />
              </button>
            ) : (
              <button 
                onClick={handleFinish}
                disabled={loading}
                className="flex-[2] bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[24px] shadow-2xl transition-all flex items-center justify-center gap-3 transform active:scale-95 text-sm"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : (
                  <>
                    Acessar meu Dashboard
                    <Sparkles size={22} className="text-brand" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
      
      {/* Branding Sutil */}
      <div className="absolute bottom-10 flex items-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all duration-500 cursor-default">
         <LayoutDashboard size={14} className="text-slate-600" />
         <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">{theme?.app_name} Cloud</span>
      </div>
    </div>
  );
};

const OnboardingInput: React.FC<{ label: string, value: string, onChange: (v: string) => void, placeholder: string, icon: React.ReactNode }> = ({ label, value, onChange, placeholder, icon }) => (
  <div className="space-y-2 group">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 group-focus-within:text-brand transition-colors">{label}</label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-300 group-focus-within:text-brand transition-colors">
        {icon}
      </div>
      <input 
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-50/50 backdrop-blur-sm border-2 border-slate-100 text-slate-900 pl-14 pr-6 py-5 rounded-[24px] focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none font-bold text-sm shadow-sm"
        placeholder={placeholder}
      />
    </div>
  </div>
);
