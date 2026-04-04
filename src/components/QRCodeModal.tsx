import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface QRCodeModalProps {
  qrCode: string | null;
  instanceId?: string;
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function QRCodeModal({ 
  qrCode, 
  instanceId = 'default',
  isOpen, 
  onClose, 
  onRefresh 
}: QRCodeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Conectar WhatsApp</h2>
                  <p className="text-sm text-slate-500">
                    {instanceId !== 'default' ? `Instância: ${instanceId}` : 'Escaneie o QR Code'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center">
              {qrCode ? (
                <>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <QRCodeSVG
                      value={qrCode}
                      size={200}
                      level="M"
                      includeMargin={false}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>

                  <div className="mt-4 text-center">
                    <p className="text-sm text-slate-600">
                      Abra o WhatsApp no seu celular
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Vá em <span className="font-medium">Configurações {'>'} Aparelhos conectados</span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center">
                  <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-600">Gerando QR Code...</p>
                </div>
              )}

                <div className="mt-4 flex flex-col gap-2 w-full">
                  {onRefresh && (
                    <button
                      onClick={onRefresh}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
                        "bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                      )}
                    >
                      <RefreshCw size={14} />
                      Atualizar QR Code
                    </button>
                  )}
                  
                  <button
                    onClick={onClose}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold",
                      "bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md active:scale-95"
                    )}
                  >
                    <CheckCircle2 size={16} />
                    Já escaneei / Concluir
                  </button>
                </div>
            </div>

            <p className="text-[10px] text-slate-400 mt-4 text-center leading-tight">
              O QR Code expira em breve. Após escanear, o modal fechará sozinho.<br/>
              Se o celular conectar e a tela não sumir, clique em <b>Concluir</b>.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
