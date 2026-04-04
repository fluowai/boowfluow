import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { Layout, Users, PlusCircle, LogOut, Settings, Globe, Shield, Activity } from 'lucide-react';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NewClient } from './pages/NewClient';
import { EditClient } from './pages/EditClient';

/**
 * APP-01: Componente Root do Painel Admin
 * Gerencia a navegação global e a persistência da Master Key.
 */

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!sessionStorage.getItem('ADMIN_API_KEY'));

  const handleLogin = (key: string) => {
    sessionStorage.setItem('ADMIN_API_KEY', key);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ADMIN_API_KEY');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex">
        {isAuthenticated && (
          <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800">
            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white">AG</div>
              <span className="font-bold text-white text-lg tracking-tight">Admin Console</span>
            </div>

            <nav className="flex-1 p-4 space-y-1 mt-4">
              <NavItem to="/" icon={<Users size={18} />} label="Clientes Whitelabel" />
              <NavItem to="/new" icon={<PlusCircle size={18} />} label="Provisionar Novo" />
              <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sistema</div>
              <NavItem to="/status" icon={<Activity size={18} />} label="Status Infra" />
              <NavItem to="/settings" icon={<Settings size={18} />} label="Configurações Core" />
            </nav>

            <div className="p-4 border-t border-slate-800">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                Encerrar Sessão
              </button>
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
            <Route path="/" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/new" element={isAuthenticated ? <NewClient /> : <Navigate to="/login" />} />
            <Route path="/edit/:id" element={isAuthenticated ? <EditClient /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

const NavItem: React.FC<{ to: string, icon: React.ReactNode, label: string }> = ({ to, icon, label }) => (
  <Link 
    to={to} 
    className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-slate-800 hover:text-white transition-all group"
  >
    <span className="text-slate-500 group-hover:text-indigo-400 transition-colors">{icon}</span>
    {label}
  </Link>
);

export default App;
