'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import useTabStore from '@/store/tabStore';
import { useChatSession } from '@/hooks/useChatSession';
import type { Message } from '@/types';

function PopoutChatContent() {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get params from URL
  const tabId = searchParams.get('tabId') || '';
  const botId = searchParams.get('botId') || '';
  const botName = searchParams.get('botName') || 'Agent';
  const sessionUuid = searchParams.get('sessionUuid') || undefined;
  const userId = searchParams.get('userId') || '';
  const workspacePath = searchParams.get('workspacePath') || '';

  // Initialize userId in store before socket connects
  useEffect(() => {
    if (userId) {
      useTabStore.getState().setUserId(userId);
      setReady(true);
    }
  }, [userId]);

  // Chat session hook
  const {
    connected,
    loading,
    sendMessage,
  } = useChatSession({
    tabId,
    botId,
    botName,
    userId,
    workspacePath,
    sessionUuid,
  });

  // Get messages from store
  const messages = useTabStore((state) => {
    const tab = state.tabs.find(t => t.id === tabId);
    return tab?.type === 'chat' ? tab.messages : [];
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!userId || !botId) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <p style={{ color: 'var(--text)' }}>Missing required parameters</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <p style={{ color: 'var(--text)' }}>Initializing...</p>
      </div>
    );
  }

  const renderMessage = (msg: Message, index: number) => {
    const isUser = msg.role === 'user';
    const isStreaming = msg.status === 'streaming';
    const isFailed = msg.status === 'failed';

    return (
      <div
        key={msg.id || index}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className="max-w-[80%] rounded-lg px-4 py-2"
          style={{
            backgroundColor: isUser ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
            border: isUser ? 'none' : '1px solid var(--border)',
          }}
        >
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
            {msg.text || (isStreaming ? '' : '')}
          </p>
          {isStreaming && !msg.text && (
            <span className="animate-pulse" style={{ color: 'var(--text)', opacity: 0.5 }}>
              ...
            </span>
          )}
          {isFailed && (
            <span className="text-xs text-red-500 mt-1 block">
              Failed to send
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <div className="border-b px-4 py-2 flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--sidebar-bg)' }}>
        <div className="flex items-center gap-2">
          <MessageSquare size={16} style={{ color: 'var(--text)', opacity: 0.6 }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            {botName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: connected ? '#22c55e' : '#ef4444' }}
          />
          <span className="text-xs" style={{ color: 'var(--text)', opacity: 0.5 }}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center" style={{ color: 'var(--text)', opacity: 0.5 }}>
              <MessageSquare size={48} className="mx-auto mb-4" style={{ opacity: 0.3 }} />
              <p className="text-sm">No messages yet</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => renderMessage(msg, index))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={loading ? 'Sending...' : 'Type a message...'}
            disabled={loading || !connected}
            className="flex-1 px-3 py-2 rounded border text-sm focus:outline-none focus:border-gray-300"
            style={{
              backgroundColor: 'var(--background)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !connected || !inputValue.trim()}
            className="px-4 py-2 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: loading || !connected || !inputValue.trim() ? 'var(--border)' : 'var(--text)',
              color: loading || !connected || !inputValue.trim() ? 'var(--text)' : 'var(--background)',
              opacity: loading || !connected || !inputValue.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PopoutChat() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <p style={{ color: 'var(--text)' }}>Loading...</p>
      </div>
    }>
      <PopoutChatContent />
    </Suspense>
  );
}
