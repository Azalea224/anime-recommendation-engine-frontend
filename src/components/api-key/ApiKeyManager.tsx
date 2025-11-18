'use client';

import React, { useState } from 'react';
import { apiKeyRequestSchema, type ApiKeyRequestInput } from '@/lib/validation/schemas';
import { apiClient } from '@/lib/api/client';
import type { ApiKeyResponse } from '@/types/api';

export function ApiKeyManager() {
  const [apiKey, setApiKey] = useState('');
  const [storePermanently, setStorePermanently] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasStoredKey, setHasStoredKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const validated = apiKeyRequestSchema.parse({
        apiKey,
        storePermanently,
      });

      const response = await apiClient.post<ApiKeyResponse>('/api/anilist/key', validated);

      if (response.success) {
        setSuccess(
          storePermanently
            ? 'API key stored securely!'
            : 'API key set for this session only.'
        );
        setApiKey('');
        setHasStoredKey(storePermanently);
      } else {
        setError(response.error || 'Failed to store API key');
      }
    } catch (err: any) {
      if (err.errors) {
        setError(err.errors[0]?.message || 'Validation error');
      } else {
        setError(err.message || 'Failed to store API key');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const response = await apiClient.delete<ApiKeyResponse>('/api/anilist/key');

      if (response.success) {
        setSuccess('API key removed successfully');
        setHasStoredKey(false);
      } else {
        setError(response.error || 'Failed to remove API key');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove API key');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">
        AniList API Key (Optional)
      </h3>
      
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 rounded text-sm">
        <p className="font-medium mb-1">ℹ️ API keys are optional</p>
        <p className="text-xs">
          Public AniList profiles can be accessed without an API key. 
          You only need an API key if you want to:
        </p>
        <ul className="mt-1 ml-4 list-disc text-xs space-y-1">
          <li>Access your own private profile data</li>
          <li>View private profiles of other users</li>
        </ul>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 border border-green-400 text-green-700 dark:text-green-300 rounded">
          {success}
        </div>
      )}

      {hasStoredKey ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            You have a stored API key. It is encrypted and stored securely.
          </p>
          <button
            onClick={handleRemove}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Removing...' : 'Remove API Key'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium mb-1 text-black dark:text-white">
              AniList API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your AniList API key"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
              You need an <strong>OAuth2 Access Token</strong>, not a client secret.
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
              To get your access token:
            </p>
            <ol className="mt-1 ml-4 text-xs text-gray-500 dark:text-zinc-400 list-decimal space-y-1">
              <li>Go to{' '}
                <a
                  href="https://anilist.co/settings/developer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  AniList Developer Settings
                </a>
              </li>
              <li>Create a new application (if you haven't)</li>
              <li>Use OAuth2 to authorize and get an <strong>access token</strong></li>
              <li>Paste the access token here (it's a long string, not "client_secret_...")</li>
            </ol>
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Make sure you're using an <strong>access token</strong>, not a client ID or client secret.
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="storePermanently"
              checked={storePermanently}
              onChange={(e) => setStorePermanently(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="storePermanently" className="ml-2 block text-sm text-gray-700 dark:text-zinc-300">
              Store permanently (encrypted in database)
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Saving...' : 'Save API Key'}
          </button>
        </form>
      )}
    </div>
  );
}

