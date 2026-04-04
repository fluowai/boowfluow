import { InstagramAccount, ApiResponse, InstagramUser, InstagramThread, DirectInbox, SearchResult, InstagramMedia, FeedResponse } from '../../types/instagram';
import { supabase } from '../../lib/supabase';

const API_BASE = '/api/instagram';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`,
      ...options?.headers
    }
  });

  const data: ApiResponse<T> = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || 'Request failed');
  }
  
  return data.data as T;
}

export const instagramApi = {
  accounts: {
    list: () => request<InstagramAccount[]>('/accounts'),
    
    get: (id: string) => request<InstagramAccount>(`/accounts/${id}`),
    
    create: (data: { username: string; password: string; proxy?: string }) => 
      request<InstagramAccount>('/accounts', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    
    delete: (id: string) => 
      request<void>(`/accounts/${id}`, { method: 'DELETE' }),
    
    login: (id: string) => 
      request<{ connected?: boolean; challenge?: boolean; type?: string }>(`/accounts/${id}/login`, { method: 'POST' }),
    
    logout: (id: string) => 
      request<void>(`/accounts/${id}/logout`, { method: 'POST' }),
    
    verifyChallenge: (id: string, code: string) =>
      request<boolean>(`/accounts/${id}/challenge/verify`, {
        method: 'POST',
        body: JSON.stringify({ code })
      })
  },

  profile: {
    get: (accountId: string) => request<InstagramUser>(`/accounts/${accountId}/profile`),
    getUser: (accountId: string, username: string) => request<InstagramUser>(`/accounts/${accountId}/user/${username}`)
  },

  followers: {
    list: (accountId: string) => request<InstagramUser[]>(`/accounts/${accountId}/followers`)
  },

  following: {
    list: (accountId: string) => request<InstagramUser[]>(`/accounts/${accountId}/following`)
  },

  feed: {
    timeline: (accountId: string) => request<InstagramMedia[]>(`/accounts/${accountId}/feed/timeline`),
    user: (accountId: string, userId: string) => request<InstagramMedia[]>(`/accounts/${accountId}/feed/user/${userId}`),
    saved: (accountId: string) => request<InstagramMedia[]>(`/accounts/${accountId}/feed/saved`),
    liked: (accountId: string) => request<InstagramMedia[]>(`/accounts/${accountId}/feed/liked`),
    discover: (accountId: string) => request<InstagramMedia[]>(`/accounts/${accountId}/feed/discover`),
    location: (accountId: string, locationId: string) => request<InstagramMedia[]>(`/accounts/${accountId}/location/${locationId}/feed`)
  },

  media: {
    like: (accountId: string, mediaId: string) => 
      request<void>(`/accounts/${accountId}/media/${mediaId}/like`, { method: 'POST' }),
    
    unlike: (accountId: string, mediaId: string) => 
      request<void>(`/accounts/${accountId}/media/${mediaId}/like`, { method: 'DELETE' }),
    
    comment: (accountId: string, mediaId: string, text: string) => 
      request<unknown>(`/accounts/${accountId}/media/${mediaId}/comment`, {
        method: 'POST',
        body: JSON.stringify({ text })
      }),
    
    save: (accountId: string, mediaId: string) => 
      request<void>(`/accounts/${accountId}/media/${mediaId}/save`, { method: 'POST' })
  },

  direct: {
    inbox: (accountId: string) => request<DirectInbox>(`/accounts/${accountId}/inbox`),
    thread: (accountId: string, threadId: string) => 
      request<{ messages: unknown[] }>(`/accounts/${accountId}/thread/${threadId}`),
    send: (accountId: string, data: { recipientUsers: string[]; text?: string; threadTitle?: string }) =>
      request<unknown>(`/accounts/${accountId}/direct`, {
        method: 'POST',
        body: JSON.stringify(data)
      })
  },

  search: {
    users: (accountId: string, query: string) => 
      request<SearchResult>(`/accounts/${accountId}/search/users?q=${encodeURIComponent(query)}`),
    hashtags: (accountId: string, query: string) => 
      request<SearchResult>(`/accounts/${accountId}/search/hashtags?q=${encodeURIComponent(query)}`),
    locations: (accountId: string, query: string) => 
      request<SearchResult>(`/accounts/${accountId}/search/locations?q=${encodeURIComponent(query)}`),
    blended: (accountId: string, query: string) => 
      request<SearchResult>(`/accounts/${accountId}/search/blended?q=${encodeURIComponent(query)}`)
  },

  tags: {
    feed: (accountId: string, tag: string) => 
      request<InstagramMedia[]>(`/accounts/${accountId}/tags/${encodeURIComponent(tag)}`)
  },

  location: {
    info: (accountId: string, locationId: string) => 
      request<unknown>(`/accounts/${accountId}/location/${locationId}`),
    feed: (accountId: string, locationId: string) => 
      request<InstagramMedia[]>(`/accounts/${accountId}/location/${locationId}/feed`)
  },

  follow: {
    follow: (accountId: string, userId: string) => 
      request<unknown>(`/accounts/${accountId}/follow/${userId}`, { method: 'POST' }),
    unfollow: (accountId: string, userId: string) => 
      request<unknown>(`/accounts/${accountId}/follow/${userId}`, { method: 'DELETE' })
  },

  publish: {
    photo: async (accountId: string, file: File, caption?: string, location?: { name: string; lat: number; lng: number; externalId: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (caption) formData.append('caption', caption);
      if (location) formData.append('location', JSON.stringify(location));
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${API_BASE}/accounts/${accountId}/publish/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: formData
      });
      
      return response.json();
    },
    
    story: async (accountId: string, file: File, caption?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (caption) formData.append('caption', caption);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${API_BASE}/accounts/${accountId}/publish/story`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: formData
      });
      
      return response.json();
    }
  },

  health: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${API_BASE}/health`, {
      headers: {
        'Authorization': `Bearer ${session?.access_token || ''}`
      }
    });
    return response.json();
  }
};
