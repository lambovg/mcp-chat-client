export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
export const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

export const MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const;

export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  ERROR: 'error',
  STATUS: 'status',
  TOOL_CALL: 'tool_call',
} as const;