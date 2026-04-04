import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, Loader2, Globe, Database, 
  Palette, Type, Layout, Server, Copy 
} from 'lucide-react';

export const NewClient: React.FC = () => {
  const navigate = useNavigate();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [result, setResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    slug: '',
    domain: '',
    supabase_url: '',
    supabase_anon_key: '',
    supabase_service_key: '',
    app_name: '',
    primary_color: '#6366f1',
    background_color: '#f8fafc',
    text_color: '#0f172a',
    logo_url: '',
    favicon_url: '',
    font_family: 'Inter'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-slug
    if (name === 'app_name' && !formData.slug) {
       setFormData(prev => ({ ...prev, slug: value.toLowerCase().replace(/\s+/g, '-') }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    setDeployStep(1); // Salvando no banco
    
    try {
      // Pequeno delay para UX do primeiro passo
      await new Promise(r => setTimeout(r, 800));
      
      const payload = {
        slug: formData.slug,
        domain: formData.domain,
        supabase_url: formData.supabase_url,
        supabase_anon_key: formData.supabase_anon_key,
        supabase_service_key: formData.supabase_service_key,
        theme: {
          app_name: formData.app_name,
          primary_color: formData.primary_color,
          background_color: formData.background_color,
          text_color: formData.text_color,
          logo_url: formData.logo_url,
          favicon_url: formData.favicon_url,
          font_family: formData.font_family
        }
      };

      const config = {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('ADMIN_API_KEY')}` }
      };

      // O backend agora faz tudo em uma transação longa
      // Vamos simular os passos intermediários baseados em eventos ou apenas tempo
      setDeployStep(2); // Vercel Project
      await new Promise(r => setTimeout(r, 1500));
      
      setDeployStep(3); // Domain Registration
      await new Promise(r => setTimeout(r, 1200));

      const response = await axios.post('/api/admin/whitelabels', payload, config);

      setDeployStep(4); // Completo
      setResult(response.data.whitelabel);
    } catch (err) {
      console.error('[Provision] Erro:', err);
      alert('Falha no provisionamento automático. Verifique os logs do servidor.');
      setIsDeploying(false);
    }
  };

  if (isDeploying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <div className="max-w-xl w-full space-y-8 text-center bg-white p-12 rounded-3xl shadow-xl border border-slate-100">
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Provisionando Novo Parceiro</h2>
            <p className="text-slate-500 font-medium">Isso pode levar até 2 minutos enquanto configuramos a infraestrutura na Vercel.</p>
          </div>

          <div className="space-y-6 max-w-xs mx-auto text-left py-6">
            <DeployStep icon={<Database />} label="Gravando configurações no Config Store" active={deployStep >= 1} done={deployStep > 1} />
            <DeployStep icon={<Server />} label="Criando Projeto na Vercel via API" active={deployStep >= 2} done={deployStep > 2} />
            <DeployStep icon={<Globe />} label="Registrando Domínio e SSL" active={deployStep >= 3} done={deployStep > 3} />
            <DeployStep icon={<Layout />} label="Disparando Primeiro Deploy" active={deployStep >= 4} done={deployStep >= 4} />
          </div>

          {deployStep >= 4 && (
             <div className="pt-8 space-y-6">
               <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center gap-3">
                 <CheckCircle2 className="text-emerald-500" size={48} />
                 <h3 className="text-xl font-bold text-emerald-900">Sucesso Absoluto!</h3>
                 <p className="text-emerald-700 text-sm">O novo parceiro está online e sendo compilado.</p>
               </div>
               
               <div className="p-6 bg-slate-900 rounded-2xl text-left space-y-4">
                 <div className="space-y-1">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Instruções de DNS para o Cliente</p>
                   <p className="text-xs text-slate-400">Passe estes dados para apontamento do domínio:</p>
                 </div>
                 <div className="bg-slate-800 p-4 rounded-xl space-y-2 font-mono text-xs">
                    <p className="text-white"><span className="text-slate-500">TIPO:</span> CNAME</p>
                    <p className="text-white"><span className="text-slate-500">NOME:</span> @ ou {formData.domain.split('.')[0]}</p>
                    <p className="text-white"><span className="text-slate-500">VALOR:</span> cname.vercel-dns.com</p>
                 </div>
               </div>

               <button 
                onClick={() => navigate('/')}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all"
               >
                 Voltar ao Dashboard
               </button>
             </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <button 
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors"
      >
        <ArrowLeft size={20} />
        Cancelar e Voltar
      </button>

      <div className="space-y-2">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Novo Parceiro SaaS</h1>
        <p className="text-slate-500 font-medium">Preencha os dados abaixo para provisionar um projeto isolado instantaneamente.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Identidade e Infra */}
        <Section title="Infraestrutura e Identidade" icon={<Globe />}>
           <div className="grid grid-cols-2 gap-6 p-6">
              <Input label="Nome do Aplicativo (Público)" name="app_name" value={formData.app_name} onChange={handleChange} required placeholder="Ex: Meu CRM Whitelabel" />
              <Input label="Slug Interno (URL Identificador)" name="slug" value={formData.slug} onChange={handleChange} required placeholder="Ex: cliente-vip" />
              <div className="col-span-2">
                <Input label="Domínio Customizado (FQDN)" name="domain" value={formData.domain} onChange={handleChange} required placeholder="Ex: app.parceiro.com" />
              </div>
           </div>
        </Section>

        {/* Supabase Config */}
        <Section title="Conectividade Supabase (Isolamento)" icon={<Database />}>
           <div className="grid grid-cols-1 gap-6 p-6">
              <Input label="URL do Projeto Supabase" name="supabase_url" value={formData.supabase_url} onChange={handleChange} required placeholder="https://xyz.supabase.co" />
              <Input label="Supabase Anon Key" name="supabase_anon_key" value={formData.supabase_anon_key} onChange={handleChange} required placeholder="eyJhb..." />
              <Input label="Supabase Service Role Key (Criptografada)" name="supabase_service_key" value={formData.supabase_service_key} onChange={handleChange} required type="password" placeholder="Chave para automações de sistema..." />
           </div>
        </Section>

        {/* Visual e Tema */}
        <Section title="Visual e Experiência" icon={<Palette />}>
           <div className="grid grid-cols-3 gap-6 p-6">
              <Input label="Cor Primária" name="primary_color" value={formData.primary_color} onChange={handleChange} type="color" className="h-10 p-1" />
              <Input label="Cor de Fundo" name="background_color" value={formData.background_color} onChange={handleChange} type="color" className="h-10 p-1" />
              <Input label="Cor do Texto" name="text_color" value={formData.text_color} onChange={handleChange} type="color" className="h-10 p-1" />
              <div className="col-span-2">
                <Input label="URL do Logo (SVG ou PNG Transparente)" name="logo_url" value={formData.logo_url} onChange={handleChange} placeholder="https://..." />
              </div>
              <div className="col-span-1">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fonte Padrão</label>
                 <select 
                  name="font_family" 
                  value={formData.font_family} 
                  onChange={handleChange}
                  className="w-full border-slate-200 focus:ring-indigo-500 rounded-xl"
                 >
                   <option value="Inter">Inter (Padrão)</option>
                   <option value="Poppins">Poppins</option>
                   <option value="Montserrat">Montserrat</option>
                   <option value="Roboto">Roboto</option>
                   <option value="Outfit">Outfit</option>
                 </select>
              </div>
           </div>
        </Section>

        <div className="pt-8 border-t border-slate-200">
           <button 
            type="submit" 
            className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl shadow-2xl transition-all active:scale-95 text-xl tracking-tight"
           >
             Provisionar e Lançar Projeto
           </button>
        </div>
      </form>
    </div>
  );
};

const Section: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
      <div className="text-indigo-600">{icon}</div>
      <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm">{title}</h3>
    </div>
    {children}
  </div>
);

const Input: React.FC<{ label: string, [key: string]: any }> = ({ label, ...props }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
    <input 
      className="w-full border-slate-200 focus:ring-indigo-500 rounded-xl px-4 py-3 placeholder:text-slate-300 transition-all focus:border-indigo-500"
      {...props} 
    />
  </div>
);

const DeployStep: React.FC<{ icon: React.ReactNode, label: string, active: boolean, done: boolean }> = ({ icon, label, active, done }) => (
  <div className={`flex items-center gap-4 transition-all duration-500 ${active ? 'opacity-100' : 'opacity-30'}`}>
    <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${done ? 'bg-emerald-500 border-emerald-500 text-white' : active ? 'border-indigo-600 animate-pulse text-indigo-600' : 'border-slate-200 text-slate-400'}`}>
      {done ? <CheckCircle2 size={18} /> : active ? <Loader2 className="animate-spin" size={18} /> : icon}
    </div>
    <span className={`text-sm font-bold ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
  </div>
);
