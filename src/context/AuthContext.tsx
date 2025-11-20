'use client';

/**
 * Authentication Context
 * 
 * Provides authentication state and methods throughout the application
 * Handles login, logout, token management, and user session
 * 
 * Security Notes:
 * - Tokens are stored in httpOnly cookies (handled by API routes)
 * - Never store tokens in localStorage or sessionStorage
 * - Implement token refresh mechanism
 * - Clear all auth state on logout
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { User, AuthResponse } from '@/types/user';
import { apiClient, setAccessToken } from '@/lib/api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (email: string, username: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isCheckingAuth = useRef(false); // Prevent multiple simultaneous auth checks
  const isLoggingIn = useRef(false); // Prevent multiple simultaneous login attempts
  const isSigningUp = useRef(false); // Prevent multiple simultaneous signup attempts

  /**
   * Check authentication status on mount
   * Only run once when component mounts
   */
  useEffect(() => {
    let mounted = true;
    
    // Initialize access token from sessionStorage if available
    if (typeof window !== 'undefined') {
      const storedToken = sessionStorage.getItem('accessToken');
      if (storedToken) {
        setAccessToken(storedToken);
      }
    }
    
    const performCheck = async () => {
      if (mounted) {
        await checkAuth();
      }
    };
    
    performCheck();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run on mount

  /**
   * Check if user is authenticated
   * Validates token and fetches user data
   */
  const checkAuth = useCallback(async () => {
    // Prevent multiple simultaneous auth checks
    if (isCheckingAuth.current) {
      return;
    }
    
    try {
      isCheckingAuth.current = true;
      setIsLoading(true);
      const response = await apiClient.get<{ user: User }>('/api/auth/me');
      
      // Only set user if we have a successful response with user data
      if (response.success === true && response.data?.user) {
        setUser(response.data.user);
      } else {
        // Explicitly set to null if not authenticated
        // Don't log errors for expected "no token" responses when not logged in
        const isExpectedError = response.error?.includes('No refresh token') || 
                                response.error?.includes('No token') ||
                                response.error?.includes('Token not found');
        if (!isExpectedError && response.error) {
          console.log('Auth check response:', response); // Only log unexpected errors
        }
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      isCheckingAuth.current = false;
    }
  }, []);

  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    // Don't allow login if already in progress
    if (isLoggingIn.current) {
      return {
        success: false,
        error: 'Login already in progress',
      };
    }
    
    try {
      isLoggingIn.current = true;
      setIsLoading(true);
      const response = await apiClient.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      });

      // Handle different response formats from backend
      if (response.success) {
        let userData: User | undefined;
        let authResponse: AuthResponse | undefined;

        if (response.data) {
          const data = response.data as any;
          
          // Case 1: response.data has user property (most common)
          if (data.user && typeof data.user === 'object') {
            // Backend may return 'id' instead of '_id', normalize it
            const user = data.user;
            userData = {
              _id: user._id || user.id, // Handle both _id and id
              email: user.email,
              username: user.username,
              oauthProviders: user.oauthProviders,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            } as User;
            
            authResponse = {
              success: true,
              user: userData,
              tokens: data.tokens,
            };
            
            // Store access token if provided
            if (data.tokens?.accessToken) {
              setAccessToken(data.tokens.accessToken);
            }
          }
          // Case 2: response.data is the user object directly
          else if (data.email && data.username) {
            // Backend may return 'id' instead of '_id', normalize it
            userData = {
              _id: data._id || data.id,
              email: data.email,
              username: data.username,
              oauthProviders: data.oauthProviders,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            } as User;
            
            authResponse = {
              success: true,
              user: userData,
              tokens: data.tokens,
            };
            
            // Store access token if provided
            if (data.tokens?.accessToken) {
              setAccessToken(data.tokens.accessToken);
            }
          }
          // Case 3: Check if user is nested deeper (data.data.user)
          else if (data.data && data.data.user) {
            const user = data.data.user;
            userData = {
              _id: user._id || user.id,
              email: user.email,
              username: user.username,
              oauthProviders: user.oauthProviders,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            } as User;
            
            const tokens = data.data.tokens || data.tokens;
            authResponse = {
              success: true,
              user: userData,
              tokens: tokens,
            };
            
            // Store access token if provided
            if (tokens?.accessToken) {
              setAccessToken(tokens.accessToken);
            }
          }
        }

        if (userData) {
          setUser(userData);
          // Wait a moment for cookies to be set by the backend, then verify auth
          // This ensures the backend cookies are properly set and recognized
          await new Promise(resolve => setTimeout(resolve, 200));
          await checkAuth();
          return authResponse || { success: true, user: userData };
        } else {
          // Log the actual data structure for debugging
          console.error('Could not find user in response.data:', response.data);
          throw new Error('Login successful but no user data received. Check console for response structure.');
        }
      } else {
        // response.success is false, check response.error
        throw new Error(response.error || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      // On error, ensure user is null and don't trigger auth check
      setUser(null);
      return {
        success: false,
        error: error.message || error.error || 'Login failed',
      };
    } finally {
      setIsLoading(false);
      isLoggingIn.current = false;
    }
  }, []);

  /**
   * Sign up new user
   */
  const signup = useCallback(
    async (email: string, username: string, password: string): Promise<AuthResponse> => {
      // Don't allow signup if already in progress
      if (isSigningUp.current) {
        return {
          success: false,
          error: 'Signup already in progress',
        };
      }
      
      try {
        isSigningUp.current = true;
        setIsLoading(true);
        const response = await apiClient.post<AuthResponse>('/api/auth/signup', {
          email,
          username,
          password,
        });

        if (response.success && response.data) {
          // Handle different response structures from backend
          let userData: User | undefined;
          let authResponse: AuthResponse | undefined;

          const data = response.data as any;
          
          // Case 1: response.data has user property (most common)
          if (data.user && typeof data.user === 'object') {
            // Backend may return 'id' instead of '_id', normalize it
            const user = data.user;
            userData = {
              _id: user._id || user.id, // Handle both _id and id
              email: user.email,
              username: user.username,
              oauthProviders: user.oauthProviders,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            } as User;
            
            authResponse = {
              success: true,
              user: userData,
              tokens: data.tokens,
            };
            
            // Store access token if provided
            if (data.tokens?.accessToken) {
              setAccessToken(data.tokens.accessToken);
            }
          }
          // Case 2: response.data is the user object directly
          else if (data.email && data.username) {
            userData = {
              _id: data._id || data.id,
              email: data.email,
              username: data.username,
              oauthProviders: data.oauthProviders,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            } as User;
            
            authResponse = {
              success: true,
              user: userData,
              tokens: data.tokens,
            };
            
            // Store access token if provided
            if (data.tokens?.accessToken) {
              setAccessToken(data.tokens.accessToken);
            }
          }

          if (userData) {
            setUser(userData);
            // Wait a moment for cookies to be set by the backend, then verify auth
            // This ensures the backend cookies are properly set and recognized
            await new Promise(resolve => setTimeout(resolve, 200));
            await checkAuth();
            return authResponse || { success: true, user: userData };
          } else {
            // If success but no user, check for error in data
            throw new Error(data.error || 'Signup failed - no user data received');
          }
        } else {
          // response.success is false, check response.error
          throw new Error(response.error || 'Signup failed');
        }
      } catch (error: any) {
        console.error('Signup error:', error);
        setUser(null);
        return {
          success: false,
          error: error.message || error.error || 'Signup failed',
        };
      } finally {
        setIsLoading(false);
        isSigningUp.current = false;
      }
    },
    []
  );

  /**
   * Logout user
   * Clears tokens and user state
   */
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      // Clear access token on logout
      setAccessToken(null);
    }
  }, []);

  /**
   * Refresh access token using refresh token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiClient.post<{ success: boolean }>('/api/auth/refresh');
      return response.success || false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      setUser(null);
      return false;
    }
  }, []);

  // isAuthenticated should only be true if we have a user AND we're not still loading
  const isAuthenticated = !isLoading && !!user;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshToken,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

