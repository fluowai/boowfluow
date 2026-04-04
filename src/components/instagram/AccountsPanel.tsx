import { useState } from 'react';
import { User, Lock, Trash2, LogIn, LogOut, RefreshCw, Check, X } from 'lucide-react';
import { InstagramAccount } from '../../types/instagram';

interface Props {
  accounts: InstagramAccount[];
  onAdd: (username: string, password: string, proxy?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onLogin: (id: string) => Promise<{ challenge?: boolean; type?: string }>;
  onLogout: (id: string) => Promise<void>;
  onVerifyChallenge: (id: string, code: string) => Promise<void>;
  loading?: boolean;
}

export function InstagramAccountsPanel({ 
  accounts, 
  onAdd, 
  onDelete, 
  onLogin, 
  onLogout, 
  onVerifyChallenge,
  loading 
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [proxy, setProxy] = useState('');
  const [challengeAccountId, setChallengeAccountId] = useState<string | null>(null);
  const [challengeCode, setChallengeCode] = useState('');
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    try {
      await onAdd(username, password, proxy || undefined);
      setUsername('');
      setPassword('');
      setProxy('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (id: string) => {
    setLoggingIn(id);
    try {
      const result = await onLogin(id);
      if (result.challenge) {
        setChallengeAccountId(id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoggingIn(null);
    }
  };

  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeAccountId || !challengeCode) return;
    try {
      await onVerifyChallenge(challengeAccountId, challengeCode);
      setChallengeAccountId(null);
      setChallengeCode('');
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'challenge': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <User className="w-5 h-5" />
          Contas Instagram
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {showAddForm ? 'Cancelar' : 'Adicionar Conta'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Proxy (opcional)</label>
              <input
                type="text"
                value={proxy}
                onChange={(e) => setProxy(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="http://proxy:port"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Criar Conta
            </button>
          </div>
        </form>
      )}

      {challengeAccountId && (
        <form onSubmit={handleChallengeSubmit} className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Verificação de Segurança
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Insira o código enviado para seu email ou SMS
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={challengeCode}
              onChange={(e) => setChallengeCode(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg"
              placeholder="Código de verificação"
              required
            />
            <button
              type="submit"
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Verificar
            </button>
            <button
              type="button"
              onClick={() => setChallengeAccountId(null)}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
      )}

      <div className="space-y-3">
        {accounts.length === 0 && !loading && (
          <p className="text-gray-500 text-center py-8">
            Nenhuma conta cadastrada
          </p>
        )}
        
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(account.status)}`} />
              <div>
                <p className="font-medium">{account.username}</p>
                <p className="text-sm text-gray-500">
                  {account.status === 'active' ? 'Conectado' : 
                   account.status === 'challenge' ? 'Verificação pendente' : 'Desconectado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {account.status === 'active' ? (
                <button
                  onClick={() => onLogout(account.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Desconectar"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => handleLogin(account.id)}
                  disabled={loggingIn === account.id}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                  title="Conectar"
                >
                  {loggingIn === account.id ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogIn className="w-5 h-5" />
                  )}
                </button>
              )}
              <button
                onClick={() => onDelete(account.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Remover"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
