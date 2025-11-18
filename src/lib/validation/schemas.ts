/**
 * Validation Schemas
 * 
 * Zod schemas for validating all user inputs
 * Prevents injection attacks and ensures data integrity
 * 
 * Security Notes:
 * - Always validate user inputs on both client and server
 * - Sanitize inputs before processing
 * - Use strict type checking
 * - Reject inputs that don't match schemas
 */

import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email address').min(1).max(255);

/**
 * Password validation schema
 * Requirements: at least 8 characters, 1 uppercase, 1 lowercase, 1 number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Username validation schema
 * Requirements: 3-30 characters, alphanumeric and underscores only
 */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

/**
 * Login request schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Signup request schema
 */
export const signupSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;

/**
 * AniList API key validation schema
 * AniList API keys are typically long alphanumeric strings
 */
export const anilistApiKeySchema = z
  .string()
  .min(20, 'API key must be at least 20 characters')
  .max(500, 'API key is too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid API key format');

/**
 * API key request schema
 */
export const apiKeyRequestSchema = z.object({
  apiKey: anilistApiKeySchema,
  storePermanently: z.boolean(),
});

export type ApiKeyRequestInput = z.infer<typeof apiKeyRequestSchema>;

/**
 * Chat message validation schema
 * Prevents extremely long messages and injection attacks
 */
export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message must be less than 2000 characters')
    .trim(),
  conversationId: z.string().optional(),
  includeAnimeContext: z.boolean().optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

/**
 * Sync request schema
 * Allows syncing own profile (with API key) or public profiles (with username/userId)
 * Supports both 'username' and 'anilistUsername' field names for backend compatibility
 */
export const syncRequestSchema = z.object({
  force: z.boolean().optional(),
  username: z.string().min(1).max(50).optional(),
  anilistUsername: z.string().min(1).max(50).optional(),
  userId: z.number().int().positive().optional(),
}).transform((data) => {
  // Normalize: if anilistUsername is provided but username is not, use anilistUsername as username
  if (data.anilistUsername && !data.username) {
    return { ...data, username: data.anilistUsername };
  }
  return data;
}).refine(
  (data) => !data.username || !data.userId,
  {
    message: 'Cannot provide both username and userId',
    path: ['userId'],
  }
).refine(
  (data) => data.username || data.userId,
  {
    message: 'Either username or userId must be provided to sync a public profile',
    path: ['username'],
  }
);

export type SyncRequestInput = z.infer<typeof syncRequestSchema>;

/**
 * Sanitize string input to prevent XSS
 * Removes potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize user input
 */
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, input: unknown): T {
  const validated = schema.parse(input);
  
  // If it's an object with string fields, sanitize them
  if (typeof validated === 'object' && validated !== null) {
    const sanitized = { ...validated };
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string') {
        (sanitized as any)[key] = sanitizeString(sanitized[key] as string);
      }
    }
    return sanitized as T;
  }
  
  return validated;
}

