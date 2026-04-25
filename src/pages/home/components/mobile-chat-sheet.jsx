import React, { useEffect, useRef, useState } from 'react';
import { HiOutlineChat, HiX, HiPaperAirplane } from 'react-icons/hi';

import useBodyScrollLock from '../../../hooks/use-body-scroll-lock';
import './mobile-chat-sheet.css';

const INITIAL_MESSAGES = [
  {
    id: 1,
    type: 'agent',
    text: "Hi — tell us where you're shipping from and to and we can help.",
    time: nowLabel(),
  },
];

const REPLY_TEXT = 'Thanks — a logistics specialist will follow up shortly.';

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Real mobile chat experience: floating bubble + bottom-sheet message UI.
 *
 * Mocked client-side for now — the initial agent message renders, the user
 * can type and send, and a canned reply lands a moment later. No backend
 * wired up. Replaces the email-only modal that read as incomplete.
 */
function MobileChatSheet() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [draft, setDraft] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Lock the page behind the chat sheet — iOS-friendly.
  useBodyScrollLock(open);

  // Esc closes (helps with paired keyboards).
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Auto-scroll the message list to the bottom when content changes.
  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open]);

  const handleSend = (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text,
      time: nowLabel(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setDraft('');

    // Canned reply so the conversation surface always feels alive even
    // without a backend. Slight delay so the user's message renders first.
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, type: 'agent', text: REPLY_TEXT, time: nowLabel() },
      ]);
    }, 700);
  };

  return (
    <>
      <button
        type="button"
        className="mcs-bubble"
        aria-label="Open chat"
        onClick={() => setOpen(true)}
      >
        <HiOutlineChat aria-hidden="true" />
        <span className="mcs-bubble-label">Chat</span>
      </button>

      {open && (
        <div
          className="mcs-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mcs-sheet-title"
        >
          <button
            type="button"
            className="mcs-sheet-scrim"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
          />

          <div className="mcs-sheet-card">
            <div className="mcs-sheet-handle" aria-hidden="true" />

            <header className="mcs-sheet-header">
              <div className="mcs-sheet-identity">
                <div className="mcs-sheet-avatar" aria-hidden="true">
                  <img src="/images/logomercury1.png" alt="" />
                </div>
                <div className="mcs-sheet-meta">
                  <h2 id="mcs-sheet-title" className="mcs-sheet-title">Logistics Specialist</h2>
                  <span className="mcs-sheet-status">
                    <span className="mcs-sheet-status-dot" aria-hidden="true" />
                    Online now
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="mcs-sheet-close"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
              >
                <HiX aria-hidden="true" />
              </button>
            </header>

            <div className="mcs-sheet-body" aria-live="polite">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`mcs-msg ${m.type === 'user' ? 'mcs-msg--user' : 'mcs-msg--agent'}`}
                >
                  <p className="mcs-msg-text">{m.text}</p>
                  <span className="mcs-msg-time">{m.time}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form className="mcs-sheet-input-row" onSubmit={handleSend}>
              <input
                ref={inputRef}
                type="text"
                className="mcs-sheet-input"
                placeholder="Type a message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoComplete="off"
                aria-label="Message"
              />
              <button
                type="submit"
                className="mcs-sheet-send"
                disabled={!draft.trim()}
                aria-label="Send message"
              >
                <HiPaperAirplane aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileChatSheet;
