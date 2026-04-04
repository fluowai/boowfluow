import { IgApiClient } from 'instagram-private-api';
import { InstagramSession, InstagramAccount, EncryptedSession } from '../types';
import { InstagramChallengeError, InstagramAuthError, mapIgError } from '../errors';
import { ChallengeHandler } from '../challenge';
import { SessionStore } from '../session';
import pino from 'pino';

const logger = pino({ name: 'InstagramClientFactory' });

export class ClientFactory {
  private sessions: Map<string, InstagramSession> = new Map();
  private sessionStore: SessionStore;
  private challengeHandler: ChallengeHandler;

  constructor(sessionStore: SessionStore, challengeHandler: ChallengeHandler) {
    this.sessionStore = sessionStore;
    this.challengeHandler = challengeHandler;
  }

  async createClient(account: InstagramAccount): Promise<InstagramSession> {
    const existing = this.sessions.get(account.id);
    if (existing?.isConnected) {
      return existing;
    }

    const client = new IgApiClient();
    client.state.generateDevice(account.username);

    if (account.sessionData) {
      await this.restoreSession(client, account.sessionData);
    }

    const session: InstagramSession = {
      accountId: account.id,
      client,
      sessionData: account.sessionData || {
        cookies: '',
        deviceString: client.state.deviceString,
        uuid: client.state.uuid,
        phoneId: client.state.phoneId,
        tokenName: '',
        rankToken: '',
        csrftoken: '',
        secret: '',
        pk: ''
      },
      proxy: account.proxy,
      isConnected: false,
      lastActivity: new Date()
    };

    if (account.proxy) {
      this.configureProxy(client, account.proxy);
    }

    this.sessions.set(account.id, session);
    return session;
  }

  async getClient(accountId: string): Promise<InstagramSession | null> {
    return this.sessions.get(accountId) || null;
  }

  async removeClient(accountId: string): Promise<void> {
    const session = this.sessions.get(accountId);
    if (session) {
      session.isConnected = false;
      this.sessions.delete(accountId);
    }
  }

  private configureProxy(client: IgApiClient, proxy: string): void {
    try {
      client.state.proxyUrl = proxy;
      logger.info({ proxy }, 'Proxy configured');
    } catch (err) {
      logger.warn({ proxy, error: err }, 'Invalid proxy URL');
    }
  }

  private async restoreSession(client: IgApiClient, sessionData: EncryptedSession): Promise<void> {
    try {
      if (sessionData.cookies) {
        await client.state.deserializeCookieJar(sessionData.cookies);
      }
      logger.info('Session restored for client');
    } catch (err) {
      logger.warn({ error: err }, 'Failed to restore session');
    }
  }

  async login(account: InstagramAccount): Promise<InstagramSession> {
    const session = await this.createClient(account);
    const { client } = session;

    try {
      logger.info({ username: account.username }, 'Starting login');

      await client.simulate.preLoginFlow();

      const loggedInUser = await client.account.login(account.username, account.password);

      await client.simulate.postLoginFlow();

      const serializedCookies = await client.state.serializeCookieJar();

      session.sessionData = {
        cookies: JSON.stringify(serializedCookies),
        deviceString: client.state.deviceString,
        uuid: client.state.uuid,
        phoneId: client.state.phoneId,
        tokenName: client.state.extractCookieValue('csrftoken') || '',
        rankToken: String(loggedInUser.pk),
        csrftoken: client.state.extractCookieValue('csrftoken') || '',
        secret: '',
        pk: String(loggedInUser.pk)
      };

      session.isConnected = true;
      session.lastActivity = new Date();

      await this.sessionStore.saveSession(account.id, session.sessionData);

      logger.info({ username: account.username, userId: loggedInUser.pk }, 'Login successful');

      return session;
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      const message = (error?.message as string) || '';

      if (message.includes('challenge_required') || message.includes('CHALLENGE')) {
        const challenge = error?.challenge as Record<string, unknown>;
        throw new InstagramChallengeError(
          'Challenge required to complete login',
          'verify',
          challenge?.api_path as string | undefined,
          error
        );
      }

      if (message.includes('two_factor') || message.includes('2FA')) {
        const twoFactorInfo = error?.two_factor_info;
        throw new InstagramChallengeError(
          'Two-factor authentication required',
          'sms',
          undefined,
          twoFactorInfo
        );
      }

      throw mapIgError(err);
    }
  }

  async logout(session: InstagramSession): Promise<void> {
    try {
      await session.client.account.logout();
      session.isConnected = false;
      await this.sessionStore.deleteSession(session.accountId);
      this.sessions.delete(session.accountId);
      logger.info({ accountId: session.accountId }, 'Logged out successfully');
    } catch (err) {
      logger.warn({ accountId: session.accountId, error: err }, 'Error during logout');
      session.isConnected = false;
      this.sessions.delete(session.accountId);
    }
  }

  async verifyChallenge(session: InstagramSession, code: string, challengeType: 'sms' | 'email'): Promise<boolean> {
    try {
      return await this.challengeHandler.verifyCode(session, code, challengeType);
    } catch (err) {
      throw mapIgError(err);
    }
  }

  getActiveSessions(): InstagramSession[] {
    return Array.from(this.sessions.values()).filter(s => s.isConnected);
  }
}
