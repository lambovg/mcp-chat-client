import axios from "axios";
import { ChatRequest, ChatResponse, Message } from "../types";
import { API_URL } from "../utils/constants";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const chatApi = {
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>("/api/chat", request);
    return response.data;
  },

  getHistory: async (conversationId: string): Promise<Message[]> => {
    const response = await api.get<{ messages: Message[] }>(
      `/api/chat/history/${conversationId}`,
    );
    return response.data.messages;
  },

  testConnection: async (): Promise<boolean> => {
    try {
      const response = await api.get("/api/health");
      return response.status === 200;
    } catch {
      return false;
    }
  },

  welcomeMessage: async (): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>("/api/chat/welcome-message");
    return response.data;
  },
};

