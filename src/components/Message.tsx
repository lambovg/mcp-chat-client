import React from 'react';
import { Message as MessageType } from '../types';
import { format } from 'date-fns';
import './Message.css';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const timestamp = format(new Date(message.timestamp), 'HH:mm');

  return (
    <div className={`message ${isUser ? 'message--user' : 'message--assistant'}`}>
      <div className="message__header">
        <span className="message__role">{isUser ? 'You' : 'Assistant'}</span>
        <span className="message__timestamp">{timestamp}</span>
      </div>
      <div className="message__content">
        {message.content}
        {message.metadata?.toolCall && (
          <div className="message__tool-info">
            <span className="tool-badge">
              Tool: {message.metadata.toolCall.name}
            </span>
          </div>
        )}
      </div>
      {message.isError && (
        <div className="message__error">
          Error: Failed to process message
        </div>
      )}
    </div>
  );
};