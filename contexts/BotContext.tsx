'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface Bot {
  id: string;
  name: string;
  displayName?: string;
  avatar?: string;
  instanceId?: string; // my_agents.id (row UUID) - used for deletion
}

interface BotContextType {
  currentBot: Bot;
  setCurrentBot: (bot: Bot) => void;
  availableBots: Bot[];
  refreshBots: () => Promise<void>;
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

  // Fetch user's bots from Supabase
  const fetchBots = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user logged in, using fallback bots');
        return;
      }

      // Fetch user's agent instances (joined with marketplace_agents profiles)
      const { data: userAgents, error: userError } = await supabase
        .from('my_agents')
        .select(`
          id,
          instance_slug,
          agent:marketplace_agents (
            id,
            name,
            icon_emoji,
            is_active
          )
        `)
        .eq('user_id', user.id);

      if (userError) throw userError;

      let bots: Bot[] = [];

      if (userAgents && userAgents.length > 0) {
        // User has agent instances - use those
        bots = userAgents.map((item: any) => ({
          id: item.instance_slug,
          name: item.agent?.name || 'Unknown',
          displayName: item.agent?.name || 'Unknown',
          avatar: item.agent?.name === 'Claude' ? '/claude-seeklogo.svg' : undefined,
          instanceId: item.id, // my_agents row UUID for deletion
        }));
      } else {
        // No user instances - fall back to marketplace catalog
        const { data: catalogAgents, error: catalogError } = await supabase
          .from('marketplace_agents')
          .select('id, name, icon_emoji, is_active')
          .eq('is_active', true)
          .eq('visibility', 'public')
          .order('created_at', { ascending: true });

        if (catalogError) throw catalogError;

        if (catalogAgents && catalogAgents.length > 0) {
          bots = catalogAgents.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            displayName: agent.name,
            avatar: agent.name === 'Claude' ? '/claude-seeklogo.svg' : undefined
          }));
        }
      }

      if (bots.length > 0) {
        setAvailableBots(bots);
        // Only set current bot if not already set or if current is not in new list
        const currentStillExists = bots.some(b => b.id === currentBot?.id);
        if (!currentStillExists) {
          setCurrentBotState(bots[0]);
        }
      } else {
        console.log('No bots found for user, using fallback');
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
      // Keep using fallback bots
    }
  };

  // Fetch on mount
  useEffect(() => {
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
    <BotContext.Provider value={{ currentBot, setCurrentBot, availableBots, refreshBots: fetchBots }}>
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
