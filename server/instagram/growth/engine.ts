import { InstagramSession } from '../types';
import { mapIgError, InstagramRateLimitError, InstagramActionSpamError } from '../errors';
import pino from 'pino';

const logger = pino({ name: 'GrowthService' });

export interface GrowthConfig {
  maxFollowsPerHour: number;
  maxUnfollowsPerHour: number;
  maxLikesPerHour: number;
  maxCommentsPerHour: number;
  followDelay: number;
  unfollowDelay: number;
  likeDelay: number;
  commentDelay: number;
  unfollowAfterDays: number;
  keepFollowers: boolean;
  skipPrivate: boolean;
}

export interface GrowthStats {
  follows: number;
  unfollows: number;
  likes: number;
  comments: number;
  errors: number;
  lastAction: Date | null;
}

export interface TargetUser {
  username: string;
  userId: string | number;
  followers?: number;
  following?: number;
  isPrivate?: boolean;
}

const DEFAULT_CONFIG: GrowthConfig = {
  maxFollowsPerHour: 15,
  maxUnfollowsPerHour: 15,
  maxLikesPerHour: 100,
  maxCommentsPerHour: 20,
  followDelay: 30000,
  unfollowDelay: 25000,
  likeDelay: 3000,
  commentDelay: 45000,
  unfollowAfterDays: 7,
  keepFollowers: true,
  skipPrivate: true
};

export class GrowthService {
  private config: GrowthConfig;
  private stats: GrowthStats;
  private actionTimestamps: {
    follows: Date[];
    unfollows: Date[];
    likes: Date[];
    comments: Date[];
  };
  private isPaused: boolean = false;

  constructor(config: Partial<GrowthConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = { follows: 0, unfollows: 0, likes: 0, comments: 0, errors: 0, lastAction: null };
    this.actionTimestamps = { follows: [], unfollows: [], likes: [], comments: [] };
  }

  updateConfig(config: Partial<GrowthConfig>) {
    this.config = { ...this.config, ...config };
    logger.info(this.config, 'Growth config updated');
  }

  getConfig() {
    return { ...this.config };
  }

  getStats(): GrowthStats {
    return { ...this.stats };
  }

  pause() {
    this.isPaused = true;
    logger.info('Growth service paused');
  }

  resume() {
    this.isPaused = false;
    logger.info('Growth service resumed');
  }

  isRunning(): boolean {
    return !this.isPaused;
  }

  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private cleanOldTimestamps(type: keyof typeof this.actionTimestamps, hours: number) {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    this.actionTimestamps[type] = this.actionTimestamps[type].filter(d => d.getTime() > cutoff);
  }

  private canPerformAction(type: keyof typeof this.actionTimestamps, maxPerHour: number): boolean {
    this.cleanOldTimestamps(type, 1);
    return this.actionTimestamps[type].length < maxPerHour;
  }

  private recordAction(type: keyof typeof this.actionTimestamps) {
    this.actionTimestamps[type].push(new Date());
  }

  private async safeAction<T>(
    action: () => Promise<T>,
    actionType: keyof typeof this.actionTimestamps,
    maxPerHour: number,
    minDelay: number,
    maxDelay: number
  ): Promise<T | null> {
    if (this.isPaused) {
      logger.warn(`Growth paused, skipping ${actionType}`);
      return null;
    }

    if (!this.canPerformAction(actionType, maxPerHour)) {
      logger.warn(`${actionType} rate limit reached, waiting...`);
      throw new InstagramRateLimitError(`Max ${actionType} per hour reached`);
    }

    try {
      await this.randomDelay(minDelay, maxDelay);
      const result = await action();
      this.recordAction(actionType);
      this.stats.lastAction = new Date();
      return result;
    } catch (err) {
      this.stats.errors++;
      if (err instanceof InstagramRateLimitError || err instanceof InstagramActionSpamError) {
        throw err;
      }
      throw mapIgError(err);
    }
  }

  async follow(session: InstagramSession, user: TargetUser): Promise<boolean> {
    if (this.config.skipPrivate && user.isPrivate) {
      logger.info({ username: user.username }, 'Skipping private user');
      return false;
    }

    return this.safeAction(
      async () => {
        await session.client.friendship.create(user.userId);
        this.stats.follows++;
        logger.info({ username: user.username }, 'Followed user');
        return true;
      },
      'follows',
      this.config.maxFollowsPerHour,
      this.config.followDelay - 10000,
      this.config.followDelay + 10000
    ) as Promise<boolean>;
  }

  async unfollow(session: InstagramSession, userId: string | number): Promise<boolean> {
    return this.safeAction(
      async () => {
        await session.client.friendship.destroy(userId);
        this.stats.unfollows++;
        logger.info({ userId }, 'Unfollowed user');
        return true;
      },
      'unfollows',
      this.config.maxUnfollowsPerHour,
      this.config.unfollowDelay - 10000,
      this.config.unfollowDelay + 10000
    ) as Promise<boolean>;
  }

  async likeMedia(session: InstagramSession, mediaId: string): Promise<boolean> {
    return this.safeAction(
      async () => {
        await session.client.media.like({ mediaId, d: 0, moduleInfo: { module_name: 'feed_timeline' } } as any);
        this.stats.likes++;
        logger.info({ mediaId }, 'Liked media');
        return true;
      },
      'likes',
      this.config.maxLikesPerHour,
      this.config.likeDelay,
      this.config.likeDelay + 2000
    ) as Promise<boolean>;
  }

  async unlikeMedia(session: InstagramSession, mediaId: string): Promise<boolean> {
    return this.safeAction(
      async () => {
        await session.client.media.unlike({ mediaId, d: 0, moduleInfo: { module_name: 'feed_timeline' } } as any);
        logger.info({ mediaId }, 'Unliked media');
        return true;
      },
      'likes',
      this.config.maxLikesPerHour,
      this.config.likeDelay,
      this.config.likeDelay + 2000
    ) as Promise<boolean>;
  }

  async comment(session: InstagramSession, mediaId: string, text: string): Promise<boolean> {
    return this.safeAction(
      async () => {
        await session.client.media.comment({ mediaId, text, module: 'feed_timeline' });
        this.stats.comments++;
        logger.info({ mediaId }, 'Commented on media');
        return true;
      },
      'comments',
      this.config.maxCommentsPerHour,
      this.config.commentDelay - 15000,
      this.config.commentDelay + 15000
    ) as Promise<boolean>;
  }

  async getFollowersNotFollowingBack(session: InstagramSession, userId: string | number): Promise<TargetUser[]> {
    try {
      const followersFeed = session.client.feed.accountFollowers({ id: String(userId) } as any);
      const followingFeed = session.client.feed.accountFollowing({ id: String(userId) } as any);

      const followers = await followersFeed.items();
      const following = await followingFeed.items();

      const followerIds = new Set(followers.map((u: any) => u.pk));
      const notFollowingBack = following.filter((u: any) => !followerIds.has(u.pk));

      return notFollowingBack.map((u: any) => ({
        username: u.username,
        userId: u.pk,
        followers: u.follower_count,
        following: u.following_count,
        isPrivate: u.is_private
      }));
    } catch (err) {
      logger.error({ error: err }, 'Failed to get non-followers');
      throw mapIgError(err);
    }
  }

  async getUsersWhoDontFollowBack(session: InstagramSession, userId: string | number): Promise<TargetUser[]> {
    try {
      const followersFeed = session.client.feed.accountFollowers({ id: String(userId) } as any);
      const followingFeed = session.client.feed.accountFollowing({ id: String(userId) } as any);

      const followers = await followersFeed.items();
      const following = await followingFeed.items();

      const followerIds = new Set(followers.map((u: any) => u.pk));
      const dontFollowBack = followers.filter((u: any) => !followerIds.has(u.pk));

      return dontFollowBack.map((u: any) => ({
        username: u.username,
        userId: u.pk,
        followers: u.follower_count,
        following: u.following_count,
        isPrivate: u.is_private
      }));
    } catch (err) {
      logger.error({ error: err }, 'Failed to get non-followers back');
      throw mapIgError(err);
    }
  }

  async searchTargetUsers(
    session: InstagramSession,
    hashtag: string,
    minFollowers?: number,
    maxFollowers?: number
  ): Promise<TargetUser[]> {
    try {
      const tagFeed = session.client.feed.tag(hashtag);
      const items = await tagFeed.items();

      const users: TargetUser[] = [];
      const seenUsers = new Set<string>();

      for (const item of items) {
        const user = item.user as Record<string, any>;
        if (!user || seenUsers.has(String(user.pk))) continue;
        seenUsers.add(String(user.pk));

        if (minFollowers && (user.followers || user.follower_count) < minFollowers) continue;
        if (maxFollowers && (user.followers || user.follower_count) > maxFollowers) continue;

        users.push({
          username: user.username,
          userId: user.pk,
          followers: user.followers || user.follower_count,
          following: user.following_count,
          isPrivate: user.is_private
        });
      }

      return users;
    } catch (err) {
      logger.error({ error: err, hashtag }, 'Failed to search target users');
      throw mapIgError(err);
    }
  }

  async searchTargetUsersRaw(
    session: InstagramSession,
    hashtag: string,
    minFollowers?: number,
    maxFollowers?: number
  ): Promise<TargetUser[]> {
    try {
      const tagFeed = session.client.feed.tag(hashtag);
      const items = await tagFeed.items();

      const users: TargetUser[] = [];
      const seenUsers = new Set<string>();

      for (const item of items) {
        const user = item.user as Record<string, any>;
        if (!user || seenUsers.has(String(user.pk))) continue;
        seenUsers.add(String(user.pk));

        if (minFollowers && (user.followers || user.follower_count) < minFollowers) continue;
        if (maxFollowers && (user.followers || user.follower_count) > maxFollowers) continue;

        users.push({
          username: user.username,
          userId: user.pk,
          followers: user.followers || user.follower_count,
          following: user.following_count,
          isPrivate: user.is_private
        });
      }

      return users;
    } catch (err) {
      logger.error({ error: err, hashtag }, 'Failed to search target users');
      throw mapIgError(err);
    }
  }

  resetStats() {
    this.stats = { follows: 0, unfollows: 0, likes: 0, comments: 0, errors: 0, lastAction: null };
    this.actionTimestamps = { follows: [], unfollows: [], likes: [], comments: [] };
    logger.info('Growth stats reset');
  }
}
