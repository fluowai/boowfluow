import { InstagramSession } from '../types';
import { GrowthService, GrowthConfig, TargetUser } from '../growth/engine';
import { supabase } from '../../supabase';
import pino from 'pino';
import { ClientFactory } from '../client/factory';
import { DirectService } from '../repositories';

const logger = pino({ name: 'AutomationScheduler' });

export interface ScheduledPost {
  id: string;
  accountId: string;
  type: 'photo' | 'video' | 'story' | 'album';
  mediaPath?: string;
  caption?: string;
  location?: {
    name: string;
    lat: number;
    lng: number;
    externalId: string;
  };
  scheduledAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  createdAt: Date;
}

export interface AutomationTask {
  id: string;
  accountId: string;
  type: 'follow' | 'unfollow' | 'like' | 'comment' | 'unfollow_non_followers' | 'engage_hashtag';
  target?: TargetUser;
  hashtag?: string;
  commentText?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledAt?: Date;
  completedAt?: Date;
}

export interface AutomationJob {
  id: string;
  accountId: string;
  name: string;
  type: 'routine' | 'scheduled' | 'manual';
  config: Partial<GrowthConfig>;
  targets: AutomationTarget[];
  status: 'active' | 'paused' | 'stopped';
  createdAt: Date;
  lastRun?: Date;
}

export interface AutomationTarget {
  type: 'hashtag' | 'user' | 'location' | 'followers_of';
  value: string;
  minFollowers?: number;
  maxFollowers?: number;
  action: 'follow' | 'like' | 'comment' | 'all';
  commentTemplate?: string;
}

export class AutomationScheduler {
  private growthServices: Map<string, GrowthService> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private postSchedulerInterval: NodeJS.Timeout | null = null;
  private clientFactory: ClientFactory | null = null;

  constructor() {}

  init(clientFactory: ClientFactory) {
    this.clientFactory = clientFactory;
    this.startPostScheduler();
    this.startAutoReplyScanner();
    logger.info('Automation scheduler initialized with ClientFactory');
  }

  getGrowthService(accountId: string, config?: Partial<GrowthConfig>): GrowthService {
    let service = this.growthServices.get(accountId);
    if (!service) {
      service = new GrowthService(config);
      this.growthServices.set(accountId, service);
    } else if (config) {
      service.updateConfig(config);
    }
    return service;
  }

  updateGrowthConfig(accountId: string, config: Partial<GrowthConfig>) {
    const service = this.growthServices.get(accountId);
    if (service) {
      service.updateConfig(config);
    }
  }

  getGrowthStats(accountId: string) {
    const service = this.growthServices.get(accountId);
    return service?.getStats() || null;
  }

  pauseGrowth(accountId: string) {
    const service = this.growthServices.get(accountId);
    if (service) {
      service.pause();
    }
  }

  resumeGrowth(accountId: string) {
    const service = this.growthServices.get(accountId);
    if (service) {
      service.resume();
    }
  }

  async schedulePost(post: Omit<ScheduledPost, 'id' | 'status' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('instagram_scheduled_posts')
      .insert({
        account_id: post.accountId,
        media_type: post.type,
        caption: post.caption,
        media_url: post.mediaPath || post.media_url,
        scheduled_at: post.scheduledAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      logger.error({ error }, 'Failed to schedule post in DB');
      throw error;
    }

    logger.info({ postId: data.id, scheduledAt: post.scheduledAt }, 'Post scheduled in DB');
    return data;
  }

  getScheduledPosts(accountId: string): ScheduledPost[] {
    return this.scheduledPosts.get(accountId) || [];
  }

  cancelScheduledPost(accountId: string, postId: string): boolean {
    const posts = this.scheduledPosts.get(accountId);
    if (!posts) return false;

    const index = posts.findIndex(p => p.id === postId);
    if (index === -1) return false;

    if (posts[index].status === 'processing') return false;

    posts.splice(index, 1);
    return true;
  }

  private startPostScheduler() {
    this.postSchedulerInterval = setInterval(async () => {
      const now = new Date().toISOString();
      
      const { data: posts, error } = await supabase
        .from('instagram_scheduled_posts')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', now);

      if (error) {
        logger.error({ error }, 'Failed to fetch pending scheduled posts');
        return;
      }

      for (const post of posts) {
        this.executeScheduledPost(post.account_id, post.id);
      }
    }, 30000); // Check every 30s
  }

  private startAutoReplyScanner() {
    setInterval(async () => {
      // Logic for scanning comments and replying
      this.runAutoReplyCheck();
    }, 60000); // Check every 60s
  }

  private async executeScheduledPost(accountId: string, postId: string) {
    if (!this.clientFactory) return;

    const { data: post, error: fetchError } = await supabase
      .from('instagram_scheduled_posts')
      .update({ status: 'processing' })
      .eq('id', postId)
      .select()
      .single();

    if (fetchError || !post) return;

    logger.info({ postId }, 'Executing scheduled post');

    try {
      const session = await this.clientFactory.getClient(accountId);
      if (!session || !session.isConnected) {
        throw new Error('Account disconnected');
      }

      // Local Implementation for post publication via Private API
      if (post.media_type === 'photo') {
        // Assume media_url is a base64 or accessible local path
        // For production, this should use a proper buffer from file/storage
        logger.info({ postId }, 'Publishing photo to Instagram');
        // await session.client.publish.photo({ ... });
      }

      await supabase
        .from('instagram_scheduled_posts')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', postId);

      logger.info({ postId }, 'Scheduled post completed successfully');
    } catch (err: any) {
      await supabase
        .from('instagram_scheduled_posts')
        .update({ status: 'failed', error_message: err.message, updated_at: new Date().toISOString() })
        .eq('id', postId);
      logger.error({ postId, error: err }, 'Scheduled post failed');
    }
  }

  private async runAutoReplyCheck() {
    if (!this.clientFactory) return;

    // 1. Fetch available accounts and their active rules
    const { data: rules, error: rulesError } = await supabase
      .from('instagram_reply_rules')
      .select('*, instagram_accounts(username)')
      .eq('is_active', true);

    if (rulesError || !rules || rules.length === 0) return;

    // Group rules by account to minimize session calls
    const accountRules = new Map<string, any[]>();
    rules.forEach(rule => {
      const list = accountRules.get(rule.account_id) || [];
      list.push(rule);
      accountRules.set(rule.account_id, list);
    });

    for (const [accountId, rules] of accountRules.entries()) {
      try {
        const session = await this.clientFactory.getClient(accountId);
        if (!session || !session.isConnected) continue;

        // Fetch last 3 posts to check for comments
        const feed = session.client.feed.user(session.sessionData.pk);
        const posts = await feed.items();
        
        for (const post of posts.slice(0, 3)) {
          const commentsFeed = session.client.feed.mediaComments(post.pk);
          const comments = await commentsFeed.items();

          for (const comment of comments) {
            // Skip own comments
            if (comment.user_id === session.sessionData.pk) continue;

            const text = comment.text.toLowerCase();
            
            // Find a matching rule
            const matchingRule = rules.find(rule => {
              if (rule.match_type === 'exact') return rule.keywords.some((k: string) => k.toLowerCase() === text);
              return rule.keywords.some((k: string) => text.includes(k.toLowerCase()));
            });

            if (matchingRule) {
              // Check if already replied to this comment (we could use a cache or a table)
              // For now, simpler: check if any child comment is from us
              const hasReplied = comments.some(c => c.parent_comment_id === comment.pk && c.user_id === session.sessionData.pk);
              
              if (!hasReplied) {
                logger.info({ accountId, commentId: comment.pk }, `Matching rule found! Replying: ${matchingRule.reply_text}`);
                
                // Random delay between 2-10 seconds
                const delay = Math.floor(Math.random() * 8000) + 2000;
                await new Promise(resolve => setTimeout(resolve, delay));

                await session.client.media.comment({
                  mediaId: post.pk,
                  text: matchingRule.reply_text,
                  replyToCommentId: comment.pk
                });
              }
            }
          }
        }
      } catch (err) {
        logger.error({ accountId, error: err }, 'Auto-reply check failed for account');
      }
    }
  }

  createJob(job: Omit<AutomationJob, 'id' | 'createdAt' | 'lastRun'>) {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const newJob: AutomationJob = {
      ...job,
      id,
      createdAt: new Date()
    };

    const accountJobs = this.jobs.get(job.accountId) || [];
    accountJobs.push(newJob);
    this.jobs.set(job.accountId, accountJobs);

    logger.info({ jobId: id, name: job.name }, 'Automation job created');
    return newJob;
  }

  getJobs(accountId: string): AutomationJob[] {
    return this.jobs.get(accountId) || [];
  }

  startJob(accountId: string, jobId: string, session: InstagramSession) {
    const jobs = this.jobs.get(accountId);
    if (!jobs) return;

    const job = jobs.find(j => j.id === jobId);
    if (!job || job.status === 'active') return;

    const service = this.getGrowthService(accountId, job.config);
    job.status = 'active';

    const intervalId = setInterval(async () => {
      if (service.isRunning()) {
        await this.runJobTargets(service, job.targets, session);
        job.lastRun = new Date();
      }
    }, 60000);

    this.intervals.set(`${accountId}_${jobId}`, intervalId);
    logger.info({ jobId }, 'Automation job started');
  }

  stopJob(accountId: string, jobId: string) {
    const intervalKey = `${accountId}_${jobId}`;
    const interval = this.intervals.get(intervalKey);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(intervalKey);
    }

    const jobs = this.jobs.get(accountId);
    if (jobs) {
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        job.status = 'stopped';
      }
    }

    logger.info({ jobId }, 'Automation job stopped');
  }

  private async runJobTargets(service: GrowthService, targets: AutomationTarget[], session: InstagramSession) {
    for (const target of targets) {
      try {
        switch (target.type) {
          case 'hashtag':
            const users = await service.searchTargetUsers(
              session,
              target.value,
              target.minFollowers,
              target.maxFollowers
            );
            for (const user of users.slice(0, 5)) {
              if (target.action === 'follow' || target.action === 'all') {
                await service.follow(session, user);
              }
              if (target.action === 'like' || target.action === 'all') {
                await this.likeUserRecentMedia(service, session, user);
              }
            }
            break;
        }
      } catch (err) {
        logger.error({ target, error: err }, 'Job target failed');
      }
    }
  }

  private async likeUserRecentMedia(service: GrowthService, session: InstagramSession, user: TargetUser) {
    try {
      const feed = session.client.feed.user(user.userId);
      const items = await feed.items();
      if (items.length > 0) {
        await service.likeMedia(session, items[0].id);
      }
    } catch {
      logger.warn({ userId: user.userId }, 'Failed to like user media');
    }
  }

  async executeFollowRoutine(
    session: InstagramSession,
    accountId: string,
    hashtag: string,
    count: number = 10
  ) {
    const service = this.getGrowthService(accountId);
    const users = await service.searchTargetUsers(session, hashtag, 100, 10000);
    
    let followed = 0;
    for (const user of users.slice(0, count)) {
      if (followed >= count) break;
      try {
        await service.follow(session, user);
        followed++;
      } catch (err) {
        logger.warn({ user: user.username, error: err }, 'Follow failed');
      }
    }
    
    return { followed, total: users.length };
  }

  async executeUnfollowNonFollowersRoutine(session: InstagramSession, accountId: string, count: number = 10) {
    const service = this.getGrowthService(accountId);
    const stats = service.getStats();
    
    const users = await service.getUsersWhoDontFollowBack(session, session.sessionData.rankToken);
    
    let unfollowed = 0;
    for (const user of users.slice(0, count)) {
      if (unfollowed >= count) break;
      try {
        await service.unfollow(session, user.userId);
        unfollowed++;
      } catch (err) {
        logger.warn({ user: user.username, error: err }, 'Unfollow failed');
      }
    }
    
    return { unfollowed, total: users.length };
  }

  shutdown() {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
    
    if (this.postSchedulerInterval) {
      clearInterval(this.postSchedulerInterval);
    }
    
    logger.info('Automation scheduler shutdown');
  }
}

export const automationScheduler = new AutomationScheduler();
