import { useState, useEffect, useCallback } from 'react';
import { Search, User, Hash, MapPin, MessageCircle, Send, Heart, Bookmark, MoreHorizontal, Image, Video, Loader2, TrendingUp, Settings, Zap } from 'lucide-react';
import { instagramApi } from '../../services/instagram/api';
import { InstagramAccount, InstagramUser, InstagramMedia, DirectInbox, SearchResult } from '../../types/instagram';
import { InstagramAccountsPanel } from '../../components/instagram/AccountsPanel';
import { GrowthPanel } from '../../components/instagram/growth/GrowthPanel';
import { useInstagramAccounts } from '../../hooks/instagram/useAccounts';

type TabType = 'accounts' | 'feed' | 'search' | 'inbox' | 'publish' | 'explorer' | 'growth';

export function InstagramPage() {
  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [selectedAccount, setSelectedAccount] = useState<InstagramAccount | null>(null);
  const [profile, setProfile] = useState<InstagramUser | null>(null);
  const [feed, setFeed] = useState<InstagramMedia[]>([]);
  const [inbox, setInbox] = useState<DirectInbox | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'users' | 'hashtags' | 'locations' | 'blended'>('users');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [publishFile, setPublishFile] = useState<File | null>(null);
  const [publishCaption, setPublishCaption] = useState('');
  const [publishing, setPublishing] = useState(false);
  
  const {
    accounts,
    loading: accountsLoading,
    addAccount,
    deleteAccount,
    login,
    logout,
    verifyChallenge,
    refetch
  } = useInstagramAccounts();

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      const active = accounts.find(a => a.status === 'active');
      if (active) {
        setSelectedAccount(active);
      }
    }
  }, [accounts, selectedAccount]);

  const loadProfile = useCallback(async () => {
    if (!selectedAccount || selectedAccount.status !== 'active') return;
    try {
      const data = await instagramApi.profile.get(selectedAccount.id);
      setProfile(data);
    } catch (err) {
      console.error(err);
    }
  }, [selectedAccount]);

  const loadFeed = useCallback(async () => {
    if (!selectedAccount || selectedAccount.status !== 'active') return;
    setLoading(true);
    try {
      const data = await instagramApi.feed.timeline(selectedAccount.id);
      setFeed(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  const loadInbox = useCallback(async () => {
    if (!selectedAccount || selectedAccount.status !== 'active') return;
    setLoading(true);
    try {
      const data = await instagramApi.direct.inbox(selectedAccount.id);
      setInbox(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  const handleSearch = async () => {
    if (!selectedAccount || !searchQuery) return;
    setLoading(true);
    try {
      let results: SearchResult | null = null;
      switch (searchType) {
        case 'users':
          results = await instagramApi.search.users(selectedAccount.id, searchQuery);
          break;
        case 'hashtags':
          results = await instagramApi.search.hashtags(selectedAccount.id, searchQuery);
          break;
        case 'locations':
          results = await instagramApi.search.locations(selectedAccount.id, searchQuery);
          break;
        case 'blended':
          results = await instagramApi.search.blended(selectedAccount.id, searchQuery);
          break;
      }
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (type: 'photo' | 'story') => {
    if (!selectedAccount || !publishFile) return;
    setPublishing(true);
    try {
      if (type === 'photo') {
        await instagramApi.publish.photo(selectedAccount.id, publishFile, publishCaption);
      } else {
        await instagramApi.publish.story(selectedAccount.id, publishFile, publishCaption);
      }
      setPublishFile(null);
      setPublishCaption('');
    } catch (err) {
      console.error(err);
    } finally {
      setPublishing(false);
    }
  };

  useEffect(() => {
    if (selectedAccount && activeTab === 'feed') {
      loadFeed();
    } else if (selectedAccount && activeTab === 'inbox') {
      loadInbox();
    } else if (selectedAccount && activeTab === 'search') {
      loadProfile();
    }
  }, [selectedAccount, activeTab, loadFeed, loadInbox, loadProfile]);

  const tabs = [
    { id: 'accounts', label: 'Contas', icon: User },
    { id: 'feed', label: 'Feed', icon: Image },
    { id: 'search', label: 'Buscar', icon: Search },
    { id: 'inbox', label: 'Mensagens', icon: MessageCircle },
    { id: 'publish', label: 'Publicar', icon: Send },
    { id: 'explorer', label: 'API Explorer', icon: Hash },
    { id: 'growth', label: 'Growth', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold">Instagram</h1>
          {selectedAccount && (
            <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm font-medium">{selectedAccount.username}</span>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <div className="w-48 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow p-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1">
            {!selectedAccount || selectedAccount.status !== 'active' ? (
              <InstagramAccountsPanel
                accounts={accounts}
                onAdd={addAccount}
                onDelete={deleteAccount}
                onLogin={login}
                onLogout={logout}
                onVerifyChallenge={verifyChallenge}
                loading={accountsLoading}
              />
            ) : (
              <>
                {activeTab === 'accounts' && (
                  <InstagramAccountsPanel
                    accounts={accounts}
                    onAdd={addAccount}
                    onDelete={deleteAccount}
                    onLogin={login}
                    onLogout={logout}
                    onVerifyChallenge={verifyChallenge}
                    loading={accountsLoading}
                  />
                )}

                {activeTab === 'feed' && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Feed</h2>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4">
                        {feed.slice(0, 12).map((media) => (
                          <div key={media.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={media.thumbnail_url || media.display_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'search' && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Buscar</h2>
                    
                    {profile && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <img
                            src={profile.profile_pic_url}
                            alt={profile.username}
                            className="w-16 h-16 rounded-full"
                          />
                          <div>
                            <p className="font-semibold">{profile.username}</p>
                            <p className="text-gray-600">{profile.full_name}</p>
                            <p className="text-sm text-gray-500">
                              {profile.follower_count?.toLocaleString()} seguidores
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mb-4">
                      {(['users', 'hashtags', 'locations', 'blended'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setSearchType(type)}
                          className={`px-3 py-1 rounded-full text-sm ${
                            searchType === type
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {type === 'users' && 'Usuários'}
                          {type === 'hashtags' && 'Hashtags'}
                          {type === 'locations' && 'Locais'}
                          {type === 'blended' && 'Todos'}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder={`Buscar ${searchType}...`}
                        className="flex-1 px-4 py-2 border rounded-lg"
                      />
                      <button
                        onClick={handleSearch}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                    </div>

                    {loading && (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    )}

                    {searchResults && (
                      <div className="space-y-2">
                        {searchResults.users?.map((user) => (
                          <div key={user.pk} className="flex items-center gap-3 p-3 border rounded-lg">
                            <img
                              src={user.profile_pic_url}
                              alt={user.username}
                              className="w-10 h-10 rounded-full"
                            />
                            <div>
                              <p className="font-medium">{user.username}</p>
                              <p className="text-sm text-gray-500">{user.full_name}</p>
                            </div>
                          </div>
                        ))}
                        {searchResults.hashtags?.map((tag) => (
                          <div key={tag.id} className="flex items-center gap-3 p-3 border rounded-lg">
                            <Hash className="w-8 h-8 text-pink-500" />
                            <div>
                              <p className="font-medium">#{tag.name}</p>
                              <p className="text-sm text-gray-500">{tag.media_count?.toLocaleString()} posts</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'inbox' && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Mensagens</h2>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin" />
                      </div>
                    ) : inbox ? (
                      <div className="space-y-2">
                        {inbox.threads.map((thread) => (
                          <div key={thread.thread_id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              {thread.users[0] ? (
                                <img
                                  src={thread.users[0].profile_pic_url}
                                  alt=""
                                  className="w-full h-full rounded-full"
                                />
                              ) : (
                                <MessageCircle className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {thread.is_group ? thread.title : thread.users[0]?.username}
                              </p>
                              <p className="text-sm text-gray-500 truncate">
                                {thread.pending ? 'Solicitação pendente' : 'Conversa'}
                              </p>
                            </div>
                          </div>
                        ))}
                        {inbox.threads.length === 0 && (
                          <p className="text-gray-500 text-center py-8">Nenhuma mensagem</p>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                {activeTab === 'publish' && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Publicar</h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Arquivo</label>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={(e) => setPublishFile(e.target.files?.[0] || null)}
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Legenda</label>
                        <textarea
                          value={publishCaption}
                          onChange={(e) => setPublishCaption(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg"
                          rows={3}
                          placeholder="Escreva uma legenda..."
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePublish('photo')}
                          disabled={!publishFile || publishing}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                        >
                          Publicar Foto
                        </button>
                        <button
                          onClick={() => handlePublish('story')}
                          disabled={!publishFile || publishing}
                          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
                        >
                          Publicar Story
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'explorer' && (
                  <InstagramApiExplorer accountId={selectedAccount.id} />
                )}

                {activeTab === 'growth' && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <GrowthPanel accountId={selectedAccount.id} isActive={selectedAccount.status === 'active'} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InstagramApiExplorer({ accountId }: { accountId: string }) {
  const [endpoint, setEndpoint] = useState('GET');
  const [method, setMethod] = useState('user');
  const [response, setResponse] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ method: string; result: unknown }>>([]);

  const endpoints = [
    { method: 'user', path: 'GET', desc: 'Perfil do usuário' },
    { method: 'followers', path: 'GET', desc: 'Lista de seguidores' },
    { method: 'following', path: 'GET', desc: 'Lista de seguindo' },
    { method: 'timeline', path: 'GET', desc: 'Feed do usuário' },
    { method: 'liked', path: 'GET', desc: 'Posts curtidos' },
    { method: 'saved', path: 'GET', desc: 'Posts salvos' },
    { method: 'discover', path: 'GET', desc: 'Descobrir' },
    { method: 'inbox', path: 'GET', desc: 'Caixa de entrada' },
  ];

  const executeRequest = async () => {
    setLoading(true);
    try {
      let result: unknown = null;
      switch (method) {
        case 'user':
          result = await instagramApi.profile.get(accountId);
          break;
        case 'followers':
          result = await instagramApi.followers.list(accountId);
          break;
        case 'following':
          result = await instagramApi.following.list(accountId);
          break;
        case 'timeline':
          result = await instagramApi.feed.timeline(accountId);
          break;
        case 'liked':
          result = await instagramApi.feed.liked(accountId);
          break;
        case 'saved':
          result = await instagramApi.feed.saved(accountId);
          break;
        case 'discover':
          result = await instagramApi.feed.discover(accountId);
          break;
        case 'inbox':
          result = await instagramApi.direct.inbox(accountId);
          break;
      }
      setResponse(result);
      setHistory([{ method, result }, ...history.slice(0, 9)]);
    } catch (err) {
      setResponse({ error: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Instagram API Explorer</h2>
      <p className="text-sm text-gray-600 mb-4">
        Explore todos os métodos da API Instagram Private API
      </p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {endpoints.map((ep) => (
          <button
            key={ep.method}
            onClick={() => {
              setMethod(ep.method);
              setEndpoint(ep.path);
            }}
            className={`p-3 border rounded-lg text-left ${
              method === ep.method ? 'border-blue-500 bg-blue-50' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-gray-200 text-xs rounded">{ep.path}</span>
              <span className="font-medium text-sm">{ep.method}</span>
            </div>
            <p className="text-xs text-gray-500">{ep.desc}</p>
          </button>
        ))}
      </div>

      <button
        onClick={executeRequest}
        disabled={loading}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50 mb-6"
      >
        {loading ? 'Executando...' : `Executar ${method}`}
      </button>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium mb-2">Requisição</h3>
          <pre className="p-4 bg-gray-100 rounded-lg text-sm overflow-auto">
            {`${endpoint} /accounts/${accountId}/${method}`}
          </pre>
        </div>
        <div>
          <h3 className="font-medium mb-2">Resposta</h3>
          <pre className="p-4 bg-gray-100 rounded-lg text-sm overflow-auto max-h-96">
            {response ? JSON.stringify(response, null, 2) : 'Nenhuma resposta ainda'}
          </pre>
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium mb-2">Histórico</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => setResponse(h.result)}
                className="w-full p-2 text-left border rounded hover:bg-gray-50"
              >
                <span className="font-medium">{h.method}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
