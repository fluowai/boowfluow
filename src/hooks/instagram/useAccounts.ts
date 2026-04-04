import { useState, useEffect, useCallback } from 'react';
import { instagramApi } from '../../services/instagram/api';
import { InstagramAccount } from '../../types/instagram';

export function useInstagramAccounts() {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await instagramApi.accounts.list();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const addAccount = async (username: string, password: string, proxy?: string) => {
    try {
      await instagramApi.accounts.create({ username, password, proxy });
      await fetchAccounts();
    } catch (err) {
      throw err;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      await instagramApi.accounts.delete(id);
      await fetchAccounts();
    } catch (err) {
      throw err;
    }
  };

  const login = async (id: string) => {
    try {
      const result = await instagramApi.accounts.login(id);
      if (result.challenge) {
        return { challenge: true, type: result.type };
      }
      await fetchAccounts();
      return { challenge: false };
    } catch (err) {
      throw err;
    }
  };

  const logout = async (id: string) => {
    try {
      await instagramApi.accounts.logout(id);
      await fetchAccounts();
    } catch (err) {
      throw err;
    }
  };

  const verifyChallenge = async (id: string, code: string) => {
    try {
      await instagramApi.accounts.verifyChallenge(id, code);
      await fetchAccounts();
    } catch (err) {
      throw err;
    }
  };

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    addAccount,
    deleteAccount,
    login,
    logout,
    verifyChallenge
  };
}
