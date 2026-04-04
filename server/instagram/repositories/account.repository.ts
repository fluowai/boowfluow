import { IgApiClient } from 'instagram-private-api';
import { InstagramSession } from '../types';
import { mapIgError } from '../errors';
import pino from 'pino';

const logger = pino({ name: 'AccountRepository' });

export class AccountService {
  constructor(private session: InstagramSession) {}

  async getCurrentUser() {
    try {
      return await this.session.client.account.currentUser();
    } catch (err) {
      logger.error({ error: err }, 'Failed to get current user');
      throw mapIgError(err);
    }
  }

  async setBiography(text: string) {
    try {
      return await this.session.client.account.setBiography(text);
    } catch (err) {
      logger.error({ error: err }, 'Failed to set biography');
      throw mapIgError(err);
    }
  }

  async editProfile(options: Record<string, string>) {
    try {
      return await this.session.client.account.editProfile(options as any);
    } catch (err) {
      logger.error({ error: err }, 'Failed to edit profile');
      throw mapIgError(err);
    }
  }

  async changePassword(oldPassword: string, newPassword: string) {
    try {
      return await this.session.client.account.changePassword(oldPassword, newPassword);
    } catch (err) {
      logger.error({ error: err }, 'Failed to change password');
      throw mapIgError(err);
    }
  }

  async setPrivate() {
    try {
      return await this.session.client.account.setPrivate();
    } catch (err) {
      logger.error({ error: err }, 'Failed to set account private');
      throw mapIgError(err);
    }
  }

  async setPublic() {
    try {
      return await this.session.client.account.setPublic();
    } catch (err) {
      logger.error({ error: err }, 'Failed to set account public');
      throw mapIgError(err);
    }
  }

  async removeProfilePicture() {
    try {
      return await this.session.client.account.removeProfilePicture();
    } catch (err) {
      logger.error({ error: err }, 'Failed to remove profile picture');
      throw mapIgError(err);
    }
  }

  async changeProfilePicture(picture: Buffer) {
    try {
      return await this.session.client.account.changeProfilePicture(picture);
    } catch (err) {
      logger.error({ error: err }, 'Failed to change profile picture');
      throw mapIgError(err);
    }
  }

  async sendRecoveryEmail(query: string) {
    try {
      return await this.session.client.account.sendRecoveryFlowEmail(query);
    } catch (err) {
      logger.error({ error: err }, 'Failed to send recovery email');
      throw mapIgError(err);
    }
  }
}
