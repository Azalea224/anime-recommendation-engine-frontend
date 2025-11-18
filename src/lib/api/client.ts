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
 * Tokens are stored in httpOnly cookies, so they're automatically included
 * This interceptor can be used to add additional headers if needed
 */
axiosInstance.interceptors.request.use(
  (config) => {
    // Tokens are in httpOnly cookies, so they're automatically sent
    // If you need to add Authorization header manually, do it here:
    // const token = getTokenFromCookies();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
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
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        // This will be implemented in Express.js backend
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        if (refreshResponse.data.success) {
          // Retry original request
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
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
      const fullUrl = `${API_BASE_URL}${url}`;
      console.log('API Request:', { method: 'POST', url: fullUrl, data });
      const response = await axiosInstance.post<ApiResponse<T>>(url, data, config);
      console.log('API Response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('API Error:', { url: `${API_BASE_URL}${url}`, error: error.response?.data || error.message });
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
      errorMessage = errorMessage || 'Authentication required. Please log in.';
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

