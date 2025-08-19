"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import { BotStatus, Bot } from '@/lib/types';

// Types for the context
interface BotsState {
  bots: Bot[];
  botStatuses: Record<string, BotStatus>;
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  connected: boolean;
}

type BotsAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_BOTS'; payload: Bot[] }
  | { type: 'SET_BOT_STATUSES'; payload: BotStatus[] }
  | { type: 'UPDATE_BOT_STATUS'; payload: BotStatus }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_LAST_UPDATE'; payload: string };

interface BotsContextType extends BotsState {
  refreshBots: () => Promise<void>;
  refreshStatuses: () => Promise<void>;
  getBotById: (id: string) => Bot | undefined;
  getBotStatusById: (id: string) => BotStatus | undefined;
}

// Initial state
const initialState: BotsState = {
  bots: [],
  botStatuses: {},
  loading: true,
  error: null,
  lastUpdate: null,
  connected: false,
};

// Reducer
function botsReducer(state: BotsState, action: BotsAction): BotsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_BOTS':
      return { ...state, bots: action.payload, loading: false };
    case 'SET_BOT_STATUSES':
      const statusesById = action.payload.reduce((acc, status) => {
        acc[status.id] = status;
        return acc;
      }, {} as Record<string, BotStatus>);
      return { 
        ...state, 
        botStatuses: statusesById, 
        loading: false,
        lastUpdate: new Date().toISOString(),
        connected: true
      };
    case 'UPDATE_BOT_STATUS':
      return {
        ...state,
        botStatuses: {
          ...state.botStatuses,
          [action.payload.id]: action.payload,
        },
        lastUpdate: new Date().toISOString(),
      };
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    case 'SET_LAST_UPDATE':
      return { ...state, lastUpdate: action.payload };
    default:
      return state;
  }
}

// Create context
const BotsContext = createContext<BotsContextType | undefined>(undefined);

// Provider component
export function BotsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(botsReducer, initialState);

  // Fetch bots list
  const refreshBots = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await fetch('/api/bots');
      if (!response.ok) throw new Error('Failed to fetch bots');
      const bots = await response.json();
      dispatch({ type: 'SET_BOTS', payload: bots });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      console.error('Error fetching bots:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
    }
  }, []);

  // Fetch all bot statuses
  const refreshStatuses = useCallback(async () => {
    try {
      const response = await fetch('/api/status');
      if (!response.ok) throw new Error('Failed to fetch bot statuses');
      const statuses = await response.json();
      dispatch({ type: 'SET_BOT_STATUSES', payload: statuses });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      console.error('Error fetching bot statuses:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Unknown error' });
      dispatch({ type: 'SET_CONNECTED', payload: false });
    }
  }, []);

  // Helper functions
  const getBotById = useCallback((id: string) => {
    return state.bots.find(bot => bot.id === id);
  }, [state.bots]);

  const getBotStatusById = useCallback((id: string) => {
    return state.botStatuses[id];
  }, [state.botStatuses]);

  // Setup SSE connection for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const setupSSE = () => {
      try {
        eventSource = new EventSource('/api/events/bot-status');
        
        eventSource.onopen = () => {
          console.log('SSE connection established');
          dispatch({ type: 'SET_CONNECTED', payload: true });
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'bot-status-update') {
              dispatch({ type: 'UPDATE_BOT_STATUS', payload: data.status });
            } else if (data.type === 'all-statuses') {
              dispatch({ type: 'SET_BOT_STATUSES', payload: data.statuses });
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          dispatch({ type: 'SET_CONNECTED', payload: false });
          eventSource?.close();
          
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(() => {
            console.log('Attempting to reconnect SSE...');
            setupSSE();
          }, 5000);
        };
      } catch (error) {
        console.error('Failed to setup SSE:', error);
        dispatch({ type: 'SET_CONNECTED', payload: false });
      }
    };

    // Initial data load
    refreshBots().then(() => {
      refreshStatuses();
    });

    // Setup SSE for real-time updates (fallback if SSE not available)
    setupSSE();

    // Fallback polling if SSE fails
    const pollInterval = setInterval(() => {
      if (!state.connected) {
        refreshStatuses();
      }
    }, 30000); // Poll every 30 seconds as fallback

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      clearInterval(pollInterval);
    };
  }, [refreshBots, refreshStatuses, state.connected]);

  const contextValue: BotsContextType = {
    ...state,
    refreshBots,
    refreshStatuses,
    getBotById,
    getBotStatusById,
  };

  return (
    <BotsContext.Provider value={contextValue}>
      {children}
    </BotsContext.Provider>
  );
}

// Hook to use the context
export function useBots() {
  const context = useContext(BotsContext);
  if (context === undefined) {
    throw new Error('useBots must be used within a BotsProvider');
  }
  return context;
}

// Export types for use in components
export type { BotsContextType, BotsState };
