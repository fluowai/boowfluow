import { IgApiClient, ChallengeStateResponse } from 'instagram-private-api';
import { InstagramSession } from '../types';
import { InstagramChallengeError } from '../errors';
import pino from 'pino';

const logger = pino({ name: 'ChallengeHandler' });

export interface ChallengeInfo {
  url: string;
  type: 'sms' | 'email' | 'verify';
  apiPath?: string;
  stepName?: string;
  stepData?: Record<string, unknown>;
}

export class ChallengeHandler {
  private pendingChallenges: Map<string, ChallengeInfo> = new Map();

  async handleChallenge(session: InstagramSession): Promise<ChallengeInfo> {
    const { client } = session;

    try {
      const state = await client.challenge.state();

      if (!state) {
        throw new InstagramChallengeError('No challenge info available', 'verify');
      }

      const challengeInfo: ChallengeInfo = {
        url: `/api/challenge/${session.accountId}`,
        type: this.determineChallengeType(state),
        stepName: state.step_name,
        stepData: state.step_data as unknown as Record<string, unknown>
      };

      this.pendingChallenges.set(session.accountId, challengeInfo);

      logger.info({ accountId: session.accountId, type: challengeInfo.type }, 'Challenge detected');

      return challengeInfo;
    } catch (err) {
      logger.error({ accountId: session.accountId, error: err }, 'Failed to get challenge state');
      throw err;
    }
  }

  private determineChallengeType(state: ChallengeStateResponse): 'sms' | 'email' | 'verify' {
    const stepData = state.step_data as unknown as Record<string, unknown>;
    const choice = stepData?.choice as string | undefined;

    if (choice === 'phone') return 'sms';
    if (choice === 'email') return 'email';
    if (stepData?.email && choice === '0') return 'email';
    if (stepData?.security_code || choice === 'verify') return 'verify';
    return 'verify';
  }

  async selectVerifyMethod(session: InstagramSession, choice: string): Promise<boolean> {
    try {
      const result = await session.client.challenge.selectVerifyMethod(choice);
      logger.info({ accountId: session.accountId, choice }, 'Verify method selected');
      return !!result;
    } catch (err) {
      logger.error({ accountId: session.accountId, error: err }, 'Failed to select verify method');
      throw err;
    }
  }

  async sendSecurityCode(session: InstagramSession, code: string): Promise<boolean> {
    try {
      const result = await session.client.challenge.sendSecurityCode(code);
      
      if (result?.status === 'ok') {
        this.pendingChallenges.delete(session.accountId);
        logger.info({ accountId: session.accountId }, 'Security code verified');
        return true;
      }

      throw new InstagramChallengeError('Invalid security code', 'verify');
    } catch (err) {
      if (err instanceof InstagramChallengeError) {
        throw err;
      }
      logger.error({ accountId: session.accountId, error: err }, 'Failed to verify security code');
      throw new InstagramChallengeError('Invalid security code', 'verify', undefined, err);
    }
  }

  async sendPhoneNumber(session: InstagramSession, phoneNumber: string): Promise<boolean> {
    try {
      const result = await session.client.challenge.sendPhoneNumber(phoneNumber);
      logger.info({ accountId: session.accountId }, 'Phone number sent for verification');
      return !!result;
    } catch (err) {
      logger.error({ accountId: session.accountId, error: err }, 'Failed to send phone number');
      throw err;
    }
  }

  async replay(session: InstagramSession, choice: string): Promise<boolean> {
    try {
      const result = await session.client.challenge.replay(choice);
      return !!result;
    } catch (err) {
      logger.error({ accountId: session.accountId, error: err }, 'Failed to replay challenge');
      throw err;
    }
  }

  async deltaLoginReview(session: InstagramSession, choice: '1' | '0'): Promise<boolean> {
    try {
      const result = await session.client.challenge.deltaLoginReview(choice);
      return !!result;
    } catch (err) {
      logger.error({ accountId: session.accountId, error: err }, 'Failed delta login review');
      throw err;
    }
  }

  async auto(session: InstagramSession, reset?: boolean): Promise<boolean> {
    try {
      const result = await session.client.challenge.auto(reset);
      return !!result;
    } catch (err) {
      logger.error({ accountId: session.accountId, error: err }, 'Failed auto challenge');
      throw err;
    }
  }

  async reset(session: InstagramSession): Promise<boolean> {
    try {
      const result = await session.client.challenge.reset();
      logger.info({ accountId: session.accountId }, 'Challenge reset');
      return !!result;
    } catch (err) {
      logger.error({ accountId: session.accountId, error: err }, 'Failed to reset challenge');
      throw err;
    }
  }

  async verifyCode(session: InstagramSession, code: string, challengeType: 'sms' | 'email'): Promise<boolean> {
    return this.sendSecurityCode(session, code);
  }

  getPendingChallenge(accountId: string): ChallengeInfo | undefined {
    return this.pendingChallenges.get(accountId);
  }

  clearPendingChallenge(accountId: string): void {
    this.pendingChallenges.delete(accountId);
  }
}
