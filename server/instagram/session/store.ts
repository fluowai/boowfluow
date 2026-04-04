import { EncryptedSession } from '../types';
import { supabase } from '../../supabase';
import { encrypt, decrypt } from '../utils/encryption';
import pino from 'pino';

const logger = pino({ name: 'SessionStore' });

const SESSION_TABLE = 'instagram_sessions';

export class SessionStore {
  async saveSession(accountId: string, session: EncryptedSession): Promise<void> {
    try {
      const encryptedCookies = encrypt(session.cookies);
      const encryptedSecret = encrypt(session.secret);

      const { error } = await supabase
        .from(SESSION_TABLE)
        .upsert({
          account_id: accountId,
          cookies: encryptedCookies,
          device_string: session.deviceString,
          uuid: session.uuid,
          phone_id: session.phoneId,
          token_name: session.tokenName,
          rank_token: session.rankToken,
          csrftoken: session.csrftoken,
          secret: encryptedSecret,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'account_id'
        });

      if (error) {
        logger.error({ accountId, error }, 'Failed to save session');
        throw error;
      }

      logger.info({ accountId }, 'Session saved successfully');
    } catch (err) {
      logger.error({ accountId, error: err }, 'Session save error');
      throw err;
    }
  }

  async getSession(accountId: string): Promise<EncryptedSession | null> {
    try {
      const { data, error } = await supabase
        .from(SESSION_TABLE)
        .select('*')
        .eq('account_id', accountId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        cookies: decrypt(data.cookies || ''),
        deviceString: data.device_string || '',
        uuid: data.uuid || '',
        phoneId: data.phone_id || '',
        tokenName: data.token_name || '',
        rankToken: data.rank_token || '',
        csrftoken: data.csrftoken || '',
        secret: decrypt(data.secret || ''),
        pk: data.rank_token || ''
      };
    } catch (err) {
      logger.error({ accountId, error: err }, 'Failed to get session');
      return null;
    }
  }

  async deleteSession(accountId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(SESSION_TABLE)
        .delete()
        .eq('account_id', accountId);

      if (error) {
        logger.error({ accountId, error }, 'Failed to delete session');
        throw error;
      }

      logger.info({ accountId }, 'Session deleted successfully');
    } catch (err) {
      logger.error({ accountId, error: err }, 'Session delete error');
      throw err;
    }
  }

  async getAllSessions(): Promise<Array<{ accountId: string; session: EncryptedSession; lastUsed: Date }>> {
    try {
      const { data, error } = await supabase
        .from(SESSION_TABLE)
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(row => ({
        accountId: row.account_id,
        session: {
          cookies: decrypt(row.cookies || ''),
          deviceString: row.device_string || '',
          uuid: row.uuid || '',
          phoneId: row.phone_id || '',
          tokenName: row.token_name || '',
          rankToken: row.rank_token || '',
          csrftoken: row.csrftoken || '',
          secret: decrypt(row.secret || ''),
          pk: row.rank_token || ''
        },
        lastUsed: new Date(row.updated_at)
      }));
    } catch (err) {
      logger.error({ error: err }, 'Failed to get all sessions');
      throw err;
    }
  }

  async getSessionAge(accountId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from(SESSION_TABLE)
        .select('created_at')
        .eq('account_id', accountId)
        .single();

      if (error || !data) {
        return Infinity;
      }

      const createdAt = new Date(data.created_at);
      return Date.now() - createdAt.getTime();
    } catch {
      return Infinity;
    }
  }
}
