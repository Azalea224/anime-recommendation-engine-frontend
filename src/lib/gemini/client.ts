/**
 * Google Gemini API Client
 * 
 * Client for interacting with Google's Generative AI (Gemini) API
 * Provides chatbot functionality with context from user's anime list
 * 
 * Security Notes:
 * - Store Gemini API key in environment variables, never in client-side code
 * - All Gemini API calls should be made from server-side (API routes)
 * - Implement rate limiting to respect Gemini API limits
 * - Sanitize user inputs before sending to Gemini API
 * - Monitor API usage and costs
 * - Implement content filtering for inappropriate responses
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Anime } from '@/types/anime';
import type { ChatMessage } from '@/types/api';

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('GOOGLE_GEMINI_API_KEY is not set. Chatbot functionality will be limited.');
}

/**
 * Create Gemini AI client instance
 */
function createGeminiClient(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) {
    throw new Error('GOOGLE_GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(GEMINI_API_KEY);
}

/**
 * Build system prompt with user's anime list context
 * 
 * @param animeList - User's anime list with scores
 * @returns System prompt string
 */
function buildSystemPrompt(animeList: Anime[]): string {
  const topAnime = animeList
    .filter(anime => anime.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20); // Top 20 highest scored anime

  const animeListText = topAnime
    .map(anime => `- ${anime.title} (Score: ${anime.score}/100, Status: ${anime.status})`)
    .join('\n');

  return `You are an anime recommendation assistant. You help users discover new anime based on their preferences and viewing history.

User's Anime List (Top Rated):
${animeListText || 'No anime in list yet.'}

Guidelines:
- Provide personalized anime recommendations based on the user's preferences
- Consider genres, themes, and scores from their list
- Explain why you're recommending each anime
- Be friendly, helpful, and enthusiastic about anime
- If the user asks about anime not in their list, provide information and recommendations
- Keep responses concise but informative
- Format recommendations clearly with anime titles and brief descriptions

Remember: The user's anime list and scores reflect their preferences. Use this to make better recommendations.`;
}

/**
 * Generate chat response using Gemini API
 * 
 * @param message - User's message
 * @param conversationHistory - Previous messages in the conversation
 * @param animeList - User's anime list for context
 * @returns Chat response from Gemini
 */
export async function generateChatResponse(
  message: string,
  conversationHistory: ChatMessage[] = [],
  animeList: Anime[] = []
): Promise<string> {
  const client = createGeminiClient();
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    // Build system prompt with anime context
    const systemPrompt = buildSystemPrompt(animeList);

    // Build conversation history
    const history = conversationHistory
      .slice(-10) // Keep last 10 messages for context
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

    // Start chat with history
    const chat = model.startChat({
      history: history as any,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    // Send message with system context
    const fullMessage = `${systemPrompt}\n\nUser: ${message}`;
    const result = await chat.sendMessage(fullMessage);
    const response = await result.response;
    
    return response.text();
  } catch (error: any) {
    console.error('Error generating chat response:', error);
    
    // Handle specific error cases
    if (error.message?.includes('API key')) {
      throw new Error('Invalid Google Gemini API key');
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      throw new Error('Gemini API rate limit exceeded. Please try again later.');
    } else if (error.message) {
      throw new Error(`Failed to generate response: ${error.message}`);
    } else {
      throw new Error('Failed to generate chat response');
    }
  }
}

/**
 * Generate streaming chat response using Gemini API
 * 
 * @param message - User's message
 * @param conversationHistory - Previous messages in the conversation
 * @param animeList - User's anime list for context
 * @param onChunk - Callback function called with each text chunk
 * @returns Full response text
 */
export async function generateStreamingChatResponse(
  message: string,
  conversationHistory: ChatMessage[] = [],
  animeList: Anime[] = [],
  onChunk?: (chunk: string) => void
): Promise<string> {
  const client = createGeminiClient();
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    // Build system prompt with anime context
    const systemPrompt = buildSystemPrompt(animeList);

    // Build conversation history
    const history = conversationHistory
      .slice(-10) // Keep last 10 messages for context
      .map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

    // Start chat with history
    const chat = model.startChat({
      history: history as any,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    // Send message with system context
    const fullMessage = `${systemPrompt}\n\nUser: ${message}`;
    const result = await chat.sendMessageStream(fullMessage);
    
    let fullResponse = '';
    
    // Stream the response
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
      if (onChunk) {
        onChunk(chunkText);
      }
    }
    
    return fullResponse;
  } catch (error: any) {
    console.error('Error generating streaming chat response:', error);
    
    // Handle specific error cases
    if (error.message?.includes('API key')) {
      throw new Error('Invalid Google Gemini API key');
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      throw new Error('Gemini API rate limit exceeded. Please try again later.');
    } else if (error.message) {
      throw new Error(`Failed to generate response: ${error.message}`);
    } else {
      throw new Error('Failed to generate chat response');
    }
  }
}

