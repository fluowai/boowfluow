import React, { useState, useEffect } from 'react';
import { X, Plus, Tag as TagIcon, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function TagsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen]);

  const loadTags = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('tags').select('*').order('name');
      setTags(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTag = async () => {
    if (!newTagName.trim()) return;
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([{ name: newTagName.trim(), color: newTagColor }])
        .select()
        .single();
      
      if (!error && data) {
        setTags([...tags, data]);
        setNewTagName('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    try {
      await supabase.from('tags').delete().eq('id', id);
      setTags(tags.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const PRESET_COLORS = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#64748b', '#0f172a'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 text-sm">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-800 flex items-center gap-2">
              <TagIcon className="text-amber-500" size={24} />
              Gerenciar Tags
            </h2>
            <p className="text-slate-500 font-medium text-xs mt-1">
              Etiquetas para organização de leads no Kanban e IA.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 bg-slate-50/50 space-y-4">
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Criar Nova Tag</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ex: VIP, Cliente Quente"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 transition-all font-medium"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all ring-offset-2",
                      newTagColor === color ? "ring-2 ring-slate-400 scale-110" : "hover:scale-110"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button 
                onClick={handleSaveTag}
                disabled={isSaving || !newTagName.trim()}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Adicionar
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tags Existentes</label>
          
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-slate-300" />
            </div>
          ) : tags.length === 0 ? (
            <p className="text-center text-slate-400 font-medium py-8 text-xs">Ainda não há tags cadastradas.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {tags.map((tag) => (
                <div 
                  key={tag.id} 
                  className="flex items-center justify-between border border-slate-200/60 p-2.5 rounded-xl group hover:border-slate-300 transition-all"
                  style={{ backgroundColor: `${tag.color}05` }}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="font-bold text-slate-700 truncate">{tag.name}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
