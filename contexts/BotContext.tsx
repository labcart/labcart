'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface Bot {
  id: string;
  name: string;
  displayName?: string;
  avatar?: string;
}

interface BotContextType {
  currentBot: Bot;
  setCurrentBot: (bot: Bot) => void;
  availableBots: Bot[];
}

const BotContext = createContext<BotContextType | undefined>(undefined);

// Fallback bots (in case Supabase isn't available)
const FALLBACK_BOTS: Bot[] = [
  { id: 'claude', name: 'Claude', avatar: '/claude-seeklogo.svg' },
  { id: 'finnshipley', name: 'Finn' },
  { id: 'mattyatlas', name: 'Matty' },
  { id: 'rickd', name: 'Rick' }
];

export function BotProvider({ children }: { children: ReactNode }) {
  const [availableBots, setAvailableBots] = useState<Bot[]>(FALLBACK_BOTS);
  const [currentBot, setCurrentBotState] = useState<Bot>(FALLBACK_BOTS[1]); // Default to Finn

  // Fetch user's bots from Supabase on mount
  useEffect(() => {
    async function fetchBots() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('No user logged in, using fallback bots');
          return;
        }

        // Fetch this user's bots
        const { data, error } = await supabase
          .from('bots')
          .select('id, name, display_name')
          .eq('user_id', user.id)
          .eq('active', true)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const bots: Bot[] = data.map(bot => ({
            id: bot.id,
            name: bot.name,
            displayName: bot.display_name || bot.name,
            avatar: bot.name === 'Claude' ? '/claude-seeklogo.svg' : undefined
          }));

          setAvailableBots(bots);

          // Set first bot as default
          setCurrentBotState(bots[0]);
        } else {
          console.log('No bots found for user, using fallback');
        }
      } catch (error) {
        console.error('Error fetching bots:', error);
        // Keep using fallback bots
      }
    }

    fetchBots();
  }, []);

  // Load saved bot from localStorage on mount
  useEffect(() => {
    const savedBotId = localStorage.getItem('current-bot');
    if (savedBotId) {
      const bot = availableBots.find(b => b.id === savedBotId);
      if (bot) {
        setCurrentBotState(bot);
      }
    }
  }, [availableBots]);

  const setCurrentBot = (bot: Bot) => {
    setCurrentBotState(bot);
    localStorage.setItem('current-bot', bot.id);
  };

  return (
    <BotContext.Provider value={{ currentBot, setCurrentBot, availableBots }}>
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
