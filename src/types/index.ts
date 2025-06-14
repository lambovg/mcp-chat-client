export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  isError?: boolean;
  metadata?: {
    toolCall?: {
      name: string;
      arguments: any;
      result: any;
    };
  };
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  message: Message;
  conversationId: string;
}

export interface WebSocketMessage {
  type: 'message' | 'error' | 'status' | 'tool_call';
  data: any;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  isConnected: boolean;
}