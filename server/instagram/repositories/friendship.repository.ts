import { InstagramSession } from '../types';
import { mapIgError } from '../errors';
import pino from 'pino';

const logger = pino({ name: 'FriendshipRepository' });

export class FriendshipService {
  constructor(private session: InstagramSession) {}

  async follow(userId: string | number) {
    try {
      return await this.session.client.friendship.create(userId);
    } catch (err) {
      logger.error({ userId, error: err }, 'Failed to follow user');
      throw mapIgError(err);
    }
  }

  async unfollow(userId: string | number) {
    try {
      return await this.session.client.friendship.destroy(userId);
    } catch (err) {
      logger.error({ userId, error: err }, 'Failed to unfollow user');
      throw mapIgError(err);
    }
  }

  async show(userId: string | number) {
    try {
      return await this.session.client.friendship.show(userId);
    } catch (err) {
      logger.error({ userId, error: err }, 'Failed to get friendship status');
      throw mapIgError(err);
    }
  }

  async showMany(userIds: string[] | number[]) {
    try {
      return await this.session.client.friendship.showMany(userIds as string[]);
    } catch (err) {
      logger.error({ userIds, error: err }, 'Failed to get many friendship statuses');
      throw mapIgError(err);
    }
  }

  async block(userId: string | number) {
    try {
      return await this.session.client.friendship.block(userId);
    } catch (err) {
      logger.error({ userId, error: err }, 'Failed to block user');
      throw mapIgError(err);
    }
  }

  async unblock(userId: string | number) {
    try {
      return await this.session.client.friendship.unblock(userId);
    } catch (err) {
      logger.error({ userId, error: err }, 'Failed to unblock user');
      throw mapIgError(err);
    }
  }

  async approve(userId: string | number) {
    try {
      return await this.session.client.friendship.approve(userId);
    } catch (err) {
      logger.error({ userId, error: err }, 'Failed to approve follow request');
      throw mapIgError(err);
    }
  }

  async deny(userId: string | number) {
    try {
      return await this.session.client.friendship.deny(userId);
    } catch (err) {
      logger.error({ userId, error: err }, 'Failed to deny follow request');
      throw mapIgError(err);
    }
  }

  async removeFollower(userId: string | number) {
    try {
      return await this.session.client.friendship.removeFollower(userId);
    } catch (err) {
      logger.error({ userId, error: err }, 'Failed to remove follower');
      throw mapIgError(err);
    }
  }

  async mutePosts(userId: string | number) {
    try {
      return await this.session.client.friendship.mutePostsOrStoryFromFollow({ targetPostsAuthorId: String(userId) });
    } catch (err) {
      logger.error({ userId, error: err }, 'Failed to mute posts');
      throw mapIgError(err);
    }
  }

  async unmutePosts(userId: string | number) {
    try {
      return await this.session.client.friendship.unmutePostsOrStoryFromFollow({ targetPostsAuthorId: String(userId) });
    } catch (err) {
      logger.error({ userId, error: err }, 'Failed to unmute posts');
      throw mapIgError(err);
    }
  }
}
