'use client';

import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { MessageSquare } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentBot, setCurrentBot] = useState('finnshipley');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { connected, sendMessage, onBotMessage } = useSocket();

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(`chat-${currentBot}`);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, [currentBot]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat-${currentBot}`, JSON.stringify(messages));
    }
  }, [messages, currentBot]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for bot messages
  useEffect(() => {
    const handleBotMessage = (data: any) => {
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        text: data.message,
        sender: 'bot',
        timestamp: data.timestamp
      }]);
    };

    onBotMessage(handleBotMessage);
  }, []); // Empty dependency array - only run once on mount

  const handleSend = () => {
    if (!inputValue.trim() || !connected) return;

    // Add user message to UI
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text: inputValue,
      sender: 'user',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to bot server (using your user ID)
    sendMessage(currentBot, 7764813487, inputValue);

    // Clear input
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
      {/* Tab Bar */}
      <div className="flex items-center gap-1 py-1 border-b" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>
        {/* Active Tab */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-t text-sm border border-b-0" style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
          <MessageSquare size={14} style={{ color: 'var(--text)', opacity: 0.6 }} />
          <span style={{ color: 'var(--text)' }}>Finn - Auth work</span>
          <button className="text-xs hover:bg-black/10 rounded px-1" style={{ color: 'var(--text)', opacity: 0.5 }}>×</button>
        </div>

        {/* Inactive Tab */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-t text-sm hover:bg-white/50 cursor-pointer" style={{ color: 'var(--text)', opacity: 0.6 }}>
          <span>📄 server.js</span>
          <button className="text-xs hover:bg-black/10 rounded px-1">×</button>
        </div>

        {/* New Tab Button */}
        <button className="px-2 py-1 text-sm hover:bg-white/50 rounded" style={{ color: 'var(--text)', opacity: 0.5 }}>
          +
        </button>
      </div>

      {/* Header */}
      <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <MessageSquare size={16} style={{ color: 'var(--text)', opacity: 0.6 }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Chatting with: Finn</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center" style={{ minHeight: '100%' }}>
            <div className="text-center" style={{ color: 'var(--text)', opacity: 0.5 }}>
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">
                {connected ? 'Connected to bot server' : 'Connecting...'}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[70%] rounded-lg p-3"
                style={msg.sender === 'user'
                  ? { backgroundColor: 'var(--sidebar-bg)' }
                  : { backgroundColor: 'white', border: '1px solid var(--border)' }
                }
              >
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
                  {msg.text}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={connected ? "Type message..." : "Connecting to bot server..."}
            className="flex-1 px-3 py-2 rounded border text-sm"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!connected}
          />
          <button
            className="px-4 py-2 rounded border text-sm font-medium"
            style={{
              borderColor: connected ? 'var(--border)' : '#ccc',
              color: connected ? 'var(--text)' : '#ccc',
              backgroundColor: 'transparent'
            }}
            onClick={handleSend}
            disabled={!connected || !inputValue.trim()}
          >
            Send
          </button>
          <button className="px-3 py-2 rounded border text-sm" style={{ borderColor: 'var(--border)' }}>
            📎
          </button>
        </div>
      </div>
    </div>
  );
}
