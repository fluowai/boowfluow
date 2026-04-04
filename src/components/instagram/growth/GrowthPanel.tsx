import { useState, useEffect } from 'react';
import { 
  Play, Pause, Settings, Users, Heart, MessageSquare, 
  UserPlus, UserMinus, TrendingUp, BarChart3, Calendar,
  Hash, Loader2, RefreshCw, AlertTriangle, Check, X
} from 'lucide-react';
import { instagramApi } from '../../../services/instagram/api';

import { supabase } from '../../../lib/supabase';

// Removida a MASTER_API_KEY global do frontend por razões de segurança.

interface GrowthConfig {
  maxFollowsPerHour: number;
  maxUnfollowsPerHour: number;
  maxLikesPerHour: number;
  maxCommentsPerHour: number;
  followDelay: number;
  unfollowDelay: number;
  likeDelay: number;
  commentDelay: number;
  unfollowAfterDays: number;
  keepFollowers: boolean;
  skipPrivate: boolean;
}

interface GrowthStats {
  follows: number;
  unfollows: number;
  likes: number;
  comments: number;
  errors: number;
  lastAction: string | null;
}

interface Props {
  accountId: string;
  isActive: boolean;
}

export function GrowthPanel({ accountId, isActive }: Props) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'routines' | 'schedule' | 'config'>('dashboard');
  const [config, setConfig] = useState<GrowthConfig | null>(null);
  const [stats, setStats] = useState<GrowthStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [routineLoading, setRoutineLoading] = useState(false);
  const [nonFollowers, setNonFollowers] = useState<any[]>([]);
  const [whoDontFollow, setWhoDontFollow] = useState<any[]>([]);

  const [routineForm, setRoutineForm] = useState({
    type: 'follow-hashtag',
    hashtag: '',
    count: 10,
    minFollowers: 100,
    maxFollowers: 10000
  });

  const [scheduleForm, setScheduleForm] = useState({
    type: 'photo',
    caption: '',
    scheduledDate: '',
    scheduledTime: ''
  });

  useEffect(() => {
    if (isActive && accountId) {
      loadGrowthData();
    }
  }, [accountId, isActive]);

  const loadGrowthData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      
      const [configRes, statsRes] = await Promise.all([
        fetch(`/api/instagram/accounts/${accountId}/growth/config`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/instagram/accounts/${accountId}/growth/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      const configData = await configRes.json();
      const statsData = await statsRes.json();
      
      if (configData.success) setConfig(configData.config);
      if (statsData.success) setStats(statsData.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pauseGrowth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/instagram/accounts/${accountId}/growth/pause`, { 
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
    });
    loadGrowthData();
  };

  const resumeGrowth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/instagram/accounts/${accountId}/growth/resume`, { 
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
    });
    loadGrowthData();
  };

  const runRoutine = async () => {
    setRoutineLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      if (routineForm.type === 'follow-hashtag') {
        await fetch(`/api/instagram/accounts/${accountId}/growth/routine/follow-hashtag`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(routineForm)
        });
      } else if (routineForm.type === 'unfollow-non-followers') {
        await fetch(`/api/instagram/accounts/${accountId}/growth/routine/unfollow-non-followers`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ count: routineForm.count })
        });
      }
      loadGrowthData();
    } catch (err) {
      console.error(err);
    } finally {
      setRoutineLoading(false);
    }
  };

  const loadNonFollowers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/instagram/accounts/${accountId}/growth/non-followers`, {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      if (data.success) setNonFollowers(data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const loadWhoDontFollow = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/instagram/accounts/${accountId}/growth/who-dont-follow-back`, {
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      if (data.success) setWhoDontFollow(data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const schedulePost = async () => {
    try {
      const scheduledAt = new Date(`${scheduleForm.scheduledDate}T${scheduleForm.scheduledTime}`);
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/instagram/accounts/${accountId}/schedule/post`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({
          type: scheduleForm.type,
          caption: scheduleForm.caption,
          scheduledAt: scheduledAt.toISOString()
        })
      });
      alert('Post agendado com sucesso!');
    } catch (err) {
      console.error(err);
    }
  };

  const updateConfig = async (key: string, value: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`/api/instagram/accounts/${accountId}/growth/config`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify({ [key]: value })
      });
      loadGrowthData();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isActive) {
    return (
      <div className="p-6 text-center text-gray-500">
        Conecte uma conta para acessar o módulo de crescimento
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Growth Machine</h2>
        <div className="flex gap-2">
          <button
            onClick={pauseGrowth}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg flex items-center gap-2"
          >
            <Pause className="w-4 h-4" />
            Pausar
          </button>
          <button
            onClick={resumeGrowth}
            className="px-4 py-2 bg-green-500 text-white rounded-lg flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Retomar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={UserPlus} label="Seguindo" value={stats?.follows || 0} color="bg-blue-100 text-blue-600" />
        <StatCard icon={UserMinus} label="Deixando de seguir" value={stats?.unfollows || 0} color="bg-red-100 text-red-600" />
        <StatCard icon={Heart} label="Curtidas" value={stats?.likes || 0} color="bg-pink-100 text-pink-600" />
        <StatCard icon={AlertTriangle} label="Erros" value={stats?.errors || 0} color="bg-yellow-100 text-yellow-600" />
      </div>

      <div className="flex gap-2 border-b">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'routines', label: 'Rotinas', icon: Settings },
          { id: 'schedule', label: 'Agendar', icon: Calendar },
          { id: 'config', label: 'Configurações', icon: Settings }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 flex items-center gap-2 border-b-2 ${
              activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="font-semibold mb-4">Não te seguem de volta</h3>
            <button onClick={loadNonFollowers} className="mb-4 text-sm text-blue-600">
              <RefreshCw className="w-4 h-4 inline mr-1" />
              Carregar lista
            </button>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {nonFollowers.slice(0, 10).map(user => (
                <div key={user.userId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>@{user.username}</span>
                  <span className="text-sm text-gray-500">{user.followers} seguidores</span>
                </div>
              ))}
              {nonFollowers.length === 0 && <p className="text-gray-500 text-sm">Carregue a lista</p>}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <h3 className="font-semibold mb-4">Você não segue de volta</h3>
            <button onClick={loadWhoDontFollow} className="mb-4 text-sm text-blue-600">
              <RefreshCw className="w-4 h-4 inline mr-1" />
              Carregar lista
            </button>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {whoDontFollow.slice(0, 10).map(user => (
                <div key={user.userId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>@{user.username}</span>
                  <span className="text-sm text-gray-500">{user.followers} seguidores</span>
                </div>
              ))}
              {whoDontFollow.length === 0 && <p className="text-gray-500 text-sm">Carregue a lista</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'routines' && (
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="font-semibold mb-4">Executar Rotinas</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Rotina</label>
              <select
                value={routineForm.type}
                onChange={e => setRoutineForm({ ...routineForm, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="follow-hashtag">Seguir usuários por hashtag</option>
                <option value="unfollow-non-followers">Deixar de seguir não seguidores</option>
              </select>
            </div>

            {routineForm.type === 'follow-hashtag' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Hashtag</label>
                  <input
                    type="text"
                    value={routineForm.hashtag}
                    onChange={e => setRoutineForm({ ...routineForm, hashtag: e.target.value })}
                    placeholder="tecnologia"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Mín. Seguidores</label>
                    <input
                      type="number"
                      value={routineForm.minFollowers}
                      onChange={e => setRoutineForm({ ...routineForm, minFollowers: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Máx. Seguidores</label>
                    <input
                      type="number"
                      value={routineForm.maxFollowers}
                      onChange={e => setRoutineForm({ ...routineForm, maxFollowers: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Quantidade</label>
              <input
                type="number"
                value={routineForm.count}
                onChange={e => setRoutineForm({ ...routineForm, count: parseInt(e.target.value) })}
                min={1}
                max={50}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <button
              onClick={runRoutine}
              disabled={routineLoading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {routineLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              Executar Rotina
            </button>
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="font-semibold mb-4">Agendar Publicação</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo</label>
              <select
                value={scheduleForm.type}
                onChange={e => setScheduleForm({ ...scheduleForm, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="photo">Foto</option>
                <option value="video">Vídeo</option>
                <option value="story">Story</option>
                <option value="album">Álbum</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Legenda</label>
              <textarea
                value={scheduleForm.caption}
                onChange={e => setScheduleForm({ ...scheduleForm, caption: e.target.value })}
                placeholder="Sua legenda aqui..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Data</label>
                <input
                  type="date"
                  value={scheduleForm.scheduledDate}
                  onChange={e => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Hora</label>
                <input
                  type="time"
                  value={scheduleForm.scheduledTime}
                  onChange={e => setScheduleForm({ ...scheduleForm, scheduledTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <button
              onClick={schedulePost}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              Agendar Publicação
            </button>
          </div>
        </div>
      )}

      {activeTab === 'config' && config && (
        <div className="bg-white rounded-lg p-6 shadow">
          <h3 className="font-semibold mb-4">Configurações de Segurança</h3>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Máx. Seguir/hora</label>
              <input
                type="number"
                value={config.maxFollowsPerHour}
                onChange={e => updateConfig('maxFollowsPerHour', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Máx. Deixar de seguir/hora</label>
              <input
                type="number"
                value={config.maxUnfollowsPerHour}
                onChange={e => updateConfig('maxUnfollowsPerHour', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Máx. Curtidas/hora</label>
              <input
                type="number"
                value={config.maxLikesPerHour}
                onChange={e => updateConfig('maxLikesPerHour', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Máx. Comentários/hora</label>
              <input
                type="number"
                value={config.maxCommentsPerHour}
                onChange={e => updateConfig('maxCommentsPerHour', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Delay seguir (ms)</label>
              <input
                type="number"
                value={config.followDelay}
                onChange={e => updateConfig('followDelay', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Delay curtir (ms)</label>
              <input
                type="number"
                value={config.likeDelay}
                onChange={e => updateConfig('likeDelay', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.skipPrivate}
                onChange={e => updateConfig('skipPrivate', e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-sm">Pular contas privadas</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.keepFollowers}
                onChange={e => updateConfig('keepFollowers', e.target.checked)}
                className="w-5 h-5"
              />
              <span className="text-sm">Manter quem me segue</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow">
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
