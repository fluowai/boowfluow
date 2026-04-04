import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  ImageIcon, 
  MessageSquare,
  AlertCircle,
  Save,
  Check,
  Loader2,
  X,
  Send,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ScheduledPost {
  id: string;
  media_type: 'photo' | 'video' | 'story' | 'album';
  caption: string;
  media_url: string;
  scheduled_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
}

export function SchedulerPanel({ accountId }: { accountId: string }) {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newPost, setNewPost] = useState({
    media_type: 'photo' as const,
    caption: '',
    media_url: '',
    scheduled_date: '',
    scheduled_time: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (accountId) fetchPosts();
  }, [accountId]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('instagram_scheduled_posts')
      .select('*')
      .eq('account_id', accountId)
      .order('scheduled_at', { ascending: true });
    
    if (data) setPosts(data);
    setLoading(false);
  };

  const handleSchedule = async () => {
    if (!newPost.media_url || !newPost.scheduled_date || !newPost.scheduled_time) return;
    setSaving(true);
    
    const scheduledAt = new Date(`${newPost.scheduled_date}T${newPost.scheduled_time}`);
    
    const { error } = await supabase
      .from('instagram_scheduled_posts')
      .insert({
        account_id: accountId,
        media_type: newPost.media_type,
        caption: newPost.caption,
        media_url: newPost.media_url,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending'
      });

    if (!error) {
      setShowAdd(false);
      setNewPost({ media_type: 'photo', caption: '', media_url: '', scheduled_date: '', scheduled_time: '' });
      fetchPosts();
    }
    setSaving(false);
  };

  const deletePost = async (id: string) => {
    if (!confirm('Cancelar este agendamento?')) return;
    const { error } = await supabase
      .from('instagram_scheduled_posts')
      .delete()
      .eq('id', id);
    if (!error) fetchPosts();
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h3 className="text-2xl font-black flex items-center gap-3 text-slate-800 tracking-tight">
            <Calendar size={24} className="text-pink-500" />
            Agendamento de Posts
          </h3>
          <p className="text-slate-500 text-sm font-medium mt-1">Planeje seu feed para as próximas semanas.</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="px-6 py-3 bg-pink-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-pink-100 flex items-center gap-2 hover:scale-105 transition-transform"
        >
          {showAdd ? 'Fechar' : <><Plus size={18} /> Agendar Agora</>}
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-12"
          >
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Preview Area */}
              <div className="space-y-4">
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400">Preview da Mídia</label>
                <div className="aspect-square bg-slate-200 rounded-3xl overflow-hidden relative flex items-center justify-center border-4 border-white shadow-lg">
                  {newPost.media_url ? (
                    <img src={newPost.media_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-8">
                       <ImageIcon size={48} className="text-slate-400 mx-auto mb-3" />
                       <p className="text-xs font-bold text-slate-500">Insira a URL ou Base64 da imagem abaixo</p>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                    {newPost.media_type}
                  </div>
                </div>
                <input 
                  type="text" 
                  value={newPost.media_url}
                  onChange={e => setNewPost({...newPost, media_url: e.target.value})}
                  placeholder="URL da Imagem ou Base64"
                  className="w-full px-5 py-4 rounded-2xl border-white bg-white shadow-sm focus:ring-2 focus:ring-pink-500/20 transition-all font-bold text-sm"
                />
              </div>

              {/* Settings Area */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Legenda do Post</label>
                  <textarea 
                    value={newPost.caption}
                    onChange={e => setNewPost({...newPost, caption: e.target.value})}
                    rows={4}
                    placeholder="Escreva algo inspirador... #Estilo #DigitalMarketing"
                    className="w-full px-5 py-4 rounded-2xl border-white bg-white shadow-sm focus:ring-2 focus:ring-pink-500/20 transition-all font-bold text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Data</label>
                    <input 
                      type="date" 
                      value={newPost.scheduled_date}
                      onChange={e => setNewPost({...newPost, scheduled_date: e.target.value})}
                      className="w-full px-5 py-4 rounded-2xl border-white bg-white shadow-sm focus:ring-2 focus:ring-pink-500/20 transition-all font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Horário</label>
                    <input 
                      type="time" 
                      value={newPost.scheduled_time}
                      onChange={e => setNewPost({...newPost, scheduled_time: e.target.value})}
                      className="w-full px-5 py-4 rounded-2xl border-white bg-white shadow-sm focus:ring-2 focus:ring-pink-500/20 transition-all font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setNewPost({...newPost, media_type: 'photo'})}
                    className={cn("flex-1 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all", newPost.media_type === 'photo' ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100")}
                  >
                    Feed Post
                  </button>
                  <button 
                    onClick={() => setNewPost({...newPost, media_type: 'story'})}
                    className={cn("flex-1 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all", newPost.media_type === 'story' ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100")}
                  >
                    Story
                  </button>
                </div>

                <button 
                  onClick={handleSchedule}
                  disabled={saving}
                  className="w-full py-5 bg-gradient-to-r from-pink-600 to-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-pink-500/20 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" /> : <><Clock size={18} /> Salvar Agendamento</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-pink-500 mx-auto mb-4" />
            <p className="font-bold text-slate-400">Buscando cronograma...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="col-span-full bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] p-16 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-300">
               <Calendar size={32} />
            </div>
            <h4 className="text-lg font-black text-slate-900 mb-1">Fila de espera vazia</h4>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">Seus próximos posts aparecerão aqui. Agende um acima para começar.</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 hover:shadow-xl hover:shadow-slate-100 transition-all group overflow-hidden">
              <div className="aspect-square rounded-2xl bg-slate-100 mb-4 overflow-hidden relative">
                 <img src={post.media_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                 <div className="absolute top-3 left-3 px-3 py-1 bg-black/40 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                    {post.media_type}
                 </div>
                 <div className={cn(
                    "absolute bottom-3 right-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full",
                    post.status === 'completed' ? "bg-emerald-500 text-white" : 
                    post.status === 'failed' ? "bg-red-500 text-white" : "bg-white/90 text-slate-900"
                 )}>
                    {post.status}
                 </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-2">
                       <Clock size={12} className="text-pink-500" /> {new Date(post.scheduled_at).toLocaleDateString()} às {new Date(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm font-medium text-slate-700 line-clamp-2 italic">"{post.caption}"</p>
                  </div>
                  <button 
                    onClick={() => deletePost(post.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                {post.status === 'failed' && post.error_message && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold text-red-600 flex items-center gap-2">
                    <AlertCircle size={14} /> Erro: {post.error_message}
                  </div>
                )}

                <div className="h-0.5 bg-slate-50 w-full rounded-full overflow-hidden">
                   <div className={cn("h-full", post.status === 'completed' ? "w-full bg-emerald-500" : "w-1/3 bg-pink-500 animate-pulse")} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
