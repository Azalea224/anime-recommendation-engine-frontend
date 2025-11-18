'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ApiKeyManager } from '@/components/api-key/ApiKeyManager';
import { PublicProfileSync } from '@/components/anilist/PublicProfileSync';

export default function ChatPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    // Wait for auth check to complete
    if (isLoading) {
      return; // Still checking auth, don't redirect yet
    }
    
    // If not authenticated after check completes, redirect to login
    if (!isAuthenticated) {
      console.log('Not authenticated, redirecting to login');
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white mb-2">
              Anime Recommendation Chatbot
            </h1>
            <p className="text-gray-600 dark:text-zinc-400">
              Connect your AniList account and get personalized anime recommendations
            </p>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-gray-600 dark:text-zinc-400">
                {user.username || user.email}
              </span>
            )}
            <button
              onClick={async () => {
                await logout();
                router.push('/auth/login');
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="h-[calc(100vh-12rem)]">
              <ChatInterface />
            </div>
          </div>

          <div className="space-y-6">
            <PublicProfileSync />
            <ApiKeyManager />
          </div>
        </div>
      </div>
    </div>
  );
}

