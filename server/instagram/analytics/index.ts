import { supabase } from '../../supabase';
import pino from 'pino';

const logger = pino({ name: 'InstagramAnalytics' });

export interface AccountAnalytics {
  accountId: string;
  period: 'day' | 'week' | 'month';
  followers: {
    total: number;
    gained: number;
    lost: number;
    net: number;
  };
  engagement: {
    totalLikes: number;
    totalComments: number;
    avgLikes: number;
    avgComments: number;
    engagementRate: number;
  };
  posts: {
    total: number;
    photos: number;
    videos: number;
    stories: number;
    avgPostsPerDay: number;
  };
  topPosts: Array<{
    id: string;
    likes: number;
    comments: number;
    date: string;
  }>;
  actions: {
    follows: number;
    unfollows: number;
    likes: number;
    comments: number;
    posts: number;
  };
  hourlyActivity: Array<{
    hour: number;
    posts: number;
    engagement: number;
  }>;
  dailyStats: Array<{
    date: string;
    followers: number;
    posts: number;
    engagement: number;
  }>;
}

export interface CompetitorAnalytics {
  username: string;
  followers: number;
  following: number;
  posts: number;
  avgLikes: number;
  avgComments: number;
  engagementRate: number;
  postsThisWeek: number;
  growthRate: number;
}

export class AnalyticsService {
  async getAccountAnalytics(
    accountId: string,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<AccountAnalytics> {
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const followers = await this.getFollowerStats(accountId, days);
    const engagement = await this.getEngagementStats(accountId, days);
    const posts = await this.getPostStats(accountId, days);
    const topPosts = await this.getTopPosts(accountId, 5);
    const actions = await this.getActionsStats(accountId, days);
    const hourly = await this.getHourlyActivity(accountId, days);
    const daily = await this.getDailyStats(accountId, days);

    return {
      accountId,
      period,
      followers,
      engagement,
      posts,
      topPosts,
      actions,
      hourlyActivity: hourly,
      dailyStats: daily
    };
  }

  private async getFollowerStats(accountId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: history } = await supabase
      .from('instagram_follower_history')
      .select('*')
      .eq('account_id', accountId)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at');

    if (!history || history.length === 0) {
      return { total: 0, gained: 0, lost: 0, net: 0 };
    }

    const first = history[0].followers_count;
    const last = history[history.length - 1].followers_count;
    const gained = history.reduce((sum, h) => sum + (h.followers_gained || 0), 0);
    const lost = history.reduce((sum, h) => sum + (h.followers_lost || 0), 0);

    return {
      total: last,
      gained,
      lost,
      net: last - first
    };
  }

  private async getEngagementStats(accountId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: posts } = await supabase
      .from('instagram_posts')
      .select('*')
      .eq('account_id', accountId)
      .gte('published_at', startDate.toISOString())
      .not('status', 'eq', 'failed');

    if (!posts || posts.length === 0) {
      return { totalLikes: 0, totalComments: 0, avgLikes: 0, avgComments: 0, engagementRate: 0 };
    }

    const totalLikes = posts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
    const avgLikes = Math.round(totalLikes / posts.length);
    const avgComments = Math.round(totalComments / posts.length);

    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('follower_count')
      .eq('id', accountId)
      .single();

    const followers = account?.follower_count || 1;
    const engagementRate = ((totalLikes + totalComments) / followers / posts.length) * 100;

    return { totalLikes, totalComments, avgLikes, avgComments, engagementRate: Math.round(engagementRate * 100) / 100 };
  }

  private async getPostStats(accountId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: posts } = await supabase
      .from('instagram_posts')
      .select('*')
      .eq('account_id', accountId)
      .gte('published_at', startDate.toISOString())
      .not('status', 'eq', 'failed');

    const photos = posts?.filter(p => p.media_type === 'PHOTO').length || 0;
    const videos = posts?.filter(p => p.media_type === 'VIDEO').length || 0;
    const stories = posts?.filter(p => p.media_type === 'STORY').length || 0;
    const total = (posts?.length || 0) + stories;

    return {
      total,
      photos,
      videos,
      stories,
      avgPostsPerDay: Math.round((total / days) * 100) / 100
    };
  }

  private async getTopPosts(accountId: string, limit: number = 5) {
    const { data: posts } = await supabase
      .from('instagram_posts')
      .select('id, likes_count, comments_count, published_at')
      .eq('account_id', accountId)
      .not('status', 'eq', 'failed')
      .order('likes_count', { ascending: false })
      .limit(limit);

    return (posts || []).map(p => ({
      id: p.id,
      likes: p.likes_count || 0,
      comments: p.comments_count || 0,
      date: p.published_at
    }));
  }

  private async getActionsStats(accountId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: actions } = await supabase
      .from('instagram_actions')
      .select('action_type')
      .eq('account_id', accountId)
      .gte('created_at', startDate.toISOString());

    const stats = { follows: 0, unfollows: 0, likes: 0, comments: 0, posts: 0 };
    (actions || []).forEach(a => {
      if (a.action_type === 'follow') stats.follows++;
      if (a.action_type === 'unfollow') stats.unfollows++;
      if (a.action_type === 'like') stats.likes++;
      if (a.action_type === 'comment') stats.comments++;
    });

    const { data: posts } = await supabase
      .from('instagram_posts')
      .select('id')
      .eq('account_id', accountId)
      .gte('published_at', startDate.toISOString());

    stats.posts = posts?.length || 0;

    return stats;
  }

  private async getHourlyActivity(accountId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: posts } = await supabase
      .from('instagram_posts')
      .select('published_at, likes_count, comments_count')
      .eq('account_id', accountId)
      .gte('published_at', startDate.toISOString())
      .not('status', 'eq', 'failed');

    const hourly: Array<{ hour: number; posts: number; engagement: number }> = [];
    for (let i = 0; i < 24; i++) {
      const hourPosts = (posts || []).filter(p => new Date(p.published_at).getHours() === i);
      hourly.push({
        hour: i,
        posts: hourPosts.length,
        engagement: hourPosts.reduce((sum, p) => sum + (p.likes_count || 0) + (p.comments_count || 0), 0)
      });
    }

    return hourly;
  }

  private async getDailyStats(accountId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: posts } = await supabase
      .from('instagram_posts')
      .select('published_at, likes_count, comments_count')
      .eq('account_id', accountId)
      .gte('published_at', startDate.toISOString())
      .not('status', 'eq', 'failed');

    const daily: Array<{ date: string; followers: number; posts: number; engagement: number }> = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayPosts = (posts || []).filter(p => p.published_at.startsWith(dateStr));
      daily.push({
        date: dateStr,
        followers: 0,
        posts: dayPosts.length,
        engagement: dayPosts.reduce((sum, p) => sum + (p.likes_count || 0) + (p.comments_count || 0), 0)
      });
    }

    return daily.reverse();
  }

  async getCompetitorAnalytics(username: string, session: any) {
    try {
      const userInfo = await session.client.user.usernameinfo(username);
      const feed = session.client.feed.user(userInfo.pk);
      const posts = await feed.items();

      const totalLikes = posts.reduce((sum, p) => sum + (p.like_count || 0), 0);
      const totalComments = posts.reduce((sum, p) => sum + (p.comment_count || 0), 0);
      const avgLikes = posts.length > 0 ? Math.round(totalLikes / posts.length) : 0;
      const avgComments = posts.length > 0 ? Math.round(totalComments / posts.length) : 0;
      const engagementRate = userInfo.follower_count > 0 
        ? ((avgLikes + avgComments) / userInfo.follower_count) * 100 
        : 0;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const postsThisWeek = posts.filter(p => new Date(p.taken_at * 1000) > weekAgo).length;

      return {
        username,
        followers: userInfo.follower_count || 0,
        following: userInfo.following_count || 0,
        posts: userInfo.media_count || 0,
        avgLikes,
        avgComments,
        engagementRate: Math.round(engagementRate * 100) / 100,
        postsThisWeek,
        growthRate: 0
      };
    } catch (err) {
      logger.error({ username, error: err }, 'Failed to get competitor analytics');
      throw err;
    }
  }

  async recordAction(accountId: string, actionType: string, metadata?: Record<string, unknown>) {
    await supabase
      .from('instagram_actions')
      .insert({
        account_id: accountId,
        action_type: actionType,
        metadata,
        created_at: new Date().toISOString()
      });
  }
}

export const analyticsService = new AnalyticsService();
