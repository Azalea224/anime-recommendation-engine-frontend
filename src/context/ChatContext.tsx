'use client';

/**
 * Chat Context
 * 
 * Manages chat state, message history, and chat functionality
 * Handles message storage, loading states, and chat interactions
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ChatMessage, ChatRequest, ChatResponse, ChatHistoryResponse } from '@/types/api';
import { apiClient } from '@/lib/api/client';

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  conversationId: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  /**
   * Load chat history from backend on mount
   */
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await apiClient.get<ChatHistoryResponse>('/api/chat/history?limit=50');
        
        if (response.success && response.data?.messages) {
          const loadedMessages = response.data.messages.map((msg: any) => {
            // Parse timestamp - MongoDB uses createdAt, but we also support timestamp for compatibility
            const dateValue = msg.createdAt || msg.timestamp;
            let timestamp: Date;
            
            if (dateValue instanceof Date) {
              timestamp = dateValue;
            } else if (typeof dateValue === 'string') {
              timestamp = new Date(dateValue);
            } else if (typeof dateValue === 'number') {
              // Handle Unix timestamp (check if in seconds or milliseconds)
              timestamp = new Date(dateValue > 1000000000000 ? dateValue : dateValue * 1000);
            } else {
              // Fallback to current time if timestamp is missing or invalid
              console.warn('Invalid timestamp format in message:', msg);
              timestamp = new Date();
            }
            
            // Validate the parsed date
            if (isNaN(timestamp.getTime())) {
              console.warn('Invalid timestamp value, using current time:', dateValue);
              timestamp = new Date();
            }
            
            return {
              ...msg,
              timestamp, // Always use timestamp for the ChatMessage interface
            };
          });
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error('Error loading chat history from backend:', error);
        // Fallback: try loading from localStorage if backend fails
        try {
          const savedMessages = localStorage.getItem('chatMessages');
          if (savedMessages) {
            const parsed = JSON.parse(savedMessages);
            setMessages(parsed.map((msg: any) => {
              // Parse timestamp from localStorage
              let timestamp: Date;
              if (msg.timestamp instanceof Date) {
                timestamp = msg.timestamp;
              } else if (typeof msg.timestamp === 'string') {
                timestamp = new Date(msg.timestamp);
              } else if (typeof msg.timestamp === 'number') {
                timestamp = new Date(msg.timestamp > 1000000000000 ? msg.timestamp : msg.timestamp * 1000);
              } else {
                timestamp = new Date();
              }
              
              if (isNaN(timestamp.getTime())) {
                timestamp = new Date();
              }
              
              return {
                ...msg,
                timestamp,
              };
            }));
          }
        } catch (localError) {
          console.error('Error loading chat history from localStorage:', localError);
        }
      }
    };

    loadChatHistory();
  }, []);

  /**
   * Send a message to the chatbot
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Backend now handles conversation history automatically, so we only need to send the message
      const request: ChatRequest = {
        message: content.trim(),
        includeAnimeContext: true,
        // conversationId is no longer needed - backend loads history from database
      };

      console.log('Sending chat message:', request); // Debug log
      const response = await apiClient.post<ChatResponse>('/api/chat', request);
      console.log('Chat response:', response); // Debug log

      if (response.success && response.data) {
        // Handle different response structures
        let botMessage: ChatMessage | null = null;
        
        // Check for response.data.message (expected structure)
        if (response.data.message) {
          botMessage = response.data.message;
        } 
        // Check for response.data.response (alternative structure - raw string)
        else if (typeof response.data === 'object' && 'response' in response.data && typeof (response.data as any).response === 'string') {
          // Convert string response to ChatMessage format
          botMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: (response.data as any).response,
            timestamp: new Date(),
          };
        }
        // Check if response.data itself is a ChatResponse with message
        else if ((response.data as any).message) {
          botMessage = (response.data as any).message;
        }

        if (botMessage) {
          // Ensure timestamp is set - MongoDB uses createdAt, so check for that
          if (!botMessage.timestamp || isNaN(new Date(botMessage.timestamp).getTime())) {
            const dateValue = (botMessage as any).createdAt || botMessage.timestamp;
            if (dateValue) {
              botMessage.timestamp = dateValue instanceof Date 
                ? dateValue 
                : new Date(dateValue);
            }
            // If still no valid timestamp, use current time
            if (!botMessage.timestamp || isNaN(botMessage.timestamp.getTime())) {
              botMessage.timestamp = new Date();
            }
          }
          
          setMessages((prev) => [...prev, botMessage!]);
          
          // Update conversation ID if provided
          if (botMessage.metadata?.conversationId) {
            setConversationId(botMessage.metadata.conversationId as any);
          }
        } else {
          // More detailed error message
          const errorMsg = response.error || (response.data as any)?.error || 'Failed to get response: unexpected response structure';
          console.error('Chat response error:', { response, errorMsg });
          throw new Error(errorMsg);
        }
      } else {
        // More detailed error message
        const errorMsg = response.error || response.data?.error || 'Failed to get response';
        console.error('Chat response error:', { response, errorMsg });
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage = error.message || error.error || 'Failed to send message';
      setError(errorMessage);
      
      // Add error message to chat with more helpful details
      let helpfulMessage = errorMessage;
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('access token')) {
        helpfulMessage = 'Please log in to use the chat feature.';
      } else if (errorMessage.includes('Gemini') || errorMessage.includes('API key')) {
        helpfulMessage = 'Backend error: Google Gemini API key may not be configured. Please check your backend environment variables.';
      }
      
      const errorChatMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        content: `Error: ${helpfulMessage}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear all messages from both frontend state and backend database
   */
  const clearMessages = useCallback(async () => {
    try {
      // Clear messages from backend database
      const response = await apiClient.delete<{ success: boolean; error?: string }>('/api/chat/history');
      
      if (response.success) {
        // Clear frontend state
        setMessages([]);
        setConversationId(null);
        // Also clear localStorage as fallback
        localStorage.removeItem('chatMessages');
        localStorage.removeItem('conversationId');
      } else {
        console.error('Failed to clear chat history:', response.error);
        // Still clear frontend state even if backend call fails
        setMessages([]);
        setConversationId(null);
        localStorage.removeItem('chatMessages');
        localStorage.removeItem('conversationId');
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
      // Clear frontend state even if API call fails
      setMessages([]);
      setConversationId(null);
      localStorage.removeItem('chatMessages');
      localStorage.removeItem('conversationId');
    }
  }, []);

  const value: ChatContextType = {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    conversationId,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Hook to use chat context
 */
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

