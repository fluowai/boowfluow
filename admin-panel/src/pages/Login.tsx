import React, { useState } from 'react';
import { Shield, Key, Eye, EyeOff } from 'lucide-react';

/**
 * PAGE-01: Login do Painel Administrativo
 * Proteção simples via Master Key (ADMIN_API_KEY).
 */

export const Login: React.FC<{ onLogin: (key: string) => void }> = ({ onLogin }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onLogin(apiKey);
    } else {
      setIsError(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
            <Shield className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Fluow Ai Admin</h2>
          <p className="text-slate-400 text-sm">Autenticação Master Key exigida</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Admin API Key</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="text-slate-500 group-focus-within:text-indigo-500 transition-colors" size={18} />
              </div>
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={`w-full bg-slate-900 border-slate-700 text-white pl-10 pr-10 py-3 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none ${isError ? 'ring-2 ring-red-500' : ''}`}
                placeholder="Insira sua chave administrativa..."
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors"
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-600/20 transform transition-all active:scale-95 duration-200"
          >
            Acessar Console
          </button>
        </form>

        <div className="pt-4 text-center">
          <p className="text-xs text-slate-500">
            Esta área é restrita a administradores. Todas as operações são logadas e auditadas remotamente.
          </p>
        </div>
      </div>
    </div>
  );
};
