import React from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChat } from '../hooks/useChat';
import './ChatInterface.css';

export const ChatInterface: React.FC = () => {
  const { messages, isLoading, error, isConnected, sendMessage, clearMessages } = useChat();

  return (
    <div className="chat-interface">
      <div className="chat-interface__header">
        <h1>MCP Chat Client</h1>
        <button 
          className="clear-button"
          onClick={clearMessages}
          disabled={messages.length === 0}
        >
          Clear Chat
        </button>
      </div>
      {error && (
        <div className="chat-interface__error">
          {error}
        </div>
      )}
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput 
        onSendMessage={sendMessage} 
        isLoading={isLoading}
        isConnected={isConnected}
      />
    </div>
  );
};