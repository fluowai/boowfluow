import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Palette, Database, Globe } from 'lucide-react';

export const EditClient: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await axios.get(`/api/admin/whitelabels`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('ADMIN_API_KEY')}` }
        });
        const client = response.data.find((c: any) => c.id === id);
        if (client) {
          setFormData({
            ...client,
            app_name: client.theme.app_name,
            primary_color: client.theme.primary_color,
            background_color: client.theme.background_color,
            text_color: client.theme.text_color,
            logo_url: client.theme.logo_url,
            favicon_url: client.theme.favicon_url,
            font_family: client.theme.font_family
          });
        }
      } catch (err) {
        console.error('[Edit] Erro ao carregar:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClient();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`/api/admin/whitelabels/${id}`, {
        slug: formData.slug,
        domain: formData.domain,
        theme: {
          app_name: formData.app_name,
          primary_color: formData.primary_color,
          background_color: formData.background_color,
          text_color: formData.text_color,
          logo_url: formData.logo_url,
          favicon_url: formData.favicon_url,
          font_family: formData.font_family
        }
      }, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('ADMIN_API_KEY')}` }
      });
      navigate('/');
    } catch (err) {
      alert('Falha ao atualizar configurações.');
    }
  };

  if (isLoading || !formData) return <div className="p-12 text-center text-slate-500 font-bold">Carregando dados do parceiro...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-colors">
        <ArrowLeft size={20} /> Voltar ao Dashboard
      </button>

      <div className="space-y-2">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Editar Configurações</h1>
        <p className="text-slate-500 font-medium tracking-tight">Atualize a identidade visual e parâmetros do whitelabel: <span className="font-black text-indigo-600">{formData.slug}</span></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-12">
        <Section title="Informações de Rede" icon={<Globe />}>
           <div className="grid grid-cols-2 gap-6 p-6">
              <Input label="Identificador (Slug)" name="slug" value={formData.slug} onChange={handleChange} disabled className="bg-slate-50 text-slate-400 cursor-not-allowed px-4 py-3 rounded-xl border-slate-200" />
              <Input label="Domínio Ativo" name="domain" value={formData.domain} onChange={handleChange} placeholder="app.cliente.com" />
           </div>
        </Section>

        <Section title="Identidade Visual (Tema)" icon={<Palette />}>
           <div className="grid grid-cols-3 gap-6 p-6">
              <Input label="App Name" name="app_name" value={formData.app_name} onChange={handleChange} className="col-span-2 px-4 py-3 rounded-xl border-slate-200 w-full" />
              <div className="col-span-1">
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fonte</label>
                 <select name="font_family" value={formData.font_family} onChange={handleChange} className="w-full border-slate-200 focus:ring-indigo-500 rounded-xl">
                   <option value="Inter">Inter</option>
                   <option value="Poppins">Poppins</option>
                   <option value="Montserrat">Montserrat</option>
                   <option value="Outfit">Outfit</option>
                 </select>
              </div>
              <div className="col-span-2">
                <Input label="Primária" name="primary_color" value={formData.primary_color} onChange={handleChange} type="color" className="h-10 p-1" />
              </div>
              <Input label="Fundo" name="background_color" value={formData.background_color} onChange={handleChange} type="color" className="h-10 p-1" />
              <Input label="Texto" name="text_color" value={formData.text_color} onChange={handleChange} type="color" className="h-10 p-1" />
              
              <div className="col-span-2">
                <Input label="URL do Logo" name="logo_url" value={formData.logo_url} onChange={handleChange} placeholder="https://..." />
              </div>
              <div className="col-span-1">
                <Input label="URL do Favicon" name="favicon_url" value={formData.favicon_url} onChange={handleChange} placeholder="https://..." />
              </div>
           </div>
        </Section>

        <div className="pt-8 border-t border-slate-200">
           <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-xl tracking-tight flex items-center justify-center gap-2">
             <Save size={20} /> Salvar Alterações e Sincronizar
           </button>
        </div>
      </form>
    </div>
  );
};

const Section: React.FC<{ title: string, icon: React.ReactNode, children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-3">
      <div className="text-indigo-600 font-bold">{icon}</div>
      <h3 className="font-black text-slate-900 uppercase tracking-wider text-sm">{title}</h3>
    </div>
    {children}
  </div>
);

const Input: React.FC<{ label: string, [key: string]: any }> = ({ label, className = "", ...props }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
    <input className={`w-full border-slate-200 focus:ring-indigo-500 rounded-xl px-4 py-3 placeholder:text-slate-300 transition-all focus:border-indigo-500 ${className}`} {...props} />
  </div>
);
