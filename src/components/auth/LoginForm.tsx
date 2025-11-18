'use client';

/**
 * Login Form Component
 * 
 * Handles user login with email and password
 * Includes OAuth login options
 */

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginInput } from '@/lib/validation/schemas';
import { OAuthButton } from './OAuthButton';

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    // Prevent multiple submissions
    if (isLoading) {
      return;
    }
    
    setError(null);
    setIsLoading(true);

    try {
      // Validate input
      const validated = loginSchema.parse(formData);
      
      const result = await login(validated.email, validated.password);
      
      if (result.success) {
        // Only redirect on successful login
        router.push('/chat');
      } else {
        // Show error but don't redirect
        setError(result.error || 'Login failed');
        setIsLoading(false);
      }
    } catch (err: any) {
      if (err.errors) {
        setError(err.errors[0]?.message || 'Validation error');
      } else {
        setError(err.message || 'Login failed');
      }
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-zinc-900 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-black dark:text-white">
        Login
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-black dark:text-white">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1 text-black dark:text-white">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-zinc-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400">
              Or continue with
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <OAuthButton provider="google" />
          <OAuthButton provider="github" />
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-gray-600 dark:text-zinc-400">
        Don't have an account?{' '}
        <a href="/auth/signup" className="text-blue-600 hover:text-blue-700 dark:text-blue-400">
          Sign up
        </a>
      </p>
    </div>
  );
}

