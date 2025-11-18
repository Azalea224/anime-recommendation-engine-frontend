/**
 * Anime type definitions
 * These types represent anime data from AniList API and MongoDB storage
 */

export interface Anime {
  _id?: string;
  userId: string;
  animeId: number; // AniList anime ID
  title: string;
  titleEnglish?: string;
  titleNative?: string;
  description?: string;
  score: number; // User's score (0-100)
  status: AnimeStatus;
  progress?: number; // Episodes watched
  totalEpisodes?: number;
  format?: AnimeFormat;
  genres?: string[];
  tags?: string[];
  coverImage?: string;
  bannerImage?: string;
  syncedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AnimeStatus =
  | 'CURRENT' // Currently watching
  | 'PLANNING' // Plan to watch
  | 'COMPLETED' // Completed
  | 'DROPPED' // Dropped
  | 'PAUSED' // On hold
  | 'REPEATING'; // Rewatching

export type AnimeFormat =
  | 'TV'
  | 'TV_SHORT'
  | 'MOVIE'
  | 'SPECIAL'
  | 'OVA'
  | 'ONA'
  | 'MUSIC'
  | 'MANGA'
  | 'NOVEL'
  | 'ONE_SHOT';

export interface AniListAnime {
  id: number;
  title: {
    romaji?: string;
    english?: string;
    native?: string;
  };
  description?: string;
  format?: string;
  status?: string;
  episodes?: number;
  genres?: string[];
  tags?: Array<{
    name: string;
  }>;
  coverImage?: {
    large?: string;
    medium?: string;
  };
  bannerImage?: string;
}

export interface AnimeListResponse {
  success: boolean;
  anime?: Anime[];
  error?: string;
}

export interface Recommendation {
  animeId: number;
  title: string;
  score: number;
  reason: string;
  similarity?: number;
}

