import { io, Socket } from 'socket.io-client';
import { WebSocketMessage } from '../types';
import { WS_URL, WS_EVENTS } from '../utils/constants';

export class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventHandlers();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on(WS_EVENTS.CONNECT, () => {
      this.emit(WS_EVENTS.STATUS, { connected: true });
    });

    this.socket.on(WS_EVENTS.DISCONNECT, () => {
      this.emit(WS_EVENTS.STATUS, { connected: false });
    });

    this.socket.on(WS_EVENTS.MESSAGE, (message: WebSocketMessage) => {
      this.emit(message.type, message.data);
    });

    this.socket.on(WS_EVENTS.ERROR, (error: any) => {
      this.emit(WS_EVENTS.ERROR, error);
    });
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  sendMessage(message: string, conversationId?: string): void {
    this.socket?.emit('chat:message', { message, conversationId });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const wsService = new WebSocketService();