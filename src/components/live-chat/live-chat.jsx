// src/components/live-chat/live-chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineChat, HiX, HiPaperAirplane } from 'react-icons/hi';
import { BsCircleFill } from 'react-icons/bs';
// ✅ Use the carrier notifications context that definitely exists app-wide
import { useNotifications } from '../../store/notifications-context';
import './live-chat.css';

function LiveChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'agent',
      text: 'Hello! How can we assist you with your car shipping needs today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const messagesEndRef = useRef(null);

  // Hide chat when the (carrier) notification panel is open
  const { isPanelOpen } = useNotifications();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMouseEnter = () => {
    if (!isOpen) setIsOpen(true);
  };

  const toggleChat = () => setIsOpen(!isOpen);
  const closeChat = () => setIsOpen(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      const newMessage = {
        id: messages.length + 1,
        type: 'user',
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...messages, newMessage]);
      setMessage('');

      setTimeout(() => {
        const agentResponse = {
          id: messages.length + 2,
          type: 'agent',
          text: 'Thank you for your message. An agent will respond shortly.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, agentResponse]);
      }, 1000);
    }
  };

  // If any notifications panel is open (carrier), hide chat
  if (isPanelOpen) return null;

  return (
    <>
      {/* Chat Button */}
      <button
        className="live-chat-button"
        onMouseEnter={handleMouseEnter}
        onClick={toggleChat}
        aria-label="Open live chat"
      >
        <HiOutlineChat className="live-chat-icon" />
        <span className="live-chat-text">Chat</span>
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="live-chat-panel">
          {/* Header */}
          <div className="live-chat-header">
            <div className="live-chat-header-content">
              <div className="live-chat-company">
                <div className="company-logo">
                  <span>G</span>
                </div>
                <div className="company-info">
                  <h3 className="company-name">Guga Support</h3>
                  <div className="agent-status">
                    <BsCircleFill className="status-dot" />
                    <span>Available</span>
                  </div>
                </div>
              </div>
              <button
                className="live-chat-minimize"
                onClick={closeChat}
                aria-label="Close chat"
              >
                <HiX />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="live-chat-body">
            <div className="live-chat-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message ${msg.type === 'user' ? 'chat-message-user' : 'chat-message-agent'}`}
                >
                  {msg.type === 'agent' && (
                    <div className="message-avatar">
                      <span>G</span>
                    </div>
                  )}
                  <div className="message-bubble">
                    <p className="message-text">{msg.text}</p>
                    <span className="message-time">{msg.time}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Footer */}
          <div className="live-chat-footer">
            <form onSubmit={handleSubmit} className="live-chat-form">
              <input
                type="text"
                className="live-chat-input"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="live-chat-send"
                disabled={!message.trim()}
                aria-label="Send message"
              >
                <HiPaperAirplane />
              </button>
            </form>
            <div className="live-chat-powered">
              <span>Powered by Guga</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default LiveChat;
