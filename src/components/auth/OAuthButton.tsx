'use client';

import React from 'react';
import { buildOAuthUrl, generateOAuthState } from '@/lib/auth/oauth';

interface OAuthButtonProps {
  provider: 'google' | 'github';
}

export function OAuthButton({ provider }: OAuthButtonProps) {
  const handleClick = () => {
    // Generate state token for CSRF protection
    const state = generateOAuthState();
    
    // Store state in sessionStorage for validation on callback
    sessionStorage.setItem('oauth_state', state);
    
    // Build and redirect to OAuth URL
    const url = buildOAuthUrl(provider, state);
    window.location.href = url;
  };

  const providerName = provider === 'google' ? 'Google' : 'GitHub';
  const icon = provider === 'google' ? '🔵' : '⚫';

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full py-2 px-4 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
    >
      <span>{icon}</span>
      <span>Continue with {providerName}</span>
    </button>
  );
}

