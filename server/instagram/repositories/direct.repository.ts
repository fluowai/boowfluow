import { InstagramSession } from '../types';
import { mapIgError } from '../errors';
import pino from 'pino';

const logger = pino({ name: 'DirectRepository' });

export class DirectService {
  constructor(private session: InstagramSession) {}

  async getInbox() {
    try {
      return await this.session.client.feed.directInbox();
    } catch (err) {
      logger.error({ error: err }, 'Failed to get inbox');
      throw mapIgError(err);
    }
  }

  async getPendingInbox() {
    try {
      return await this.session.client.feed.directPending();
    } catch (err) {
      logger.error({ error: err }, 'Failed to get pending inbox');
      throw mapIgError(err);
    }
  }

  async getThread(threadId: string) {
    try {
      const feed = this.session.client.feed.directThread({ threadId } as any);
      return await feed.items();
    } catch (err) {
      logger.error({ threadId, error: err }, 'Failed to get thread');
      throw mapIgError(err);
    }
  }

  async sendMessage(options: {
    recipientUsers: string[];
    text?: string;
    threadTitle?: string;
  }) {
    try {
      const { recipientUsers, text, threadTitle } = options;
      
      if (recipientUsers.length > 1 && threadTitle) {
        return await this.session.client.direct.createGroupThread(recipientUsers, threadTitle);
      }
      
      return await this.session.client.directThread.broadcast({
        recipientUsers,
        text
      } as any);
    } catch (err) {
      logger.error({ error: err }, 'Failed to send message');
      throw mapIgError(err);
    }
  }

  async approveThread(threadId: string) {
    try {
      return await this.session.client.directThread.approve(threadId);
    } catch (err) {
      logger.error({ threadId, error: err }, 'Failed to approve thread');
      throw mapIgError(err);
    }
  }

  async declineThread(threadId: string) {
    try {
      return await this.session.client.directThread.decline(threadId);
    } catch (err) {
      logger.error({ threadId, error: err }, 'Failed to decline thread');
      throw mapIgError(err);
    }
  }

  async muteThread(threadId: string) {
    try {
      return await this.session.client.directThread.mute(threadId);
    } catch (err) {
      logger.error({ threadId, error: err }, 'Failed to mute thread');
      throw mapIgError(err);
    }
  }

  async unmuteThread(threadId: string) {
    try {
      return await this.session.client.directThread.unmute(threadId);
    } catch (err) {
      logger.error({ threadId, error: err }, 'Failed to unmute thread');
      throw mapIgError(err);
    }
  }

  async hideThread(threadId: string) {
    try {
      return await this.session.client.directThread.hide(threadId);
    } catch (err) {
      logger.error({ threadId, error: err }, 'Failed to hide thread');
      throw mapIgError(err);
    }
  }

  async updateThreadTitle(threadId: string, title: string) {
    try {
      return await this.session.client.directThread.updateTitle(threadId, title);
    } catch (err) {
      logger.error({ threadId, error: err }, 'Failed to update thread title');
      throw mapIgError(err);
    }
  }

  async leaveThread(threadId: string) {
    try {
      return await this.session.client.directThread.leave(threadId);
    } catch (err) {
      logger.error({ threadId, error: err }, 'Failed to leave thread');
      throw mapIgError(err);
    }
  }

  async markSeen(threadId: string, itemId: string) {
    try {
      return await this.session.client.directThread.markItemSeen(threadId, itemId);
    } catch (err) {
      logger.error({ threadId, itemId, error: err }, 'Failed to mark seen');
      throw mapIgError(err);
    }
  }
}
