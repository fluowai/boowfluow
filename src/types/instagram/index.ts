export interface InstagramAccount {
  id: string;
  username: string;
  password?: string;
  proxy?: string;
  status: 'active' | 'inactive' | 'challenge' | 'error';
  last_login?: string;
  last_error?: string;
  created_at: string;
  updated_at?: string;
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

export interface InstagramUser {
  pk: string | number;
  username: string;
  full_name: string;
  profile_pic_url: string;
  is_private: boolean;
  friends?: boolean;
  following?: boolean;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  is_verified?: boolean;
}

export interface InstagramMedia {
  id: string;
  code: string;
  url: string;
  display_url: string;
  thumbnail_url?: string;
  media_type: 'PHOTO' | 'VIDEO' | 'CAROUSEL' | 'REELS';
  video_url?: string;
  caption?: string;
  like_count?: number;
  comment_count?: number;
  timestamp?: string;
  user?: InstagramUser;
  location?: {
    pk: string;
    name: string;
    lat: number;
    lng: number;
  };
}

export interface InstagramThread {
  thread_id: string;
  thread_v2_id?: string;
  users: InstagramUser[];
  title: string;
  is_group: boolean;
  is_archived: boolean;
  muted: boolean;
  pending: boolean;
  messages?: InstagramMessage[];
}

export interface InstagramMessage {
  item_id: string;
  user_id: string;
  timestamp: string;
  type: string;
  text?: string;
  media_url?: string;
  media?: {
    url: string;
    width: number;
    height: number;
  };
  link?: {
    url: string;
    title: string;
  };
}

export interface DirectInbox {
  threads: InstagramThread[];
  has_pending_top_requests: boolean;
  unread_count: number;
}

export interface SearchResult {
  users?: InstagramUser[];
  hashtags?: {
    id: string;
    name: string;
    media_count: number;
  }[];
  places?: {
    external_id: string;
    name: string;
    lat: number;
    lng: number;
    address?: string;
  }[];
}

export interface PublishOptions {
  file?: File | Blob;
  caption?: string;
  location?: {
    name: string;
    lat: number;
    lng: number;
    externalId: string;
  };
  users?: Array<{ username: string; x: number; y: number }>;
}

export interface ChallengeInfo {
  challenge: boolean;
  type?: 'sms' | 'email';
}

export interface FeedResponse<T> {
  items: T[];
  next_max_id?: string;
  more_available?: boolean;
}
