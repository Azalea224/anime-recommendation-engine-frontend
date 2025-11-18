/**
 * User type definitions
 * These types represent the user data structure that will be stored in MongoDB
 */

export interface User {
  _id?: string;
  email: string;
  username: string;
  passwordHash?: string; // Only for password-based auth, not OAuth
  oauthProviders?: OAuthProvider[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OAuthProvider {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  connectedAt: Date;
}

export interface UserSession {
  userId: string;
  email: string;
  username: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
  error?: string;
}

