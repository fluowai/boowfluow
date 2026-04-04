import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  ToggleLeft as Toggle, 
  ToggleRight as ToggleActive, 
  MessageSquare, 
  Hash,
  AlertCircle,
  Save,
  Zap,
  Check
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Rule {
  id: string;
  account_id: string;
  name: string;
  keywords: string[];
  reply_text: string;
  is_active: boolean;
  match_type: 'exact' | 'contains';
}

export function AutoReplyPanel({ accountId }: { accountId: string }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    keywords: '',
    reply_text: '',
    match_type: 'contains' as const
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (accountId) fetchRules();
  }, [accountId]);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('instagram_reply_rules')
      .select('*')
      .eq('account_id', accountId);
    
    if (data) setRules(data);
    setLoading(false);
  };

  const handleAddRule = async () => {
    if (!newRule.name || !newRule.keywords || !newRule.reply_text) return;
    setSaving(true);
    
    const keywordsArray = newRule.keywords.split(',').map(k => k.trim());
    
    const { error } = await supabase
      .from('instagram_reply_rules')
      .insert({
        account_id: accountId,
        name: newRule.name,
        keywords: keywordsArray,
        reply_text: newRule.reply_text,
        match_type: newRule.match_type,
        is_active: true
      });

    if (!error) {
      setShowAdd(false);
      setNewRule({ name: '', keywords: '', reply_text: '', match_type: 'contains' });
      fetchRules();
    }
    setSaving(false);
  };

  const toggleRule = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('instagram_reply_rules')
      .update({ is_active: !current })
      .eq('id', id);
    if (!error) fetchRules();
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Excluir esta regra?')) return;
    const { error } = await supabase
      .from('instagram_reply_rules')
      .delete()
      .eq('id', id);
    if (!error) fetchRules();
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h3 className="text-2xl font-black flex items-center gap-3">
            <Zap size={24} className="text-yellow-500 fill-yellow-500" />
            Automação de Comentários
          </h3>
          <p className="text-slate-500 text-sm font-medium mt-1">Responda automaticamente a quem comentar nos seus posts.</p>
        </div>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 flex items-center gap-2 hover:scale-105 transition-transform"
        >
          {showAdd ? 'Cancelar' : <><Plus size={18} /> Nova Regra</>}
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Nome da Regra</label>
                  <input 
                    type="text" 
                    value={newRule.name}
                    onChange={e => setNewRule({...newRule, name: e.target.value})}
                    placeholder="Ex: Resposta de Preço"
                    className="w-full px-5 py-4 rounded-2xl border-white bg-white shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Tipo de Match</label>
                  <select 
                    value={newRule.match_type}
                    onChange={e => setNewRule({...newRule, match_type: e.target.value as any})}
                    className="w-full px-5 py-4 rounded-2xl border-white bg-white shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-sm"
                  >
                    <option value="contains">Contém as Palavras</option>
                    <option value="exact">Exatamente igual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Palavras-Chave (separadas por vírgula)</label>
                <div className="relative">
                  <Hash size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={newRule.keywords}
                    onChange={e => setNewRule({...newRule, keywords: e.target.value})}
                    placeholder="preço, valor, quanto, quero"
                    className="w-full pl-12 pr-5 py-4 rounded-2xl border-white bg-white shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Resposta Automática</label>
                <textarea 
                  value={newRule.reply_text}
                  onChange={e => setNewRule({...newRule, reply_text: e.target.value})}
                  rows={3}
                  placeholder="Olá! Te enviamos os detalhes no Direct agora mesmo. 🚀"
                  className="w-full px-5 py-4 rounded-2xl border-white bg-white shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-sm resize-none"
                />
              </div>

              <div className="flex justify-end p-2">
                <button 
                  onClick={handleAddRule}
                  disabled={saving}
                  className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Salvando...' : <><Save size={18} /> Ativar Regra</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
             <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
             <p className="font-bold text-sm">Carregando regras...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] p-16 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <MessageSquare className="text-slate-300" size={32} />
            </div>
            <h4 className="text-lg font-black text-slate-900 mb-1">Nenhuma regra ativada</h4>
            <p className="text-slate-500 text-sm max-w-xs mx-auto">Comece criando sua primeira regra para economizar tempo no engajamento.</p>
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className="group relative bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                    rule.is_active ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
                  )}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900">{rule.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {rule.keywords.map((k, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded-md">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden group-hover:flex items-center gap-2">
                    <button 
                      onClick={() => deleteRule(rule.id)}
                      className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <button 
                    onClick={() => toggleRule(rule.id, rule.is_active)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all",
                      rule.is_active 
                        ? "bg-emerald-500 text-white shadow-emerald-200 shadow-lg" 
                        : "bg-slate-200 text-slate-500"
                    )}
                  >
                    {rule.is_active ? <><Check size={14} /> Ativo</> : 'Pausado'}
                  </button>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-indigo-50/30 group-hover:border-indigo-100 transition-colors">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Resposta Configurada:</p>
                <p className="text-sm font-bold text-slate-600 italic">"{rule.reply_text}"</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
