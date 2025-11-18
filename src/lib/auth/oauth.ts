/**
 * OAuth Configuration
 * 
 * Configuration for OAuth providers (Google, GitHub)
 * 
 * Security Notes for Express.js:
 * - Store OAuth client secrets in environment variables, never in code
 * - Use HTTPS for all OAuth redirect URIs
 * - Implement PKCE (Proof Key for Code Exchange) for additional security
 * - Validate state parameter to prevent CSRF attacks
 * - Store OAuth state tokens in secure, httpOnly cookies
 * - Implement rate limiting on OAuth callback endpoints
 * - Log OAuth authentication attempts for security monitoring
 * - Verify email addresses from OAuth providers before account creation
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * Get Google OAuth configuration
 */
export function getGoogleOAuthConfig(): OAuthConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials are not configured');
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/google`,
    scopes: ['openid', 'email', 'profile'],
  };
}

/**
 * Get GitHub OAuth configuration
 */
export function getGitHubOAuthConfig(): OAuthConfig {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth credentials are not configured');
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/oauth/github`,
    scopes: ['user:email'],
  };
}

/**
 * Generate OAuth state token for CSRF protection
 * This should be stored in a secure cookie and validated on callback
 * 
 * @returns Random state token
 */
export function generateOAuthState(): string {
  // Generate a random 32-character string
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build OAuth authorization URL
 * 
 * @param provider - OAuth provider ('google' | 'github')
 * @param state - CSRF protection state token
 * @returns OAuth authorization URL
 */
export function buildOAuthUrl(provider: 'google' | 'github', state: string): string {
  const config = provider === 'google' ? getGoogleOAuthConfig() : getGitHubOAuthConfig();
  const baseUrl = provider === 'google' 
    ? 'https://accounts.google.com/o/oauth2/v2/auth'
    : 'https://github.com/login/oauth/authorize';

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state: state,
    ...(provider === 'google' && { access_type: 'offline', prompt: 'consent' }),
  });

  return `${baseUrl}?${params.toString()}`;
}

