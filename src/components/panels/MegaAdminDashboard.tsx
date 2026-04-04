import React from 'react';
import { 
  Building2, 
  Users, 
  Activity, 
  DollarSign, 
  Settings, 
  ArrowUpRight,
  Database,
  Server
} from 'lucide-react';
import { motion } from 'motion/react';

export function MegaAdminDashboard() {
  const stats = [
    { title: 'Receita Total Recorrente', value: 'R$ 485.2K', change: '+12.5%', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-100' },
    { title: 'Whitelabels Ativos', value: '42', change: '+3', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-100' },
    { title: 'Clientes Finais (Admins)', value: '1.248', change: '+156', icon: Users, color: 'text-purple-500', bg: 'bg-purple-100' },
    { title: 'Chamadas LLM (Mês)', value: '4.2M', change: '+850K', icon: Database, color: 'text-amber-500', bg: 'bg-amber-100' },
  ];

  const whitelabels = [
    { id: '1', name: 'Zappy Sistemas', owner: 'Carlos Roberto', clients: 450, mrr: 'R$ 85.000', status: 'Ativo' },
    { id: '2', name: 'TechZap', owner: 'Fernanda Lima', clients: 310, mrr: 'R$ 62.000', status: 'Ativo' },
    { id: '3', name: 'ConnectaVendas', owner: 'João Pedro', clients: 125, mrr: 'R$ 28.500', status: 'Atrasado' },
    { id: '4', name: 'BotFlow AI', owner: 'Amanda Costa', clients: 85, mrr: 'R$ 15.200', status: 'Ativo' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 font-black text-[10px] uppercase rounded-full tracking-widest flex items-center gap-2">
              <Server size={12} /> Visão Sistema Global
            </span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Root Dashboard</h2>
          <p className="text-slate-500 font-medium">Controle executivo de todos os Whitelabels e instâncias da plataforma.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 shadow-xl transition-all">
          <Building2 size={18} /> Novo Whitelabel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className="flex items-center gap-1 text-emerald-500 font-bold text-sm bg-emerald-50 px-2.5 py-1 rounded-lg">
                <ArrowUpRight size={14} /> {stat.change}
              </span>
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
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Building2 className="text-blue-500" /> Principais Whitelabels
            </h3>
            <button className="text-sm font-bold text-blue-500 hover:text-blue-600">Ver Todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Empresa (Whitelabel)</th>
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Dono</th>
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Clientes Finais</th>
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">MRR Gerado</th>
                  <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {whitelabels.map((wt) => (
                  <tr key={wt.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-800">{wt.name}</td>
                    <td className="py-4 text-slate-500">{wt.owner}</td>
                    <td className="py-4 font-bold text-slate-700">{wt.clients}</td>
                    <td className="py-4 font-black text-emerald-600">{wt.mrr}</td>
                    <td className="py-4 text-right">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg ${
                        wt.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {wt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] border border-slate-800 p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all">
              <Activity size={120} />
            </div>
            <h3 className="text-lg font-black flex items-center gap-2 mb-2 relative z-10">
              <Activity className="text-amber-400" /> Saúde do Sistema
            </h3>
            <p className="text-slate-400 text-sm mb-6 relative z-10">Monitoramento global da infraestrutura Cloud e banco de dados.</p>
            
            <div className="space-y-4 relative z-10">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
                  <span>Banco de Dados (Supabase)</span>
                  <span className="text-amber-400">45%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-amber-400 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
                  <span>Carga de CPU (Workers WhatsApp)</span>
                  <span className="text-emerald-400">22%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-emerald-400 h-2 rounded-full" style={{ width: '22%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-2">
                  <span>Armazenamento (S3/Media)</span>
                  <span className="text-rose-400">82%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-rose-400 h-2 rounded-full" style={{ width: '82%' }}></div>
                </div>
              </div>
            </div>
            
            <button className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors">
              VER RELATÓRIO TÉCNICO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
