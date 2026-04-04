import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  MoreVertical,
  Shield,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function UserManagementPanel() {
  const [activeTab, setActiveTab] = useState<'ativos' | 'convites'>('ativos');

  const users = [
    { id: '1', name: 'Paulo Silva', email: 'paulo@exemplo.com', role: 'Admin', status: 'Ativo', lastLogin: 'Agora mesmo' },
    { id: '2', name: 'Carla Dias', email: 'carla@exemplo.com', role: 'Equipe', status: 'Ativo', lastLogin: 'Ontem' },
    { id: '3', name: 'Marcos Santos', email: 'marcos@exemplo.com', role: 'Equipe', status: 'Inativo', lastLogin: 'Há 5 dias' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Equipe & Usuários</h2>
          <p className="text-slate-500 font-medium text-sm">Gerencie quem tem acesso à sua empresa.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all">
          <UserPlus size={18} /> Adicionar Usuário
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="border-b border-slate-100 px-6 py-4 flex gap-6">
          <button 
            onClick={() => setActiveTab('ativos')}
            className={cn(
              "text-sm font-bold pb-4 -mb-4 border-b-2 transition-all",
              activeTab === 'ativos' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-700"
            )}
          >
            Usuários Ativos (3)
          </button>
          <button 
            onClick={() => setActiveTab('convites')}
            className={cn(
              "text-sm font-bold pb-4 -mb-4 border-b-2 transition-all",
              activeTab === 'convites' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-700"
            )}
          >
            Convites Pendentes (0)
          </button>
        </div>

        <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <div className="relative w-full max-w-sm">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou email..." 
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
            </div>
            <div className="flex gap-2">
                <select className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-slate-300 outline-none">
                    <option value="all">Todos os Cargos</option>
                    <option value="admin">Admins</option>
                    <option value="equipe">Equipe</option>
                </select>
            </div>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 rounded-xl">
                <th className="px-4 py-3 rounded-l-xl">Usuário</th>
                <th className="px-4 py-3">Cargo (Role)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Último Login</th>
                <th className="px-4 py-3 text-right rounded-r-xl">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((user) => (
                <tr key={user.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black">
                            {user.name.charAt(0)}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800">{user.name}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                        "flex items-center gap-1.5 w-max px-2.5 py-1 rounded-lg text-xs font-bold",
                        user.role === 'Admin' ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"
                    )}>
                        <Shield size={14} /> {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                        "flex items-center gap-1.5 w-max text-xs font-bold",
                        user.status === 'Ativo' ? "text-emerald-500" : "text-rose-500"
                    )}>
                        {user.status === 'Ativo' ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500 font-medium">
                    {user.lastLogin}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
