'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Bot {
  id: string;
  name: string;
  avatar?: string;
}

interface BotContextType {
  currentBot: Bot;
  setCurrentBot: (bot: Bot) => void;
  availableBots: Bot[];
}

const BotContext = createContext<BotContextType | undefined>(undefined);

// Available bots configuration
const BOTS: Bot[] = [
  { id: 'claude', name: 'Claude', avatar: '/claude-seeklogo.svg' },
  { id: 'finnshipley', name: 'Finn' },
  { id: 'mattyatlas', name: 'Matty' },
  { id: 'rickd', name: 'Rick' }
];

export function BotProvider({ children }: { children: ReactNode }) {
  const [currentBot, setCurrentBotState] = useState<Bot>(BOTS[1]); // Default to Finn

  // Load saved bot from localStorage on mount
  useEffect(() => {
    const savedBotId = localStorage.getItem('current-bot');
    if (savedBotId) {
      const bot = BOTS.find(b => b.id === savedBotId);
      if (bot) {
        setCurrentBotState(bot);
      }
    }
  }, []);

  const setCurrentBot = (bot: Bot) => {
    setCurrentBotState(bot);
    localStorage.setItem('current-bot', bot.id);
  };

  return (
    <BotContext.Provider value={{ currentBot, setCurrentBot, availableBots: BOTS }}>
      {children}
    </BotContext.Provider>
  );
}

export function useBot() {
  const context = useContext(BotContext);
  if (context === undefined) {
    throw new Error('useBot must be used within a BotProvider');
  }
  return context;
}
