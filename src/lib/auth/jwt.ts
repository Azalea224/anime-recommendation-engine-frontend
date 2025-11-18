/**
 * JWT Token Utilities
 * 
 * Provides JWT token generation, validation, and refresh token handling
 * 
 * Security Notes for Express.js:
 * - Use strong, random secrets (minimum 32 characters)
 * - Store secrets in environment variables, never in code
 * - Implement token rotation for refresh tokens
 * - Set appropriate token expiration times (access: 15min, refresh: 7days)
 * - Use httpOnly, secure, sameSite cookies for token storage
 * - Implement rate limiting on token refresh endpoints
 * - Log token refresh attempts for security monitoring
 * - Invalidate refresh tokens on logout and password change
 */

import jwt from 'jsonwebtoken';
import type { User } from '@/types/user';

export interface TokenPayload {
  userId: string;
  email: string;
  username: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Get JWT secret from environment variable
 * In production, this should be retrieved from a secure key management service
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Get JWT refresh secret from environment variable
 */
function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Generate access token (short-lived, 15 minutes)
 * 
 * @param user - User data to include in token
 * @returns JWT access token
 */
export function generateAccessToken(user: User): string {
  if (!user._id) {
    throw new Error('User ID is required to generate token');
  }

  const payload: TokenPayload = {
    userId: user._id,
    email: user.email,
    username: user.username,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '15m', // Short-lived access token
    issuer: 'anime-recommendation-engine',
    audience: 'anime-recommendation-client',
  });
}

/**
 * Generate refresh token (long-lived, 7 days)
 * 
 * @param user - User data to include in token
 * @returns JWT refresh token
 */
export function generateRefreshToken(user: User): string {
  if (!user._id) {
    throw new Error('User ID is required to generate token');
  }

  const payload: TokenPayload = {
    userId: user._id,
    email: user.email,
    username: user.username,
  };

  return jwt.sign(payload, getJwtRefreshSecret(), {
    expiresIn: '7d', // Long-lived refresh token
    issuer: 'anime-recommendation-engine',
    audience: 'anime-recommendation-client',
  });
}

/**
 * Generate both access and refresh tokens
 * 
 * @param user - User data
 * @returns Object containing both tokens
 */
export function generateTokenPair(user: User): TokenPair {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

/**
 * Verify and decode access token
 * 
 * @param token - JWT access token
 * @returns Decoded token payload or null if invalid
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'anime-recommendation-engine',
      audience: 'anime-recommendation-client',
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Verify and decode refresh token
 * 
 * @param token - JWT refresh token
 * @returns Decoded token payload or null if invalid
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtRefreshSecret(), {
      issuer: 'anime-recommendation-engine',
      audience: 'anime-recommendation-client',
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Extract token from Authorization header
 * 
 * @param authHeader - Authorization header value (format: "Bearer <token>")
 * @returns Token string or null
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Get token from request cookies
 * This is a placeholder - actual implementation will be in Express.js middleware
 * 
 * @param cookies - Request cookies object
 * @returns Token string or null
 */
export function getTokenFromCookies(cookies: Record<string, string>): string | null {
  // Placeholder - Express.js will handle cookie parsing
  return cookies.accessToken || null;
}

