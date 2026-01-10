'use client';

/**
 * MarketplacePanel Component
 *
 * Displays available marketplace agents that the user can add to their team.
 * Fetches from /api/agents?catalogOnly=true and allows adding via POST /api/agents.
 */

import { useState, useEffect } from 'react';
import { Plus, Loader2, Check, Search } from 'lucide-react';
import { useBot } from '@/contexts/BotContext';
import useTabStore from '@/store/tabStore';
import { apiFetch } from '@/lib/api-client';

interface MarketplaceAgent {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_emoji: string;
  agent_type: string;
  is_active: boolean;
}

export default function MarketplacePanel() {
  const [agents, setAgents] = useState<MarketplaceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingAgentId, setAddingAgentId] = useState<string | null>(null);
  const [addedAgentIds, setAddedAgentIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const { availableBots, refreshBots } = useBot();
  const { userId } = useTabStore();

  // Fetch marketplace agents on mount
  useEffect(() => {
    async function fetchAgents() {
      try {
        setLoading(true);
        setError(null);

        const response = await apiFetch('/api/agents?catalogOnly=true');

        if (!response.ok) {
          throw new Error('Failed to fetch agents');
        }

        const data = await response.json();
        setAgents(data.agents || []);
      } catch (err) {
        console.error('Error fetching marketplace agents:', err);
        setError(err instanceof Error ? err.message : 'Failed to load agents');
      } finally {
        setLoading(false);
      }
    }

    fetchAgents();
  }, []);

  // Track which agents user already has
  const userAgentSlugs = new Set(availableBots.map(b => b.id));

  // Handle adding an agent
  const handleAddAgent = async (agent: MarketplaceAgent) => {
    if (!userId) {
      console.error('No userId available');
      return;
    }

    try {
      setAddingAgentId(agent.id);

      const response = await apiFetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          profileId: agent.id,
          instanceSlug: agent.slug,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add agent');
      }

      // Mark as added
      setAddedAgentIds(prev => new Set([...prev, agent.id]));

      // Refresh the bot list in context
      if (refreshBots) {
        await refreshBots();
      }

      console.log(`Added agent: ${agent.name}`);
    } catch (err) {
      console.error('Error adding agent:', err);
      // Could show a toast here
    } finally {
      setAddingAgentId(null);
    }
  };

  // Filter agents by search query
  const filteredAgents = agents.filter(agent => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.description?.toLowerCase().includes(query)
    );
  });

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text)' }}>
        <div className="flex items-center gap-2">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading agents...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text)' }}>
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded text-sm"
            style={{ backgroundColor: 'var(--sidebar-bg)', border: '1px solid var(--border)' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>
          Add Agent to Team
        </h2>
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text)', opacity: 0.5 }}
          />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded text-sm"
            style={{
              backgroundColor: 'var(--sidebar-bg)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          />
        </div>
      </div>

      {/* Agent Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text)', opacity: 0.5 }}>
            {searchQuery ? 'No agents match your search' : 'No agents available'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => {
              const isOwned = userAgentSlugs.has(agent.slug);
              const isAdding = addingAgentId === agent.id;
              const justAdded = addedAgentIds.has(agent.id);

              return (
                <div
                  key={agent.id}
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--sidebar-bg)',
                    borderColor: 'var(--border)',
                  }}
                >
                  {/* Agent Icon & Name */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{agent.icon_emoji || '🤖'}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate" style={{ color: 'var(--text)' }}>
                        {agent.name}
                      </h3>
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--background)',
                          color: 'var(--text)',
                          opacity: 0.7,
                        }}
                      >
                        {agent.agent_type || 'personality'}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p
                    className="text-sm mb-3 line-clamp-2"
                    style={{ color: 'var(--text)', opacity: 0.7 }}
                  >
                    {agent.description || 'No description available'}
                  </p>

                  {/* Add Button */}
                  {isOwned || justAdded ? (
                    <button
                      disabled
                      className="w-full py-2 px-4 rounded text-sm flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: 'var(--background)',
                        color: 'var(--text)',
                        opacity: 0.5,
                        cursor: 'not-allowed',
                      }}
                    >
                      <Check size={16} />
                      Added to Team
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddAgent(agent)}
                      disabled={isAdding}
                      className="w-full py-2 px-4 rounded text-sm flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: 'var(--text)',
                        color: 'var(--background)',
                      }}
                    >
                      {isAdding ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          Add to Team
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
