import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import { syncMessageToSupabase, supabase } from './supabase';
import { inboundMessageOrchestrator } from './modules/agents/inboundMessageOrchestrator';
import { restoreSession, saveSession, deleteSession } from './lib/sessionStorage';

export type InstanceStatusInfo = 'idle' | 'starting' | 'qr_ready' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface InstanceConnectionState {
  instanceId: string;
  instanceName: string;

  status: InstanceStatusInfo | string;
  bootState: 'idle' | 'initializing' | 'restoring_session' | 'qr_pending' | 'ready' | 'syncing' | 'failed' | string;

  needsQr: boolean;
  qr?: string | null;
  qrVersion?: number;
  lastQrAt?: string | null;

  hasSession: boolean;
  sessionInvalid: boolean;

  isInitializing: boolean;
  isReconnecting: boolean;
  isLocked: boolean;
  lockReason?: string | null;

  lastReadyAt?: string | null;
  lastDisconnectAt?: string | null;
  disconnectReason?: string | null;

  lastHeartbeatAt?: string | null;
  reconnectAttempts?: number;

  syncAllowed: boolean;
  
  phone?: string | null;
  pushName?: string | null;
  profilePictureUrl?: string | null;
  active_agent_id?: string | null;
  errorDetail?: string | null;
  
  health: {
    status: 'healthy' | 'unstable' | 'dead';
    lastEventAt: string | null;
    startedAt: string | null;
    reconnectCount: number;
    errorCount: number;
  };

  updatedAt: string;
}

type EventHandler = (event: string, data: any) => void;

interface InstanceConnection {
  client: InstanceType<typeof Client> | null;
  state: InstanceConnectionState;
  isDestroying?: boolean;
}

class WhatsAppService {
  private instanceStore: Map<string, InstanceConnection> = new Map();
  private eventHandler: EventHandler | null = null;
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private backoffDelays: Map<string, number> = new Map();

  // =========================================================================
  // CORREÇÃO CIRÚRGICA: MUTEX POR INSTÂNCIA (Exclusão Mútua)
  // Garante que apenas UM connect() rode por instância de cada vez.
  // Qualquer chamada concorrente é REJEITADA com log.
  // =========================================================================
  private connectMutex: Map<string, boolean> = new Map();
  private lastConnectAttempt: Map<string, number> = new Map();
  private static readonly RECONNECT_COOLDOWN_MS = 5000; // 5s entre tentativas

  // Helpers forenses (mantidos — versão limpa sem duplicata)
  private generateForensicId(prefix: string = 'OP'): string {
    return `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  private logLifecycle(tag: string, instanceName: string, message: string, data: any = {}) {
    const ts = new Date().toISOString();
    console.log(`[${tag}][${instanceName}] [${ts}] ${message}`, Object.keys(data).length > 0 ? JSON.stringify(data) : '');
  }

  private countAllListeners(client: any): Record<string, number> {
    const results: Record<string, number> = {};
    if (!client) return results;
    try {
      const events = client.eventNames ? client.eventNames() : [];
      events.forEach((evt: string) => {
        results[evt] = client.listenerCount ? client.listenerCount(evt) : 0;
      });
    } catch (e) {}
    return results;
  }

  // Caminho de sessão blindado contra watchers (dentro do temp do sistema)
  private authDirParent: string = path.join(os.tmpdir(), 'boowfluow_auth');

  constructor() {
    setTimeout(() => {
      inboundMessageOrchestrator.attachDependencies(
        this.sendTextMessage.bind(this), 
        (event, data, inst) => this.emit(event, data, inst)
      );
    }, 0);

    // WATCHDOG: Observador + Ping Ativo — roda a cada 2 minutos
    setInterval(() => this.runGlobalWatchdog(), 2 * 60000);
  }

  // =========================================================================
  // CORREÇÃO CIRÚRGICA: FLUXO CENTRALIZADO DE RECONNECT
  // Única porta de entrada para qualquer tentativa de reconexão.
  // Todos os handlers (change_state, disconnected, watchdog) DEVEM usar este método.
  // =========================================================================
  private requestReconnect(instanceName: string, reason: string) {
    const opId = this.generateForensicId('RCONN');
    
    // 1. Verificar MUTEX — se connect() já está rodando, ignorar
    if (this.connectMutex.get(instanceName)) {
      this.logLifecycle('RECONNECT', instanceName, `IGNORADO: connect() já em andamento`, { reason, opId });
      return;
    }

    // 2. Verificar COOLDOWN — throttle de 10s entre tentativas
    const lastAttempt = this.lastConnectAttempt.get(instanceName) || 0;
    const elapsed = Date.now() - lastAttempt;
    if (elapsed < WhatsAppService.RECONNECT_COOLDOWN_MS) {
      this.logLifecycle('RECONNECT', instanceName, `IGNORADO: Cooldown ativo (${Math.round(elapsed/1000)}s / ${WhatsAppService.RECONNECT_COOLDOWN_MS/1000}s)`, { reason, opId });
      return;
    }

    // 3. Verificar CIRCUIT BREAKER
    const snapshot = this.getInstanceSnapshot(instanceName);
    if ((snapshot.reconnectAttempts || 0) > 5) {
      this.logLifecycle('RECONNECT', instanceName, `IGNORADO: Circuit breaker ativo (${snapshot.reconnectAttempts} tentativas)`, { reason, opId });
      return;
    }

    // 4. Verificar se está sendo destruída
    const instance = this.instanceStore.get(instanceName);
    if (instance?.isDestroying) {
      this.logLifecycle('RECONNECT', instanceName, `IGNORADO: instância sendo destruída`, { reason, opId });
      return;
    }

    this.logLifecycle('RECONNECT', instanceName, `ACEITO: Agendando reconnect`, { reason, opId });
    
    // 5. Executar connect() de forma assíncrona (não bloqueia o handler)
    this.connect(instanceName).catch(err => {
      this.logLifecycle('RECONNECT', instanceName, `FALHOU: ${err.message}`, { reason, opId });
    });
  }

  // =========================================================================
  // WATCHDOG CORRIGIDO: Agora é OBSERVADOR PURO.
  // NÃO chama connect() diretamente. Usa requestReconnect() centralizado.
  // =========================================================================
  private runGlobalWatchdog() {
    const now = Date.now();
    for (const [instanceName, instance] of this.instanceStore.entries()) {
      const state = instance.state;
      if (state.status === 'connected' && !instance.isDestroying) {
        const lastSeen = state.health.lastEventAt
          ? new Date(state.health.lastEventAt).getTime()
          : 0;
        const idleTime = now - lastSeen;

        if (idleTime > 3 * 60000) {
          // 3 minutos sem atividade — testa conexão ativa via ping
          this.pingInstanceHealth(instanceName).catch(() => {});
        }
      }

      // Auto-reset do circuit breaker se a instância ficou em 'error' por mais de 2 minutos
      // Isso evita que falhas transitórias travem a instância para sempre
      if (state.status === 'error' && !instance.isDestroying) {
        const lastDisconnect = state.lastDisconnectAt
          ? new Date(state.lastDisconnectAt).getTime()
          : 0;
        const errorAge = now - lastDisconnect;
        if (errorAge > 2 * 60000 && (state.reconnectAttempts || 0) > 5) {
          this.logLifecycle('WATCHDOG', instanceName, 'Auto-reset do circuit breaker após 2min em error');
          this.updateInstanceState(instanceName, { reconnectAttempts: 0 });
          this.requestReconnect(instanceName, 'WATCHDOG:CIRCUIT_BREAKER_RESET');
        }
      }
    }
  }

  private async pingInstanceHealth(instanceName: string) {
    const instance = this.instanceStore.get(instanceName);
    if (!instance?.client || instance.isDestroying) return;

    try {
      // getState() faz uma chamada real ao puppeteer/browser
      const state = await Promise.race([
        instance.client.getState(),
        new Promise<null>((_, rej) =>
          setTimeout(() => rej(new Error('PING_TIMEOUT')), 8000)
        )
      ]);

      if (state === 'CONNECTED') {
        // Ainda conectado — atualiza heartbeat
        this.touchInstanceActivity(instanceName);
        this.logLifecycle('PING', instanceName, 'Heartbeat OK via getState()');
      } else {
        // Browser vivo mas sessão perdida (celular desconectou do WA Web)
        this.logLifecycle('PING', instanceName,
          `getState() retornou ${state} — sessão perdida. Solicitando reconnect.`);
        this.updateInstanceState(instanceName, {
          status: 'disconnected',
          disconnectReason: `PING_STATE:${state}`
        });
        this.requestReconnect(instanceName, `PING:STATE_${state}`);
      }
    } catch (err: any) {
      // Timeout ou browser morto
      this.logLifecycle('PING', instanceName,
        `Ping falhou (${err.message}) — browser provavelmente morto. Solicitando reconnect.`);
      this.updateInstanceState(instanceName, {
        status: 'disconnected',
        health: {
          ...this.getInstanceSnapshot(instanceName).health,
          status: 'dead'
        },
        disconnectReason: `PING_FAILED:${err.message}`
      });
      this.requestReconnect(instanceName, `PING:TIMEOUT`);
    }
  }

  /**
   * Atualiza o timestamp de última atividade para o Watchdog
   */
  private touchInstanceActivity(instanceName: string) {
    const instance = this.getOrCreateInstance(instanceName);
    this.updateInstanceState(instanceName, {
      health: {
        ...instance.state.health,
        lastEventAt: new Date().toISOString(),
        status: 'healthy'
      }
    });
  }

  private getOrCreateInstance(instanceName: string): InstanceConnection {
    if (!this.instanceStore.has(instanceName)) {
      this.instanceStore.set(instanceName, {
        client: null,
        state: this.normalizeState({
          instanceId: instanceName,
          instanceName: instanceName,
          status: 'idle',
          bootState: 'idle'
        }),
      });
    }
    return this.instanceStore.get(instanceName)!;
  }

  /**
   * Função central de normalização para o contrato canônico.
   */
  private normalizeState(raw: any): InstanceConnectionState {
    const now = new Date().toISOString();
    return {
      instanceId: raw.instanceId || raw.name || 'default',
      instanceName: raw.instanceName || raw.name || 'default',
      status: raw.status || 'disconnected',
      bootState: raw.bootState || raw.boot_state || 'idle',
      needsQr: !!raw.qr || !!raw.qr_data || false,
      qr: raw.qr || raw.qr_data || null,
      qrVersion: raw.qrVersion || 0,
      lastQrAt: raw.lastQrAt || raw.last_qr_at || null,
      hasSession: raw.hasSession || false,
      sessionInvalid: raw.sessionInvalid || false,
      isInitializing: raw.isInitializing || false,
      isReconnecting: raw.isReconnecting || false,
      isLocked: raw.isLocked || (raw.bootState === 'initializing' || raw.bootState === 'restoring_session'),
      lockReason: raw.lockReason || null,
      lastReadyAt: raw.lastReadyAt || raw.last_ready_at || null,
      lastDisconnectAt: raw.lastDisconnectAt || raw.last_disconnect_at || null,
      disconnectReason: raw.disconnectReason || null,
      lastHeartbeatAt: raw.lastHeartbeatAt || null,
      reconnectAttempts: raw.reconnectAttempts || 0,
      syncAllowed: raw.syncAllowed || (raw.status === 'connected'),
      phone: raw.phone || null,
      pushName: raw.pushName || null,
      profilePictureUrl: raw.profilePictureUrl || null,
      active_agent_id: raw.active_agent_id || null,
      updatedAt: raw.updatedAt || raw.updated_at || now,
      errorDetail: raw.errorDetail || null,
      health: raw.health || {
        status: 'healthy',
        lastEventAt: null,
        startedAt: null,
        reconnectCount: raw.reconnectAttempts || 0,
        errorCount: 0
      }
    };
  }

  /**
   * Helper centralizador de caminhos de sessão para garantir consistência.
   * Resolve o bug do hífen vs underscore.
   */
  private getSessionPath(instanceName: string): string {
    return path.join(this.authDirParent, `session_${instanceName.replace(/\s+/g, '_')}`);
  }

  setEventHandler(handler: EventHandler) {
    this.eventHandler = handler;
  }

  /**
   * Função Central: updateInstanceState (CRÍTICO)
   * Responsável por atualizar memória, disparar socket e persistir banco.
   */
  private async updateInstanceState(
    instanceName: string, 
    partialState: Partial<InstanceConnectionState>, 
    persistInDb: boolean = false
  ) {
    const instance = this.getOrCreateInstance(instanceName);
    
    // Merge de estado no contrato canônico
    instance.state = {
      ...instance.state,
      ...partialState,
      updatedAt: new Date().toISOString()
    };

    // Log de transição com o padrão [INIT]
    if (partialState.status || partialState.bootState) {
      console.log(`[INIT][${instanceName}] Status: ${instance.state.status} | Boot: ${instance.state.bootState}`);
    }

    // Emissão automática para o Socket (Snapshot Completo)
    this.emitInstanceUpdate(instanceName);

    // Persistência no banco (Metadados operacionais - Nomes Normalizados)
    if (persistInDb) {
      try {
        const updatePayload: any = {
          status: instance.state.status,
          boot_state: instance.state.bootState,
          qr_data: instance.state.qr,
          last_ready_at: instance.state.lastReadyAt,
          last_qr_at: instance.state.lastQrAt,
          updated_at: instance.state.updatedAt
        };
        
        if (instance.state.phone) updatePayload.phone = instance.state.phone;

        await supabase.from('whatsapp_instances')
          .update(updatePayload)
          .eq('name', instanceName);
      } catch (err) {
        console.error(`[DB][${instanceName}] Error persisting canonical state:`, err);
      }
    }
  }

  /**
   * Retorna o Snapshot Completo da Instância (OBRIGATÓRIO)
   */
  public getInstanceSnapshot(instanceName: string = 'default'): InstanceConnectionState {
     const instance = this.getOrCreateInstance(instanceName);
     return { ...instance.state };
  }

  /**
   * Helper para emissão padronizada de eventos Socket
   */
  private emitInstanceUpdate(instanceName: string) {
    const snapshot = this.getInstanceSnapshot(instanceName);
    this.emit('instance:status', snapshot, instanceName);
    
    if (snapshot.qr) {
      this.emit('instance:qr', { 
        instanceId: instanceName,
        qr: snapshot.qr, 
        qrVersion: snapshot.qrVersion 
      }, instanceName);
    }
  }

  private emit(event: string, data: any, instanceName?: string) {
    if (this.eventHandler) {
      // Garante que o payload padrão de roteamento está presente
      const enrichedData = (typeof data === 'object' && data !== null) 
        ? { 
            ...data, 
            instanceId: instanceName || data.instanceId || 'default', 
            timestamp: new Date().toISOString() 
          }
        : data;
      this.eventHandler(event, enrichedData);
    }
  }

  async connect(instanceName: string = 'default') {
    const opId = this.generateForensicId('CONN');

    // =========================================================================
    // CORREÇÃO CIRÚRGICA: MUTEX POR INSTÂNCIA
    // Se já existe connect() rodando para esta instância, REJEITAR.
    // =========================================================================
    if (this.connectMutex.get(instanceName)) {
      this.logLifecycle('CONNECT', instanceName, `BLOQUEADO: Mutex ativo — connect() já em andamento`, { opId });
      return this.getInstanceSnapshot(instanceName);
    }

    // Adquirir mutex ANTES de qualquer operação
    this.connectMutex.set(instanceName, true);
    this.lastConnectAttempt.set(instanceName, Date.now());
    this.logLifecycle('CONNECT', instanceName, `MUTEX ADQUIRIDO — Iniciando connect()`, { opId });

    try {
      const snapshot = this.getInstanceSnapshot(instanceName);

      // CIRCUIT BREAKER
      const attempts = snapshot.reconnectAttempts || 0;
      if (attempts > 5) {
        console.error(`[CIRCUIT BREAKER][${instanceName}] Limite de reconexões atingido (5+).`);
        await this.updateInstanceState(instanceName, { status: 'error', bootState: 'failed' }, true);
        return snapshot;
      }

      // BACKOFF EXPONENCIAL
      if (attempts > 0) {
        const delay = Math.min(30000, 2000 * Math.pow(2, attempts - 1));
        this.logLifecycle('CONNECT', instanceName, `Backoff: ${delay}ms (tentativa ${attempts})`, { opId });
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      console.log(`[WWebJS][${instanceName}] Iniciando bootstrapping... (Tentativa: ${attempts})`);
      
      // =========================================================================
      // CORREÇÃO CIRÚRGICA: TEARDOWN DETERMINÍSTICO
      // Destruir client anterior de forma segura, COM removeAllListeners().
      // Sem hard kill global — era a causa de cascata entre instâncias.
      // =========================================================================
      const instance = this.getOrCreateInstance(instanceName);
      if (instance.client) {
        this.logLifecycle('CONNECT', instanceName, `Destruindo client anterior`, { opId });
        try {
          // CORREÇÃO: Remover TODOS os listeners antes do destroy
          instance.client.removeAllListeners();
          await Promise.race([
            instance.client.destroy(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('DESTROY_TIMEOUT')), 10000))
          ]);
          this.logLifecycle('CONNECT', instanceName, `Client anterior destruído com sucesso`, { opId });
        } catch (err: any) {
          console.warn(`[WWebJS][${instanceName}] Erro ao destruir cliente: ${err.message}. Prosseguindo.`);
        }
        instance.client = null;
      }

      // Limpar heartbeat interval anterior
      if (this.pingIntervals.has(instanceName)) {
        clearInterval(this.pingIntervals.get(instanceName)!);
        this.pingIntervals.delete(instanceName);
      }

      await this.updateInstanceState(instanceName, { 
        status: 'starting', 
        bootState: 'initializing',
        isInitializing: true,
        qr: null,
        needsQr: false,
        errorDetail: null
      }, true);

      // PADRONIZAÇÃO DE PATH
      const sessionPath = this.getSessionPath(instanceName);
      
      // LIMPEZA DE SESSÃO RESIDUAL
      if (fs.existsSync(sessionPath)) {
        const currentState = this.getInstanceSnapshot(instanceName);
        if (currentState.status === 'error' || currentState.status === 'reconnecting' || !instance.client) {
          this.logLifecycle('CONNECT', instanceName, `Limpando sessão residual em: ${sessionPath}`, { opId });
          try {
            fs.rmSync(sessionPath, { recursive: true, force: true });
          } catch (rmErr) {
            console.warn(`[FORENSIC][${instanceName}] Falha ao remover sessão.`, rmErr);
          }
        }
      }

      // PROTEÇÃO CONTRA LOCK FILE ÓRFÃO
      if (fs.existsSync(sessionPath)) {
        try {
          const files = fs.readdirSync(sessionPath);
          if (files.some(f => f.includes('LOCK'))) {
            console.warn(`[FORENSIC][${instanceName}] LOCK ÓRFÃO DETECTADO - REMOÇÃO FORÇADA`);
            fs.rmSync(sessionPath, { recursive: true, force: true });
          }
        } catch (e) {}
      }

      // RESTAURAÇÃO DE SESSÃO DO STORAGE (NUVEM -> LOCAL)
      await restoreSession(instanceName, sessionPath);

      this.logLifecycle('CONNECT', instanceName, `Criando new Client()`, { opId });
      
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: instanceName.replace(/\s+/g, '_'),
          dataPath: sessionPath
        }),
        puppeteer: {
          headless: true,
          // Economia estimada: ~80-120MB de RAM por instância com essas flags
          // comparado ao Chromium padrão sem flags (~200-300MB por instância)
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-first-run',
            '--safebrowsing-disable-auto-update',
            '--disable-features=TranslateUI,BlinkGenPropertyTrees',
            '--disable-accelerated-2d-canvas',
            '--no-zygote'
          ]
        }
      });

      instance.client = client;

      // =========================================================================
      // LISTENERS: Registrados UMA VEZ por Client. Como o client é novo,
      // não há risco de acumulação. O client anterior foi destruído acima.
      // =========================================================================

      client.on('qr', async (qr) => {
        const snap = this.getInstanceSnapshot(instanceName);
        console.log(`[INIT][${instanceName}] Novo QR Code gerado (v${(snap.qrVersion || 0) + 1}).`);
        
        await this.updateInstanceState(instanceName, { 
          status: 'qr_ready', 
          bootState: 'qr_pending',
          qr, 
          needsQr: true,
          lastQrAt: new Date().toISOString(),
          qrVersion: (snap.qrVersion || 0) + 1 
        }, true);
      });

      client.on('ready', async () => {
        const phone = client.info?.wid?.user;
        const pushName = client.info?.pushname;
        const now = new Date().toISOString();

        console.log(`[INIT][${instanceName}] READY! Phone: ${phone}`);

        await this.updateInstanceState(instanceName, {
          status: 'connected',
          bootState: 'ready',
          needsQr: false,
          isInitializing: false,
          qr: null,
          phone,
          pushName,
          lastReadyAt: now,
          reconnectAttempts: 0,
          syncAllowed: true,
          health: {
            ...instance.state.health,
            startedAt: now,
            lastEventAt: now,
            status: 'healthy'
          }
        }, true);

        // DISPARAR SINCRONIZAÇÃO EM BACKGROUND (BACKFILL)
        setTimeout(() => {
           this.runBackgroundFullSync(instanceName).catch(err => {
              console.error(`[SYNC][${instanceName}] Erro na sincronização de background:`, err);
           });
        }, 5000); 
      });

      // Heartbeat Não-Destrutivo (Resiliência) — limpo acima, criado 1x
      if (!this.pingIntervals.has(instanceName)) {
         const interval = setInterval(async () => {
            if (instance.client && !instance.isDestroying) {
               try {
                  const state = await instance.client.getState();
                  if (state !== 'CONNECTED') {
                     console.warn(`[Heartbeat][${instanceName}] State is ${state}. Monitoring...`);
                  }
               } catch (pingErr) {
                  console.error(`[Heartbeat][${instanceName}] Latency or browser hang detected.`);
               }
            }
         }, 5 * 60 * 1000);
         this.pingIntervals.set(instanceName, interval);
      }

      client.on('authenticated', async () => {
        console.log(`[WWebJS] Authenticated instance: ${instanceName}`);
        // SALVAMENTO DE SESSÃO NO STORAGE (LOCAL -> NUVEM)
        await saveSession(instanceName, sessionPath);
      });

      client.on('auth_failure', async msg => {
        console.error(`[INIT][${instanceName}] Authentication failure:`, msg);
        // REMOÇÃO DE SESSÃO CORROMPIDA
        await deleteSession(instanceName);

        await this.updateInstanceState(instanceName, {
          status: 'error',
          bootState: 'failed',
          sessionInvalid: true,
          isInitializing: false,
          health: {
            ...instance.state.health,
            errorCount: instance.state.health.errorCount + 1,
            status: 'dead'
          }
        }, true);
      });

      // =========================================================================
      // CORREÇÃO CIRÚRGICA: change_state NÃO chama connect() diretamente.
      // Usa requestReconnect() centralizado que respeita mutex, cooldown e circuit breaker.
      // Este era o PRIMEIRO PONTO DE QUEBRA DE IDEMPOTÊNCIA provado na auditoria.
      // =========================================================================
      client.on('change_state', (state) => {
         console.warn(`[WWebJS] Engine de estado avisou mudança em ${instanceName}: ${state}`);
         if (['CONFLICT', 'UNLAUNCHED', 'UNPAIRED', 'TIMEOUT', 'DEPRECATED_VERSION'].includes(state)) {
             this.logLifecycle('CHANGE_STATE', instanceName, `Estado crítico detectado: ${state}. Solicitando reconnect via fluxo central.`);
             // CORREÇÃO: Delega ao fluxo central em vez de chamar connect() diretamente
             this.requestReconnect(instanceName, `CHANGE_STATE:${state}`);
         }
      });

      // =========================================================================
      // CORREÇÃO CIRÚRGICA: disconnected NÃO reseta isInitializing antes da hora.
      // NÃO chama connect() diretamente. Usa requestReconnect() centralizado.
      // =========================================================================
      client.on('disconnected', async (reason) => {
        console.log(`[INIT][${instanceName}] Disconnected. Reason: ${reason}`);
        
        await this.updateInstanceState(instanceName, {
          status: 'disconnected',
          bootState: 'idle',
          syncAllowed: false,
          qr: null,
          lastDisconnectAt: new Date().toISOString(),
          disconnectReason: reason.toString()
          // CORREÇÃO: NÃO seta isInitializing: false aqui.
          // O mutex controla isso agora no finally do connect().
        }, true);

        // Auto-Reconnect via fluxo centralizado
        if ((reason as any) !== 'NAVIGATION') {
           const currentSnap = this.getInstanceSnapshot(instanceName);
           const nextAttempt = (currentSnap.reconnectAttempts || 0) + 1;
           this.logLifecycle('DISCONNECTED', instanceName, `Solicitando reconnect (tentativa ${nextAttempt}/5)`, { reason });
           
           await this.updateInstanceState(instanceName, { 
             reconnectAttempts: nextAttempt,
             status: 'reconnecting'
           });
           
           // CORREÇÃO: Usa requestReconnect() em vez de this.connect() direto
           this.requestReconnect(instanceName, `DISCONNECTED:${reason}`);
        }
      });

      client.on('message', async (msg) => {
        this.touchInstanceActivity(instanceName);
        const canonicalMsg = await syncMessageToSupabase(instanceName, msg, false);

        if (canonicalMsg) {
          const payload = {
            ...canonicalMsg,
            instanceId: instanceName,
            tenantId: 'default'
          };
          
          console.log(`[Socket] Emitting enriched message:new. fromMe=${payload.fromMe}, id=${payload.id}`);
          this.emit('message:new', payload, instanceName);

          if (canonicalMsg.authorQuality === 'poor' || !canonicalMsg.authorName || canonicalMsg.authorName === canonicalMsg.authorPhone) {
             this.refreshContactIdentityLater(instanceName, canonicalMsg.remoteJid);
          }

          inboundMessageOrchestrator.dispatch(canonicalMsg, instanceName).catch(err => {
            console.error(`[AgentIntegration] Failed to dispatch via orchestrator:`, err);
          });
        }
      });

      client.on('message_create', async (msg) => {
        this.touchInstanceActivity(instanceName);
        if (msg.fromMe) {
          const canonicalMsg = await syncMessageToSupabase(instanceName, msg, true);
          
          if (canonicalMsg) {
            const payload = {
              ...canonicalMsg,
              instanceId: instanceName,
              tenantId: 'default'
            };
            
            console.log(`[Socket] Emitting enriched message:new (self/create). fromMe=${payload.fromMe}, id=${payload.id}`);
            this.emit('message:new', payload, instanceName);
          }
        }
      });

      // INITIALIZE com monitoramento de estado estável (ready ou qr)
      const BOOT_TIMEOUT_MS = Number(process.env.BOOT_TIMEOUT_MS) || 60000;

      const stableStatePromise = new Promise<{ state: string }>((resolve, reject) => {
        let resolved = false;

        const timer = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          client.off('ready', onReady);
          client.off('qr', onQr);
          reject(new Error(`BOOT_TIMEOUT: ${instanceName} não atingiu estado estável em ${BOOT_TIMEOUT_MS / 1000}s`));
        }, BOOT_TIMEOUT_MS);

        const onReady = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          client.off('qr', onQr);
          resolve({ state: 'ready' });
        };

        const onQr = () => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          client.off('ready', onReady);
          resolve({ state: 'qr_ready' });
        };

        // Usa 'on' em vez de 'once' para não conflitar com os listeners permanentes acima
        client.on('ready', onReady);
        client.on('qr', onQr);
      });

      this.logLifecycle('BOOT', instanceName, `Disparando initialize() (Timeout: ${BOOT_TIMEOUT_MS}ms)`);
      
      client.initialize().catch((err: any) => {
        this.logLifecycle('BOOT', instanceName, `Erro no initialize(): ${err.message}`);
      });

      const stableState = await stableStatePromise;
      this.logLifecycle('BOOT', instanceName, `Estado estável atingido: ${stableState.state}`, { opId });

      return this.getInstanceSnapshot(instanceName);

    } catch (err: any) {
      this.logLifecycle('CONNECT', instanceName, `ERRO FATAL: ${err.message}`, { opId });
      await this.updateInstanceState(instanceName, {
        status: 'error',
        bootState: 'failed',
        isInitializing: false,
        errorDetail: err.message
      }, true);
      return this.getInstanceSnapshot(instanceName);
    } finally {
      this.connectMutex.set(instanceName, false);
      this.logLifecycle('CONNECT', instanceName, `MUTEX LIBERADO`, { opId });
    }
  }

  async disconnect(instanceName: string = 'default', isLogout: boolean = false) {
    const instance = this.getOrCreateInstance(instanceName);
    
    console.log(`[WWebJS][${instanceName}] Disconnecting (isLogout: ${isLogout})...`);
    instance.isDestroying = true;

    if (instance?.client) {
      try {
        if (isLogout) await instance.client.logout(); 
        await instance.client.destroy();
      } catch (e) {
        console.error(`[WWebJS][${instanceName}] Error during destroy:`, e);
      }
      instance.client = null;
    }
    
    if (this.pingIntervals.has(instanceName)) {
       clearInterval(this.pingIntervals.get(instanceName)!);
       this.pingIntervals.delete(instanceName);
    }
    
    if (isLogout) {
      try {
        const sessionPath = this.getSessionPath(instanceName);
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          console.log(`[WWebJS][${instanceName}] Sessão removida permanentemente.`);
        }
      } catch (fsErr) {
        console.error(`[WWebJS][${instanceName}] Erro ao remover sessão:`, fsErr);
      }
    }
    
    await this.updateInstanceState(instanceName, {
      status: 'disconnected',
      bootState: 'idle',
      qr: null,
      syncAllowed: false,
      isReconnecting: false
    }, true);
    
    instance.isDestroying = false;
  }

  async sendTextMessage(instanceName: string = 'default', jid: string, text: string, quotedMsgId?: string) {
    const instance = this.instanceStore.get(instanceName);
    if (!instance?.client) {
      throw new Error(`WhatsApp not connected for instance: ${instanceName}`);
    }
    const options = quotedMsgId ? { quotedMessageId: quotedMsgId } : undefined;
    return await instance.client.sendMessage(jid, text, options);
  }

  async sendTyping(instanceName: string = 'default', jid: string, typing: boolean) {
    try {
      const instance = this.instanceStore.get(instanceName);
      if (!instance?.client) return;
      const chat = await instance.client.getChatById(jid);
      if (!chat) return;
      if (typing) {
        await chat.sendStateTyping();
      } else {
        await chat.clearState();
      }
    } catch {
      // Silencioso — typing é melhor esforço, não crítico
    }
  }

  async sendImage(instanceName: string = 'default', jid: string, imageUrl: string, caption?: string) {
    const instance = this.instanceStore.get(instanceName);
    if (!instance?.client) {
      throw new Error(`WhatsApp not connected for instance: ${instanceName}`);
    }
    const media = await MessageMedia.fromUrl(imageUrl);
    return await instance.client.sendMessage(jid, media, { caption });
  }

  async sendMediaBase64(instanceName: string = 'default', jid: string, base64: string, mimetype: string, filename?: string, caption?: string) {
    const instance = this.instanceStore.get(instanceName);
    if (!instance?.client) {
      throw new Error(`WhatsApp not connected for instance: ${instanceName}`);
    }
    const cleanBase64 = base64.includes('base64,') ? base64.split('base64,')[1] : base64;
    const media = new MessageMedia(mimetype, cleanBase64, filename);
    return await instance.client.sendMessage(jid, media, { caption, sendAudioAsVoice: mimetype.includes('audio') });
  }

  async getContacts(instanceName: string = 'default') {
    const instance = this.instanceStore.get(instanceName);
    if (!instance?.client) {
      throw new Error(`[WWebJS] getContacts: Instance ${instanceName} client not initialized.`);
    }
    try {
      return await instance.client.getContacts();
    } catch (e: any) {
      console.error(`[WWebJS] getContacts error [${instanceName}]:`, e.message);
      // CORREÇÃO CIRÚRGICA: Métodos de leitura NÃO chamam connect() diretamente.
      // Sinalizam ao fluxo central que a instância pode precisar de reconnect.
      if (e.message?.includes('detached Frame')) {
         console.warn(`[WWebJS][${instanceName}] Detached Frame em getContacts. Sinalizando estado degradado.`);
         this.requestReconnect(instanceName, 'DETACHED_FRAME:getContacts');
      }
      throw e;
    }
  }

  async getChats(instanceName: string = 'default') {
    const instance = this.instanceStore.get(instanceName);
    if (!instance?.client) {
      console.warn(`[WWebJS] getChats: Instance ${instanceName} client not initialized.`);
      throw new Error(`Instance ${instanceName} client not initialized.`);
    }
    try {
      const { toCanonicalMessage } = await import('./messageAdapter');
      const { sanitizeIdForUI, isRawIdentity } = await import('./utils/identity');
      const rawChats = await instance.client.getChats();
      
      // Enriquecimento Inteligente de Autoria (Cache-First) para a Sidebar
      const enrichedChats = await Promise.all(rawChats.map(async (chat: any) => {
        if (chat.isGroup && chat.lastMessage && !chat.lastMessage.fromMe) {
          const msg = chat.lastMessage;
          const authorJid = msg.author;
          
          if (authorJid) {
            try {
              const contact = await instance.client!.getContactById(authorJid).catch(() => null);
              if (contact) {
                // Injeta metadados no objeto bruto para o adapter captar
                msg.authorName = contact.pushname || contact.name || contact.shortName || null;
                // Se o adapter usar msg.pushName
                msg.pushName = msg.authorName;
              }
              
              // [V1-FIX] Usa isRawIdentity() centralizado em vez de checagem fraca de >13 dígitos
              if (!msg.authorName || isRawIdentity(msg.authorName)) {
                msg.authorName = sanitizeIdForUI(authorJid, 'author');
              }
            } catch {
              msg.authorName = sanitizeIdForUI(authorJid, 'author');
            }
          }
        }
        return chat;
      }));

      return enrichedChats;
    } catch (e: any) {
      console.error(`[WWebJS] getChats error [${instanceName}]:`, e.message);
      // CORREÇÃO CIRÚRGICA: NÃO chama connect() diretamente.
      if (e.message?.includes('detached Frame')) {
         console.warn(`[WWebJS][${instanceName}] Detached Frame em getChats. Sinalizando estado degradado.`);
         this.requestReconnect(instanceName, 'DETACHED_FRAME:getChats');
      }
      throw e;
    }
  }

  async getProfilePicture(instanceName: string = 'default', jid: string) {
    const instance = this.instanceStore.get(instanceName);
    if (!instance?.client || !jid) return null;
    try {
      return await instance.client.getProfilePicUrl(jid);
    } catch {
      return null;
    }
  }

  async getMessages(instanceName: string = 'default', jid: string, limit: number = 50) {
    const instance = this.instanceStore.get(instanceName);
    if (!instance?.client || !jid) {
      throw new Error(`Instance client not initialized or missing jid for ${instanceName}`);
    }
    try {
      const { toCanonicalMessage } = await import('./messageAdapter');
      const { isRawIdentity } = await import('./utils/identity');
      const chat = await instance.client.getChatById(jid);
      const messages = await chat.fetchMessages({ limit });
      
      const canonicalMessages = messages.map(m => toCanonicalMessage(m));

      // [IDENTITY-SAFE] Enrich lean messages with DB-persisted identities before returning.
      // This prevents the lean path from returning raw IDs when the DB already has correct names.
      try {
        const messageIds = canonicalMessages.map(m => m.id).filter(Boolean);
        if (messageIds.length > 0) {
          const { data: dbMessages } = await supabase
            .from('whatsapp_messages')
            .select('message_id, author_name, sender_name, pushname, notify_name')
            .in('message_id', messageIds);
          
          if (dbMessages && dbMessages.length > 0) {
            const dbMap = new Map(dbMessages.map((d: any) => [d.message_id, d]));
            for (const cm of canonicalMessages) {
              const dbRow = dbMap.get(cm.id);
              if (dbRow) {
                // Prefer DB identity over lean device identity when DB has a real name
                if (dbRow.author_name && !isRawIdentity(dbRow.author_name)) {
                  cm.authorName = dbRow.author_name;
                }
                if (dbRow.sender_name && !isRawIdentity(dbRow.sender_name)) {
                  cm.senderName = dbRow.sender_name;
                }
                if (dbRow.pushname && !isRawIdentity(dbRow.pushname)) {
                  cm.notifyName = dbRow.pushname;
                }
              }
            }
            console.log(`[WWebJS] Identity-enriched ${dbMessages.length}/${canonicalMessages.length} lean messages from DB for ${jid}`);
          }
        }
      } catch (enrichErr) {
        console.warn('[WWebJS] Failed to enrich lean messages with DB identities:', enrichErr);
      }

      // Inicia Enriquecimento Sequencial em Background (Não bloqueia a resposta!)
      (async () => {
        console.log(`[WWebJS] Starting background enrichment for ${messages.length} messages in ${jid}...`);
        for (const m of messages) {
          try {
            // Sincronização completa (isLean: false)
            const enriched = await syncMessageToSupabase(instanceName, m, m.fromMe, false);
             if (enriched) {
                this.emit('message:update', { 
                  messageId: enriched.id,
                  waMessageId: enriched.id,
                  chatId: jid,
                  instanceId: instanceName,
                  message: enriched
                }, instanceName);
             }
          } catch (err) {
            console.error(`[WWebJS] Background enrichment failed for msg ${m.id?.id}:`, err);
          }
          // Pequeno delay opcional para não saturar o Puppeteer se houver muitas mídias
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log(`[WWebJS] Background enrichment completed for ${jid}`);
      })().catch(err => console.error('[WWebJS] Background enrichment process crashed:', err));

        console.log(`[WWebJS] Chat ${jid} opened: Returned ${canonicalMessages.length} identity-safe messages instantly.`);
        return canonicalMessages;
    } catch (error: any) {
      console.error(`[WWebJS] Error fetching messages for ${jid}:`, error.message);
      // CORREÇÃO CIRÚRGICA: NÃO chama connect() diretamente.
      if (error.message?.includes('detached Frame')) {
         console.warn(`[WWebJS][${instanceName}] Detached Frame em getMessages. Sinalizando estado degradado.`);
         this.requestReconnect(instanceName, 'DETACHED_FRAME:getMessages');
      }
      throw error;
    }
  }

  getConnectionInfo(instanceName: string = 'default'): InstanceConnectionState {
    return this.getInstanceSnapshot(instanceName);
  }

  getAllInstances(): InstanceConnectionState[] {
    return Array.from(this.instanceStore.values()).map(inst => inst.state);
  }

  async markAsRead(instanceName: string = 'default', jid: string, messageId: string) {
    const instance = this.instanceStore.get(instanceName);
    if (!instance?.client) return;
    try {
      const chat = await instance.client.getChatById(jid);
      await chat.sendSeen();
    } catch (e) {}
  }

  // --- FASE 10: downloadMedia (método que faltava) ---
  async downloadMedia(instanceName: string = 'default', msgId: any): Promise<any | null> {
    const instance = this.instanceStore.get(instanceName);
    if (!instance?.client) {
      console.warn(`[WWebJS] downloadMedia: Instance ${instanceName} not connected.`);
      return null;
    }
    try {
      // msgId pode ser o objeto serializado ou o _serialized string
      const serializedId = typeof msgId === 'string' ? msgId : (msgId?._serialized || msgId?.id);
      if (!serializedId) return null;
      
      const msg = await instance.client.getMessageById(serializedId);
      if (!msg || !msg.hasMedia) return null;
      
      const media = await msg.downloadMedia();
      return media; // { data: base64, mimetype, filename }
    } catch (e: any) {
      console.error(`[WWebJS] downloadMedia error [${instanceName}]:`, e.message);
      return null;
    }
  }

  // --- IDENTITY REFRESH & ENRICHMENT ---

  private async refreshContactIdentityLater(instanceName: string, jid: string, delayMs: number = 3000) {
     setTimeout(() => this.refreshContactIdentity(instanceName, jid), delayMs);
  }

  public async refreshContactIdentity(instanceName: string, jid: string): Promise<boolean> {
     const instance = this.instanceStore.get(instanceName);
     if (!instance?.client || !jid || jid.includes('@g.us')) return false;

     try {
        const contact = await instance.client.getContactById(jid).catch(() => null);
        if (!contact) return false;

        const { classifyIdentity } = await import('./utils/identity');
        const { safeUpsertContactIdentity, getDbInstanceId } = await import('./supabase');

        const pushname = contact.pushname || contact.name || contact.shortName || '';
        const quality = classifyIdentity(pushname);
        
        if (quality === 'rich') {
           const dbId = await getDbInstanceId(instanceName);
           if (!dbId) return false;

           await safeUpsertContactIdentity({
              instance_id: dbId,
              jid: jid,
              phone_normalized: jid.split('@')[0],
              pushname: pushname,
              identity_quality: quality,
              identity_source: 'contact.refresh',
              avatar_url: await contact.getProfilePicUrl().catch(() => null)
           });

           // Emite evento para o Frontend atualizar a Sidebar em tempo real
           this.emit('contact:update', {
              jid,
              instanceId: instanceName,
              pushname,
              name: pushname,
              identityQuality: quality,
              profilePic: await contact.getProfilePicUrl().catch(() => null)
           }, instanceName);

           return true;
        }
        return false;
     } catch (err) {
        console.error(`[Identity Refresh] Failed for ${jid}:`, err);
        return false;
     }
  }

  private async backfillInstanceIdentities(instanceName: string) {
     try {
        const { supabase, getDbInstanceId } = await import('./supabase');
        const dbId = await getDbInstanceId(instanceName);
        if (!dbId) return;

        // Busca contatos com qualidade 'poor' ou 'empty'
        const { data: poorContacts } = await supabase
           .from('whatsapp_contacts')
           .select('jid')
           .eq('instance_id', dbId)
           .or('identity_quality.eq.poor,identity_quality.eq.empty')
           .limit(100);

        if (poorContacts && poorContacts.length > 0) {
           console.log(`[Identity Backfill] Found ${poorContacts.length} poor identities to refresh for ${instanceName}`);
           for (const c of poorContacts) {
              await this.refreshContactIdentity(instanceName, c.jid);
              await new Promise(r => setTimeout(r, 500)); // Rate limiting
           }
        }
     } catch (err) {
        console.warn(`[Identity Backfill] Initial run failed for ${instanceName}:`, err);
     }
  }

  private async backfillGroupParticipants(instanceName: string) {
    // GUARD: só executa se a instância estiver realmente conectada
    const snapshot = this.getInstanceSnapshot(instanceName);
    if (snapshot.status !== 'connected') {
      console.log(`[Pente-Fino][${instanceName}] Ignorado: status é '${snapshot.status}'.`);
      return;
    }

    // Aguarda 5s adicionais para garantir que o WA Web carregou completamente
    await new Promise(r => setTimeout(r, 5000));

    // Verifica novamente após o delay
    const snapAfterDelay = this.getInstanceSnapshot(instanceName);
    if (snapAfterDelay.status !== 'connected') {
      console.log(`[Pente-Fino][${instanceName}] Abortado após delay: status mudou para '${snapAfterDelay.status}'.`);
      return;
    }

    console.log(`[Pente-Fino][${instanceName}] Iniciando varredura de grupos...`);
    const instance = this.instanceStore.get(instanceName);
    if (!instance?.client) return; // Guard extra contra client nulo

     try {
        const chats = await instance.client.getChats();
        const groups = chats.filter(c => c.isGroup);

        console.log(`[Pente-Fino][${instanceName}] Encontrados ${groups.length} grupos para auditar.`);

        for (const group of groups) {
           const participants = (group as any).groupMetadata?.participants || [];
           if (participants.length === 0) continue;

           console.log(`[Pente-Fino][${group.name}] Auditando ${participants.length} participantes...`);

           for (const p of participants) {
              const pJid = p.id._serialized;
              // Só tenta se não for eu mesmo (opcional, mas evita redundância)
              await this.refreshContactIdentity(instanceName, pJid);
              await new Promise(r => setTimeout(r, 200)); // Delay curto entre participantes
           }
           
           await new Promise(r => setTimeout(r, 2000)); // Delay maior entre grupos
        }
        console.log(`[Pente-Fino][${instanceName}] Varredura de grupos concluída.`);
     } catch (err) {
        console.error(`[Pente-Fino][${instanceName}] Erro durante auditoria de grupos:`, err);
     }
  }
   /**
    * Sincronização em background para popular o Banco de Dados.
    * Chamado automaticamente após o status 'ready'.
    * BLINDADO: Aborta automaticamente se a instância sair de 'connected'.
    */
   private async runBackgroundFullSync(instanceName: string) {
      // CORREÇÃO: Verificar estado ANTES de iniciar
      const initialState = this.getInstanceSnapshot(instanceName);
      if (initialState.status !== 'connected') {
        console.warn(`[SYNC][${instanceName}] Abortando sync: instância não está connected (status: ${initialState.status}).`);
        return;
      }

      console.log(`[SYNC][${instanceName}] Iniciando Backfill Automático de Histórico...`);
      const { syncMessageToSupabase } = await import('./supabase');
      
      try {
        const chats = await this.getChats(instanceName);
        console.log(`[SYNC][${instanceName}] ${chats.length} chats detectados para sincronia.`);
        
        const topChats = chats.slice(0, 50);
        let totalSynced = 0;

        for (const chat of topChats) {
           // CORREÇÃO: Verificar estado a cada iteração — abortar se desconectou
           const currentState = this.getInstanceSnapshot(instanceName);
           if (currentState.status !== 'connected') {
             console.warn(`[SYNC][${instanceName}] Sync abortado: instância saiu de 'connected' durante o loop.`);
             return;
           }

           const jid = chat.id._serialized;
           console.log(`[SYNC][${instanceName}] Sincronizando Chat: ${jid}...`);
           
           try {
              const messages = await this.getMessages(instanceName, jid, 50);
              for (const msg of messages) {
                 const saved = await syncMessageToSupabase(instanceName, msg, msg.fromMe);
                 if (saved) totalSynced++;
              }
           } catch (e) {
              console.warn(`[SYNC][${instanceName}] Erro ao sincronizar JID ${jid}:`, e);
           }
           
           await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`[SYNC][${instanceName}] Backfill concluído. Total: ${totalSynced} mensagens.`);
      } catch (err) {
        console.error(`[SYNC][${instanceName}] Falha crítica no motor de sincronização:`, err);
      }
   }
}

export const whatsappService = new WhatsAppService();
