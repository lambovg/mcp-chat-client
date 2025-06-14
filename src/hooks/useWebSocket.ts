import { useEffect, useCallback, useRef } from 'react';
import { wsService } from '../services/websocket';
import { WS_EVENTS } from '../utils/constants';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onError?: (error: any) => void;
  onStatusChange?: (status: { connected: boolean }) => void;
  onToolCall?: (data: any) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    wsService.connect();

    const handleMessage = (data: any) => optionsRef.current.onMessage?.(data);
    const handleError = (error: any) => optionsRef.current.onError?.(error);
    const handleStatus = (status: any) => optionsRef.current.onStatusChange?.(status);
    const handleToolCall = (data: any) => optionsRef.current.onToolCall?.(data);

    wsService.on(WS_EVENTS.MESSAGE, handleMessage);
    wsService.on(WS_EVENTS.ERROR, handleError);
    wsService.on(WS_EVENTS.STATUS, handleStatus);
    wsService.on(WS_EVENTS.TOOL_CALL, handleToolCall);

    return () => {
      wsService.off(WS_EVENTS.MESSAGE, handleMessage);
      wsService.off(WS_EVENTS.ERROR, handleError);
      wsService.off(WS_EVENTS.STATUS, handleStatus);
      wsService.off(WS_EVENTS.TOOL_CALL, handleToolCall);
    };
  }, []);

  const sendMessage = useCallback((message: string, conversationId?: string) => {
    wsService.sendMessage(message, conversationId);
  }, []);

  return {
    sendMessage,
    isConnected: wsService.isConnected(),
  };
};