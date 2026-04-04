import React, { useState } from 'react';
import { 
  Smartphone, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Wifi,
  WifiOff,
  Copy,
  MoreVertical,
  X,
  LayoutDashboard
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { QRCodeCanvas } from 'qrcode.react';

import { InstanceConnectionState } from '../types/chat';

interface WhatsAppPanelProps {
  instances: InstanceConnectionState[];
  availableAgents?: any[];
  onConnect: (instanceId: string) => void;
  onDisconnect: (instanceId: string) => void;
  onSync?: (instanceId: string) => Promise<void>;
  onDelete: (instanceId: string) => void;
  onCreate: (name: string) => void;
  onUpdateInstance?: (id: string, updates: any) => void;
  selectedInstance: string | null;
  onSelectInstance: (instanceId: string | null) => void;
}

export function WhatsAppPanel({
  instances,
  availableAgents = [],
  onConnect,
  onDisconnect,
  onSync,
  onDelete,
  onCreate,
  onUpdateInstance,
  selectedInstance,
  onSelectInstance,
}: WhatsAppPanelProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSync = async (instanceId: string) => {
    if (!onSync) return;
    setSyncingId(instanceId);
    try {
      await onSync(instanceId);
    } finally {
      setSyncingId(null);
    }
  };

  const handleCreate = () => {
    if (newInstanceName.trim()) {
      onCreate(newInstanceName);
      setNewInstanceName('');
      setShowCreateModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Ações Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Smartphone className="text-emerald-500" size={24} />
            Canais de WhatsApp
          </h2>
          <p className="text-sm text-slate-500">Gerencie suas instâncias e conexões</p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-md shadow-emerald-100 active:scale-95"
        >
          <Plus size={20} />
          Nova Instância
        </button>
      </div>

      {/* Grid de Instâncias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {instances.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
             <Smartphone size={48} className="text-slate-300 mb-4" />
             <p className="text-slate-500 font-medium">Nenhuma instância configurada</p>
             <button
               onClick={() => setShowCreateModal(true)}
               className="mt-4 text-emerald-600 font-bold hover:underline"
             >
               Clique aqui para começar
             </button>
          </div>
        ) : (
          instances.map((instance) => (
            <motion.div
              key={instance.instanceId}
              layout
              className={cn(
                "group relative bg-white rounded-3xl border transition-all duration-300 overflow-hidden",
                selectedInstance === instance.instanceId 
                  ? "border-emerald-500 shadow-xl shadow-emerald-50 ring-1 ring-emerald-500/20" 
                  : "border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200"
              )}
              onClick={() => onSelectInstance(instance.instanceId)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                      instance.status === 'connected' ? "bg-emerald-50 text-emerald-500" :
                      instance.status === 'starting' ? "bg-amber-50 text-amber-500" :
                      "bg-slate-50 text-slate-400"
                    )}>
                      <Smartphone size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 leading-tight">{instance.instanceName}</h3>
                      <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">ID: {instance.instanceId}</p>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
                    instance.status === 'connected' ? "bg-emerald-100 text-emerald-700" :
                    (instance.status === 'starting' || instance.status === 'reconnecting') ? "bg-amber-100 text-amber-700" : 
                    instance.status === 'qr_ready' ? "bg-blue-100 text-blue-700" :
                    "bg-slate-100 text-slate-600"
                  )}>
                    {instance.status === 'connected' ? (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Conectado
                      </>
                    ) : instance.status === 'qr_ready' ? (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Aguardando QR
                      </>
                    ) : (instance.status === 'starting' || instance.status === 'reconnecting') ? (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {instance.bootState === 'restoring_session' ? 'Restaurando...' : 'Conectando...'}
                      </>
                    ) : (
                      <>
                        <XCircle size={12} />
                        Desconectado
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyId(instance.instanceId);
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Copiar ID"
                    >
                      <Copy size={16} className={cn(copiedId === instance.instanceId ? "text-emerald-500" : "text-slate-400")} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(instance.instanceId);
                      }}
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {selectedInstance === instance.instanceId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="px-5 pb-5 border-t border-slate-100 space-y-4 pt-4"
                >
                  {/* ÁREA DE QR CODE */}
                  {instance.status === 'qr_ready' && instance.qr && (
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                      <div className="bg-white p-4 rounded-2xl shadow-xl shadow-slate-200/50 mb-4 ring-1 ring-slate-100">
                        <QRCodeCanvas 
                          value={instance.qr} 
                          size={180}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 text-center max-w-[200px] leading-relaxed">
                        Abra o <span className="font-bold text-slate-700">WhatsApp</span> no celular {'>'} Configurações {'>'} <span className="font-bold text-slate-700">Dispositivos Conectados</span>
                      </p>
                    </div>
                  )}

                  {/* Agente Selector */}
                  <div className="bg-slate-50 p-3 rounded-2xl flex items-center justify-between border border-slate-100">
                    <div className="flex items-center gap-2">
                       <LayoutDashboard size={14} className="text-slate-400" />
                       <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Agente IA:</span>
                    </div>
                    <select 
                      value={instance.active_agent_id || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        onUpdateInstance?.(instance.instanceId, { active_agent_id: e.target.value || null });
                      }}
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Nenhum Agente</option>
                      {availableAgents.map(agent => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Botões de Ação */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {instance.status === 'connected' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDisconnect(instance.instanceId);
                        }}
                        className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 border border-slate-200"
                      >
                         <WifiOff size={14} />
                         Desconectar
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onConnect(instance.instanceId);
                        }}
                        disabled={instance.status === 'starting'}
                        className={cn(
                          "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 border",
                          instance.status === 'starting' 
                            ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-100"
                        )}
                      >
                         <Wifi size={14} />
                         Conectar
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSync(instance.instanceId);
                      }}
                      disabled={instance.status !== 'connected' || syncingId === instance.instanceId}
                      className={cn(
                        "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 border",
                        (instance.status !== 'connected' || syncingId === instance.instanceId)
                          ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                      )}
                    >
                       <RefreshCw size={14} className={cn(syncingId === instance.instanceId && "animate-spin")} />
                       Sincronizar
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>

      <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h4 className="font-bold text-blue-800 text-sm">Como funciona?</h4>
          <p className="text-blue-700 text-xs mt-1">
            Cada instância conecta uma conta WhatsApp. Você pode criar múltiplas instâncias para gerenciar diferentes números ou equipes. Após criar, escaneie o QR Code para autenticar.
          </p>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Nova Instância</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome da Instância
                </label>
                <input
                  type="text"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                  placeholder="Ex: Empresa principal"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newInstanceName.trim()}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
