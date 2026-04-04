import React from 'react';
import { 
  Users, 
  TrendingUp, 
  Settings, 
  LayoutTemplate,
  CreditCard,
  MessageSquare,
  ArrowUpRight,
  UserPlus
} from 'lucide-react';

export function SuperAdminDashboard() {
  const stats = [
    { title: 'Meus Clientes (Admins)', value: '142', change: '+12', icon: Users, color: 'text-blue-500', bg: 'bg-blue-100' },
    { title: 'Faturamento Estimado', value: 'R$ 28.5K', change: '+5.4%', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-100' },
    { title: 'Creditos de IA Restantes', value: '1.2M', change: '80%', icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-100' },
    { title: 'Total de Whats Ativos', value: '158', change: '+8', icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-100' },
  ];

  const recentClients = [
    { id: '1', name: 'Dr. Roberto Clínica', plan: 'Pro', instances: 2, status: 'Ativo' },
    { id: '2', name: 'Boutique Maria', plan: 'Basic', instances: 1, status: 'Ativo' },
    { id: '3', name: 'Imobiliária House', plan: 'Enterprise', instances: 5, status: 'Ativo' },
    { id: '4', name: 'Pizzaria Bella', plan: 'Basic', instances: 0, status: 'Inativo' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 font-black text-[10px] uppercase rounded-full tracking-widest flex items-center gap-2">
              <LayoutTemplate size={12} /> Painel WhiteLabel
            </span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Gestão da Plataforma</h2>
          <p className="text-slate-500 font-medium">Controle seus clientes finais, personalize a marca e gerencie planos.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 shadow-sm transition-all">
            <Settings size={18} /> Ajustar Marca
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all">
            <UserPlus size={18} /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all cursor-default">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-1">{stat.title}</p>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-200 shadow-sm p-8">
          <div className="flex justify-between items-center mb-8">
             <div>
                <h3 className="text-lg font-black text-slate-800">Clientes Recentes</h3>
                <p className="text-slate-500 text-sm">Empresas utilizando a sua versão da plataforma.</p>
             </div>
            <button className="text-sm font-bold text-blue-500 hover:text-blue-600">Ver Todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente (Empresa)</th>
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plano</th>
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">WhatsApps</th>
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentClients.map((client) => (
                  <tr key={client.id} className="group hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="py-4 font-bold text-slate-800">{client.name}</td>
                    <td className="py-4">
                      <span className="text-xs font-bold text-slate-500 border border-slate-200 px-2 py-1 rounded bg-slate-50">{client.plan}</span>
                    </td>
                    <td className="py-4 text-center font-bold text-slate-700">{client.instances}</td>
                    <td className="py-4 text-right">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg ${
                        client.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] border border-blue-500 shadow-xl shadow-blue-200 p-8 text-white">
            <h3 className="text-lg font-black mb-2">Personalização da Marca</h3>
            <p className="text-blue-100 text-sm mb-6">Logo atual, cores temáticas e configuração de domínio próprio.</p>
            
            <div className="p-4 bg-white/10 rounded-2xl mb-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 text-xl">
                FA
              </div>
              <div>
                <p className="text-xs font-bold text-blue-200 uppercase">Nome da Plataforma</p>
                <p className="font-bold">Fluow Ai (Padrão)</p>
              </div>
            </div>

            <div className="p-4 bg-white/10 rounded-2xl mb-6">
               <p className="text-xs font-bold text-blue-200 uppercase mb-1">Domínio Configurado</p>
               <p className="font-mono text-sm bg-black/20 px-3 py-2 rounded-lg">app.fluow.com.br</p>
            </div>
            
            <button className="w-full py-3 bg-white text-blue-600 rounded-xl text-xs font-black uppercase hover:bg-blue-50 transition-colors">
              Editar Whitelabel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
