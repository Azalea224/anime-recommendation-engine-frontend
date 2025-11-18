/**
 * AniList GraphQL Client
 * 
 * Client for fetching user anime lists from AniList API
 * Uses GraphQL to query user's anime list with scores and metadata
 * 
 * API Key Usage:
 * - API keys are OPTIONAL for public profiles
 * - Public profiles can be accessed without authentication
 * - API keys are only required for:
 *   - Accessing private profiles
 *   - Accessing the current authenticated user's data (Viewer query)
 * 
 * Security Notes:
 * - Never expose API keys in client-side code
 * - All AniList API calls should be made from server-side (API routes)
 * - Validate and sanitize all user inputs before making API calls
 * - Implement rate limiting to respect AniList API limits
 * - Handle API errors gracefully and provide user-friendly messages
 */

import { GraphQLClient } from 'graphql-request';
import type { Anime, AniListAnime, AnimeStatus } from '@/types/anime';

const ANILIST_API_URL = process.env.NEXT_PUBLIC_ANILIST_API_URL || 'https://graphql.anilist.co';

/**
 * GraphQL query to fetch user's anime list
 * Fetches anime with scores, status, and metadata
 * Can be used with or without authentication (for public profiles)
 */
const GET_USER_ANIME_LIST = `
  query GetUserAnimeList($userId: Int!) {
    MediaListCollection(userId: $userId, type: ANIME) {
      lists {
        entries {
          id
          mediaId
          status
          score
          progress
          media {
            id
            title {
              romaji
              english
              native
            }
            description
            format
            status
            episodes
            genres
            tags {
              name
            }
            coverImage {
              large
              medium
            }
            bannerImage
          }
        }
      }
    }
  }
`;

/**
 * GraphQL query to get user by username (public profile)
 * Does not require authentication
 */
const GET_USER_BY_NAME = `
  query GetUserByName($name: String!) {
    User(name: $name) {
      id
      name
      about
      avatar {
        large
        medium
      }
      bannerImage
      statistics {
        anime {
          count
          meanScore
        }
      }
    }
  }
`;

/**
 * GraphQL query to get current user's ID
 * Requires authentication with AniList API
 */
const GET_CURRENT_USER = `
  query GetCurrentUser {
    Viewer {
      id
      name
      email
    }
  }
`;

/**
 * Create AniList GraphQL client without authentication
 * Used for public profile queries
 * 
 * @returns GraphQL client instance
 */
export function createAniListClientPublic(): GraphQLClient {
  return new GraphQLClient(ANILIST_API_URL, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create AniList GraphQL client with API key
 * Used for authenticated queries (current user's private data)
 * 
 * @param apiKey - AniList API key (access token)
 * @returns GraphQL client instance
 */
export function createAniListClient(apiKey: string): GraphQLClient {
  return new GraphQLClient(ANILIST_API_URL, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Fetch current user's information
 * 
 * @param apiKey - AniList API key
 * @returns User information
 */
export async function getCurrentUser(apiKey: string): Promise<{
  id: number;
  name: string;
  email?: string;
}> {
  const client = createAniListClient(apiKey);
  
  try {
    const data = await client.request<{ Viewer: { id: number; name: string; email?: string } }>(
      GET_CURRENT_USER
    );
    return data.Viewer;
  } catch (error) {
    console.error('Error fetching AniList user:', error);
    throw new Error('Failed to fetch AniList user information');
  }
}

/**
 * Get user ID by username (public profile)
 * Does not require authentication
 * 
 * @param username - AniList username
 * @returns User ID
 */
export async function getUserIdByUsername(username: string): Promise<number> {
  const client = createAniListClientPublic();
  
  try {
    const data = await client.request<{
      User: {
        id: number;
        name: string;
      } | null;
    }>(GET_USER_BY_NAME, { name: username });
    
    if (!data.User) {
      throw new Error(`User "${username}" not found`);
    }
    
    return data.User.id;
  } catch (error: any) {
    console.error('Error fetching user by username:', error);
    if (error.message?.includes('not found')) {
      throw error;
    }
    throw new Error(`Failed to fetch user: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Fetch user's anime list from AniList
 * 
 * @param options - Configuration options
 * @param options.apiKey - AniList API key (required for current user, optional for public profiles)
 * @param options.userId - AniList user ID (optional)
 * @param options.username - AniList username (optional, for public profiles)
 * @returns Array of anime entries
 */
export async function fetchUserAnimeList(options: {
  apiKey?: string;
  userId?: number;
  username?: string;
}): Promise<Anime[]> {
  const { apiKey, userId, username } = options;
  
  // Determine target user ID
  let targetUserId = userId;
  
  // If username provided, get user ID (public query, no API key needed)
  if (username && !targetUserId) {
    targetUserId = await getUserIdByUsername(username);
  }
  
  // If no userId/username and no API key, we can't proceed
  if (!targetUserId && !apiKey) {
    throw new Error('Either userId, username, or apiKey must be provided');
  }
  
  // If userId not provided and we have API key, get current user's ID
  if (!targetUserId && apiKey) {
    const user = await getCurrentUser(apiKey);
    targetUserId = user.id;
  }
  
  // Use authenticated client if API key provided, otherwise use public client
  const client = apiKey 
    ? createAniListClient(apiKey)
    : createAniListClientPublic();

  try {
    const data = await client.request<{
      MediaListCollection: {
        lists: Array<{
          entries: Array<{
            id: number;
            mediaId: number;
            status: string;
            score: number;
            progress: number;
            media: AniListAnime;
          }>;
        }>;
      } | null;
    }>(GET_USER_ANIME_LIST, { userId: targetUserId });

    // Handle case where profile is private or doesn't exist
    if (!data.MediaListCollection) {
      throw new Error('User profile is private or not found');
    }

    // Transform AniList data to our Anime format
    const animeList: Anime[] = [];
    
    if (data.MediaListCollection.lists) {
      for (const list of data.MediaListCollection.lists) {
        for (const entry of list.entries) {
          const media = entry.media;
          animeList.push({
            animeId: media.id,
            userId: '', // Will be set by the API route
            title: media.title.romaji || media.title.english || media.title.native || 'Unknown',
            titleEnglish: media.title.english,
            titleNative: media.title.native,
            description: media.description,
            score: entry.score || 0,
            status: entry.status as AnimeStatus,
            progress: entry.progress,
            totalEpisodes: media.episodes,
            format: media.format as any,
            genres: media.genres,
            tags: media.tags?.map(tag => tag.name),
            coverImage: media.coverImage?.large || media.coverImage?.medium,
            bannerImage: media.bannerImage,
            syncedAt: new Date(),
          });
        }
      }
    }

    return animeList;
  } catch (error: any) {
    console.error('Error fetching AniList anime list:', error);
    
    // Handle specific error cases
    if (error.response?.status === 401) {
      throw new Error('Invalid AniList API key');
    } else if (error.response?.status === 429) {
      throw new Error('AniList API rate limit exceeded. Please try again later.');
    } else if (error.message?.includes('private')) {
      throw new Error('User profile is private. An API key may be required to access this profile.');
    } else if (error.message) {
      throw new Error(`Failed to fetch anime list: ${error.message}`);
    } else {
      throw new Error('Failed to fetch anime list from AniList');
    }
  }
}

/**
 * Validate AniList API key
 * 
 * @param apiKey - AniList API key to validate
 * @returns True if valid, false otherwise
 */
export async function validateAniListApiKey(apiKey: string): Promise<boolean> {
  try {
    await getCurrentUser(apiKey);
    return true;
  } catch (error) {
    return false;
  }
}

