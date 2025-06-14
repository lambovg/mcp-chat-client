import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, ChatState } from '../types';
import { chatApi } from '../services/api';
import { useWebSocket } from './useWebSocket';

export const useChat = () => {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    conversationId: null,
    isConnected: false,
  });

  const { sendMessage: wsSendMessage, isConnected } = useWebSocket({
    onMessage: (data: Message) => {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, data],
        isLoading: false,
      }));
    },
    onError: (error: any) => {
      setState(prev => ({
        ...prev,
        error: error.message || 'An error occurred',
        isLoading: false,
      }));
    },
    onStatusChange: (status: { connected: boolean }) => {
      setState(prev => ({
        ...prev,
        isConnected: status.connected,
      }));
    },
    onToolCall: (data: any) => {
      // Handle tool call updates (for showing intermediate steps)
      console.log('Tool call:', data);
    },
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: uuidv4(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      if (isConnected) {
        // Use WebSocket for real-time updates
        wsSendMessage(content, state.conversationId || undefined);
      } else {
        // Fallback to HTTP API
        const response = await chatApi.sendMessage({
          message: content,
          conversationId: state.conversationId || undefined,
        });

        setState(prev => ({
          ...prev,
          messages: [...prev.messages, response.message],
          conversationId: response.conversationId,
          isLoading: false,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send message',
        isLoading: false,
      }));
    }
  }, [state.conversationId, isConnected, wsSendMessage]);

  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      conversationId: null,
      error: null,
    }));
  }, []);

  const loadHistory = useCallback(async (conversationId: string) => {
    try {
      const messages = await chatApi.getHistory(conversationId);
      setState(prev => ({
        ...prev,
        messages,
        conversationId,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load history',
      }));
    }
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    isConnected: state.isConnected,
    sendMessage,
    clearMessages,
    loadHistory,
  };
};