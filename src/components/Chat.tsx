import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalContext, useSetLoginModal, useLogout } from './Store';
import { parseCommand, SUGGESTED_COMMANDS } from '../utils/chatCommands';
import '../styles/Chat.css';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  quickReplies?: string[];
}

let messageIdCounter = 0;
function nextId() {
  messageIdCounter += 1;
  return `${Date.now()}-${messageIdCounter}`;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: '0',
  role: 'assistant',
  text: "👋 Hi! I'm your AllTracks assistant. Tell me what you'd like to do and I'll help you navigate and use the app.\n\nTry saying \"Help\" to see everything I can do!",
  timestamp: new Date(),
  quickReplies: ['Help', 'Start Tracking', 'Browse Trails', 'View Profile'],
};

export const Chat: React.FC = () => {
  const navigate = useNavigate();
  const {
    state: { isAuthed, principal },
  } = useGlobalContext();
  const [, setLoginModal] = useSetLoginModal();
  const logout = useLogout();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages, scrollToBottom]);

  const principalStr = principal ? principal.toString() : undefined;

  const handleCommand = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: nextId(),
        role: 'user',
        text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      // Small delay to mimic assistant thinking
      await new Promise((resolve) => setTimeout(resolve, 400));

      const parsed = parseCommand(text, isAuthed, principalStr);
      setIsTyping(false);

      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        text: parsed.message,
        timestamp: new Date(),
        quickReplies: parsed.quickReplies,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (!isOpen) {
        setHasUnread(true);
      }

      // Execute side-effects
      if (parsed.navigationPath) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        navigate(parsed.navigationPath);
        setIsOpen(false);
      } else if (parsed.actionType === 'open_login') {
        await new Promise((resolve) => setTimeout(resolve, 600));
        setLoginModal(true);
      } else if (parsed.actionType === 'logout' && isAuthed) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const AuthClient = (await import('@dfinity/auth-client')).AuthClient;
        const authClient = await AuthClient.create();
        await authClient.logout();
        logout();
      }
    },
    [isAuthed, principalStr, navigate, setLoginModal, logout, isOpen],
  );

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    handleCommand(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleQuickReply = (reply: string) => {
    handleCommand(reply);
  };

  const handleSuggestion = (suggestion: string) => {
    handleCommand(suggestion);
  };

  const clearConversation = () => {
    setMessages([WELCOME_MESSAGE]);
  };

  return (
    <>
      {/* Floating chat button */}
      <button
        className={`chat-fab ${hasUnread ? 'chat-fab--unread' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close chat assistant' : 'Open chat assistant'}
        title="AllTracks Assistant"
      >
        {isOpen ? (
          <span className="material-icons">close</span>
        ) : (
          <>
            <span className="material-icons">chat</span>
            {hasUnread && <span className="chat-fab__badge" />}
          </>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="chat-panel" role="dialog" aria-label="AllTracks Chat Assistant">
          {/* Header */}
          <div className="chat-panel__header">
            <div className="chat-panel__header-info">
              <span className="material-icons chat-panel__header-icon">smart_toy</span>
              <div>
                <div className="chat-panel__header-title">AllTracks Assistant</div>
                <div className="chat-panel__header-subtitle">
                  {isAuthed ? '● Online' : 'Sign in for full access'}
                </div>
              </div>
            </div>
            <div className="chat-panel__header-actions">
              <button
                className="chat-panel__icon-btn"
                onClick={clearConversation}
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                <span className="material-icons">delete_sweep</span>
              </button>
              <button
                className="chat-panel__icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close"
                aria-label="Close chat"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-panel__messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="chat-message__avatar">
                    <span className="material-icons">smart_toy</span>
                  </div>
                )}
                <div className="chat-message__bubble">
                  <div className="chat-message__text">{msg.text}</div>
                  {msg.quickReplies && msg.quickReplies.length > 0 && (
                    <div className="chat-message__quick-replies">
                      {msg.quickReplies.map((reply) => (
                        <button
                          key={reply}
                          className="chat-quick-reply"
                          onClick={() => handleQuickReply(reply)}
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="chat-message__time">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-message chat-message--assistant">
                <div className="chat-message__avatar">
                  <span className="material-icons">smart_toy</span>
                </div>
                <div className="chat-message__bubble chat-message__bubble--typing">
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions (shown when no user messages yet) */}
          {messages.length <= 1 && (
            <div className="chat-panel__suggestions">
              <div className="chat-panel__suggestions-label">Try asking:</div>
              <div className="chat-panel__suggestions-list">
                {SUGGESTED_COMMANDS.slice(0, 5).map((s) => (
                  <button key={s} className="chat-suggestion" onClick={() => handleSuggestion(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="chat-panel__input-area">
            <input
              ref={inputRef}
              type="text"
              className="chat-panel__input"
              placeholder="Ask me anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Chat input"
            />
            <button
              className="chat-panel__send-btn"
              onClick={handleSend}
              disabled={!inputValue.trim()}
              aria-label="Send message"
              title="Send"
            >
              <span className="material-icons">send</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
