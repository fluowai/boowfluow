import { InstagramSession } from '../types';
import { mapIgError } from '../errors';
import pino from 'pino';

const logger = pino({ name: 'UserRepository' });

export class UserService {
  constructor(private session: InstagramSession) {}

  async getInfo(userId: string | number) {
    try {
      return await this.session.client.user.info(userId);
    } catch (err) {
      logger.error({ userId, error: err }, 'Failed to get user info');
      throw mapIgError(err);
    }
  }

  async getInfoByUsername(username: string) {
    try {
      return await this.session.client.user.usernameinfo(username);
    } catch (err) {
      logger.error({ username, error: err }, 'Failed to get user info by username');
      throw mapIgError(err);
    }
  }

  async search(query: string) {
    try {
      return await this.session.client.user.search(query);
    } catch (err) {
      logger.error({ query, error: err }, 'Failed to search users');
      throw mapIgError(err);
    }
  }

  async searchExact(username: string) {
    try {
      return await this.session.client.user.searchExact(username);
    } catch (err) {
      logger.error({ username, error: err }, 'Failed to search exact user');
      throw mapIgError(err);
    }
  }

  async getIdByUsername(username: string) {
    try {
      return await this.session.client.user.getIdByUsername(username);
    } catch (err) {
      logger.error({ username, error: err }, 'Failed to get user id');
      throw mapIgError(err);
    }
  }

  async accountDetails(userId?: string | number) {
    try {
      return await this.session.client.user.accountDetails(userId);
    } catch (err) {
      logger.error({ userId, error: err }, 'Failed to get account details');
      throw mapIgError(err);
    }
  }

  async sharedFollowerAccounts(userId: string | number) {
    try {
      return await this.session.client.user.sharedFollowerAccounts(userId);
    } catch (err) {
      logger.error({ userId, error: err }, 'Failed to get shared follower accounts');
      throw mapIgError(err);
    }
  }

  async lookup(options: { email?: string; phone?: string; query?: string }) {
    try {
      return await this.session.client.user.lookup(options as any);
    } catch (err) {
      logger.error({ error: err }, 'Failed to lookup user');
      throw mapIgError(err);
    }
  }
}
