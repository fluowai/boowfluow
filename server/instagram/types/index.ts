import { IgApiClient } from 'instagram-private-api';

export interface InstagramAccount {
  id: string;
  username: string;
  password: string;
  proxy?: string;
  status: 'active' | 'inactive' | 'challenge' | 'error';
  lastLogin?: Date;
  lastError?: string;
  sessionData?: EncryptedSession;
  createdAt: Date;
  updatedAt: Date;
}

export interface EncryptedSession {
  cookies: string;
  deviceString: string;
  uuid: string;
  phoneId: string;
  tokenName: string;
  rankToken: string;
  csrftoken: string;
  secret: string;
  pk: string;
}

export interface InstagramSession {
  accountId: string;
  client: IgApiClient;
  sessionData: EncryptedSession;
  proxy?: string;
  isConnected: boolean;
  lastActivity: Date;
}

export interface InstagramChallenge {
  accountId: string;
  challengeUrl: string;
  challengeType: 'sms' | 'email' | 'verify_code';
  stepData?: {
    phone_number?: string;
    email?: string;
    form_action?: string;
  };
  status: 'pending' | 'resolved' | 'failed';
}

export interface InstagramChallengeResult {
  success: boolean;
  challengeType?: 'sms' | 'email';
  message?: string;
}

export interface InstagramLoginResult {
  success: boolean;
  account?: InstagramAccount;
  challenge?: InstagramChallenge;
  error?: {
    type: string;
    message: string;
  };
}

export interface InstagramPublishJob {
  id: string;
  accountId: string;
  type: 'photo' | 'video' | 'story' | 'album' | 'igtv';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  mediaPath?: string;
  caption?: string;
  options?: Record<string, unknown>;
  result?: unknown;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface InstagramDirectMessage {
  threadId: string;
  itemId: string;
  text?: string;
  mediaUrl?: string;
  senderId: string;
  timestamp: Date;
}

export interface InstagramFeedResult<T> {
  items: T[];
  nextMaxId?: string;
  moreAvailable: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ChallengeVerifyRequest {
  accountId: string;
  code: string;
  challengeType: 'sms' | 'email';
}

export interface PublishRequest {
  accountId: string;
  type: 'photo' | 'video' | 'story' | 'album' | 'igtv';
  mediaPath?: string;
  mediaUrls?: string[];
  caption?: string;
  location?: {
    name: string;
    lat: number;
    lng: number;
    externalId: string;
  };
  users?: Array<{ username: string; x: number; y: number }>;
  music?: {
    id: string;
    startTime: number;
  };
  extraOptions?: Record<string, unknown>;
}

export interface DirectMessageRequest {
  accountId: string;
  recipientIds: string[];
  text?: string;
  mediaPath?: string;
  threadTitle?: string;
}

export interface SearchRequest {
  accountId: string;
  type: 'user' | 'hashtag' | 'location' | 'blended';
  query: string;
  location?: {
    lat: number;
    lng: number;
  };
}
