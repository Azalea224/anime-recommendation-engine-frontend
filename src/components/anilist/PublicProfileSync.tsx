'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import type { SyncResponse } from '@/types/api';

export function PublicProfileSync() {
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [useUsername, setUseUsername] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const requestBody: {
        force?: boolean;
        username?: string;
        anilistUsername?: string;
        userId?: number;
      } = {
        force: true,
      };

      if (useUsername) {
        if (!username.trim()) {
          setError('Please enter an AniList username');
          setIsLoading(false);
          return;
        }
        const trimmedUsername = username.trim();
        // Send both username and anilistUsername to support different backend expectations
        requestBody.username = trimmedUsername;
        requestBody.anilistUsername = trimmedUsername;
      } else {
        if (!userId.trim()) {
          setError('Please enter an AniList user ID');
          setIsLoading(false);
          return;
        }
        const parsedUserId = parseInt(userId.trim(), 10);
        if (isNaN(parsedUserId) || parsedUserId <= 0) {
          setError('Please enter a valid AniList user ID (positive number)');
          setIsLoading(false);
          return;
        }
        requestBody.userId = parsedUserId;
      }

      // Debug: Log the request body
      console.log('Syncing profile with:', requestBody);

      const response = await apiClient.post<SyncResponse>('/api/anilist/sync', requestBody);

      if (response.success && response.data) {
        // Handle different response structures from different backends
        const syncedCount = (response.data as any).syncedCount ?? response.data.synced ?? 0;
        const sourceUsername = response.data.sourceUsername;
        const sourceUserId = response.data.sourceUserId;
        
        // Use the message from the API if available, otherwise construct our own
        let successMessage: string;
        if (response.message) {
          successMessage = response.message;
        } else {
          const source = sourceUsername 
            ? sourceUsername 
            : sourceUserId 
              ? `User ID: ${sourceUserId}` 
              : useUsername 
                ? username.trim() 
                : `User ID: ${userId.trim()}`;
          successMessage = `Successfully synced ${syncedCount} anime entries from ${source}!`;
        }
        
        setSuccess(successMessage);
        setUsername('');
        setUserId('');
      } else {
        setError(response.error || response.message || 'Failed to sync anime list');
      }
    } catch (err: any) {
      if (err.errors) {
        setError(err.errors[0]?.message || 'Validation error');
      } else {
        setError(err.message || 'Failed to sync anime list');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-black dark:text-white">
        Sync Public AniList Profile
      </h3>

      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 rounded text-sm">
        <p className="font-medium mb-1">ℹ️ Sync any public AniList profile</p>
        <p className="text-xs">
          Enter an AniList username or user ID to fetch and save their public anime list to your account.
          No API key required for public profiles!
        </p>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4 mb-4">
          <label className="flex items-center">
            <input
              type="radio"
              checked={useUsername}
              onChange={() => {
                setUseUsername(true);
                setUserId('');
                setError(null);
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-zinc-300">Username</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={!useUsername}
              onChange={() => {
                setUseUsername(false);
                setUsername('');
                setError(null);
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-zinc-300">User ID</span>
          </label>
        </div>

        <div>
          <label
            htmlFor={useUsername ? 'username' : 'userId'}
            className="block text-sm font-medium mb-1 text-black dark:text-white"
          >
            {useUsername ? 'AniList Username' : 'AniList User ID'}
          </label>
          {useUsername ? (
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter AniList username (e.g., 'username')"
            />
          ) : (
            <input
              type="number"
              id="userId"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setError(null);
              }}
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter AniList user ID (e.g., 12345)"
            />
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
            {useUsername
              ? 'Enter the AniList username (the part after anilist.co/user/)'
              : 'Enter the numeric AniList user ID'}
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || (useUsername ? !username.trim() : !userId.trim())}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Syncing...' : 'Sync Profile'}
        </button>
      </form>
    </div>
  );
}

