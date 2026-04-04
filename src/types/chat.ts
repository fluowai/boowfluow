export type MediaStatus = 'none' | 'pending' | 'ready' | 'failed';

export interface CanonicalMedia {
  hasMedia: boolean;
  url: string | null;
  mimetype: string | null;
  filename: string | null;
  filesize: number | null;
  caption: string | null;
  status: MediaStatus;
  error?: string | null;
}

export interface CanonicalQuotedMessage {
  id: string;
  body: string | null;
  fullText: string | null; // <-- NOVO: Texto completo sem cortes
  type: string;
  authorName: string;
  authorPhone: string;
  isFromMe: boolean;
  participant?: string;
  isGroup: boolean;
  mediaUrl?: string | null; // <-- NOVO: Mídia da mensagem original se existir
}

export interface CanonicalMessage {
  id: string;           // messageId
  remoteJid: string;    // chat id
  phone_normalized: string; // <-- NOVO: Padrão 5548988003260

  body: string | null;
  renderedBody: string; // body already resolved with mentions
  type: string;
  media_type: string; // <-- NOVO: Para categorizar no preview da lista
  timestamp: number;    // Unix timestamp (seconds)
  fromMe: boolean;
  isGroup: boolean;
  isNewsletter: boolean;
  isInstagram: boolean;
  
  // Identity
  senderName: string;   // Display name of the sender
  senderPhone: string;  // Phone number of the sender
  senderQuality?: 'rich' | 'medium' | 'poor' | 'empty'; // <-- NOVO: Qualidade da identidade
  authorName: string;   // Participant name in groups OR senderName in private
  authorPhone: string;  // Participant phone in groups OR senderPhone in private
  authorQuality?: 'rich' | 'medium' | 'poor' | 'empty'; // <-- NOVO: Qualidade da identidade do autor
  notifyName: string;   // Native notifyName from WhatsApp
  
  mentions: string[];   // Array of participant JIDs (legacy/IDs)
  mentions_json?: any[]; // <-- NOVO: Array estruturado de menções clicáveis
  
  quotedMsg?: CanonicalQuotedMessage | null;
  media: CanonicalMedia;
  vcardName?: string | null;
  vcardPhone?: string | null;
  groupName?: string | null;
  
  // --- 🏎️ TRANSLATION (Fase 2) ---
  translated_content?: string | null;
  detected_language?: string | null;
  
  raw?: any;            // Store raw object if needed for debugging
  __normalized?: boolean; // Flag de blindagem para evitar loops de normalização
}

export type InstanceStatusInfo = 'idle' | 'starting' | 'qr_ready' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export type InstanceConnectionState = {
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

  updatedAt: string;
};

