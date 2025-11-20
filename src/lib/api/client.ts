/**
 * API Client
 * 
 * Centralized API client with automatic authentication header injection
 * Handles errors, token refresh, and request/response transformation
 * 
 * Security Notes for Express.js:
 * - Implement CORS properly (allow only trusted origins)
 * - Use HTTPS in production
 * - Validate and sanitize all request data
 * - Implement rate limiting per user/IP
 * - Log API requests for security monitoring
 * - Use secure, httpOnly cookies for tokens
 * - Implement CSRF protection for state-changing operations
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse } from '@/types/api';

// Base URL for API requests
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Token storage - stores access token in memory
 * This is used when backend returns tokens in response body instead of cookies
 */
let accessToken: string | null = null;

/**
 * Set access token (called after login/signup)
 */
export function setAccessToken(token: string | null) {
  accessToken = token;
  // Also store in sessionStorage as backup (cleared on tab close)
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('accessToken', token);
    } else {
      sessionStorage.removeItem('accessToken');
    }
  }
}

/**
 * Get access token
 */
function getAccessToken(): string | null {
  // First check memory
  if (accessToken) {
    return accessToken;
  }
  // Fallback to sessionStorage
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      accessToken = token;
      return token;
    }
  }
  return null;
}

/**
 * Create axios instance with default configuration
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies in requests
});

/**
 * Request interceptor to add authentication token
 * Adds Authorization header if access token is available
 */
axiosInstance.interceptors.request.use(
  (config) => {
    // Get access token from storage
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Cookies are also sent automatically via withCredentials
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle errors and token refresh
 */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Check if response contains new tokens (from login/signup/refresh)
    // Check multiple possible locations in the response
    const data = response.data as any;
    
    // Try to extract access token from various response structures
    const token = 
      data?.data?.tokens?.accessToken ||
      data?.tokens?.accessToken ||
      data?.data?.accessToken ||
      data?.accessToken ||
      (data?.data?.user && data?.data?.tokens?.accessToken) ||
      (data?.user && data?.tokens?.accessToken);
    
    if (token) {
      setAccessToken(token);
    }
    
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if the error indicates no token (not just expired token)
      const errorMessage = (error.response?.data as any)?.error || '';
      const isNoTokenError = 
        errorMessage.includes('No refresh token') || 
        errorMessage.includes('No token') ||
        errorMessage.includes('Token not found') ||
        errorMessage.includes('Not authenticated');
      
      // Only try to refresh if we have a token (not a "no token" error)
      if (!isNoTokenError) {
        originalRequest._retry = true;

        try {
          // Attempt to refresh token
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/api/auth/refresh`,
            {},
            { withCredentials: true }
          );

          if (refreshResponse.data.success) {
            // Update access token if returned in response
            const refreshData = refreshResponse.data as any;
            if (refreshData?.data?.tokens?.accessToken) {
              setAccessToken(refreshData.data.tokens.accessToken);
            } else if (refreshData?.tokens?.accessToken) {
              setAccessToken(refreshData.tokens.accessToken);
            } else if (refreshData?.data?.accessToken) {
              setAccessToken(refreshData.data.accessToken);
            } else if (refreshData?.accessToken) {
              setAccessToken(refreshData.accessToken);
            }
            // Retry original request
            return axiosInstance(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed - token is invalid or expired
          // Don't redirect automatically, let the app handle it
          return Promise.reject(error);
        }
      }
      // If no token error, just reject without retry
    }

    return Promise.reject(error);
  }
);

/**
 * API Client wrapper with typed responses
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await axiosInstance.get<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error: any) {
      return handleError(error);
    }
  },

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await axiosInstance.post<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error: any) {
      // Only log unexpected errors (not 401s for auth endpoints when not logged in)
      const isAuthEndpoint = url.includes('/auth/');
      const isExpected401 = error.response?.status === 401 && 
                           (isAuthEndpoint || error.response?.data?.error?.includes('No refresh token'));
      if (!isExpected401) {
        console.error('API Error:', { url: `${API_BASE_URL}${url}`, error: error.response?.data || error.message });
      }
      return handleError(error);
    }
  },

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await axiosInstance.put<ApiResponse<T>>(url, data, config);
      return response.data;
    } catch (error: any) {
      return handleError(error);
    }
  },

  /**
   * DELETE request
   */
  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await axiosInstance.delete<ApiResponse<T>>(url, config);
      return response.data;
    } catch (error: any) {
      return handleError(error);
    }
  },
};

/**
 * Handle API errors and return standardized error response
 */
function handleError<T>(error: any): ApiResponse<T> {
  if (error.response) {
    // Server responded with error status
    const data = error.response.data;
    const status = error.response.status;
    
    // Provide more helpful error messages based on status code
    let errorMessage = data?.error || data?.message;
    
    if (status === 401) {
      // Don't show generic error for "no token" - this is expected when not logged in
      const isNoTokenError = 
        errorMessage?.includes('No refresh token') || 
        errorMessage?.includes('No token') ||
        errorMessage?.includes('Token not found') ||
        errorMessage?.includes('Not authenticated');
      
      if (isNoTokenError) {
        errorMessage = errorMessage; // Use the specific backend error message
      } else {
        errorMessage = errorMessage || 'Authentication required. Please log in.';
      }
    } else if (status === 403) {
      errorMessage = errorMessage || 'Access forbidden. You may not have permission.';
    } else if (status === 404) {
      errorMessage = errorMessage || 'Route not found. The backend endpoint may not be implemented.';
    } else if (status === 500) {
      errorMessage = errorMessage || 'Server error. Please check backend logs.';
    } else if (!errorMessage) {
      errorMessage = `HTTP ${status}: ${error.response.statusText}`;
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      success: false,
      error: 'No response from server. Please check your connection and ensure the backend is running.',
    };
  } else {
    // Error in request setup
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

