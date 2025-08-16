'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Types for the unified bot status
export interface BotPM2Metrics {
  name: string;
  status: 'online' | 'stopped' | 'errored' | 'launching' | 'unknown';
  pid: number;
  uptime: number;
  restarts: number;
  cpu: number;
  memory: number;
  activeHandles: number;
  activeRequests: number;
  eventLoopLatency: string;
  heapUsage: number;
  heapSize: string;
  usedHeapSize: string;
  
  // Custom bot metrics
  botStatus?: string;
  clientPhoneNumber?: number;
  clientPushName?: number;
  browserCpuUsage?: number;
  browserMemoryUsage?: number;
  messageProcessingTime?: number;
  errorCount?: number;
  messagesProcessed?: number;
  qrCodeStatus?: string;
  qrCodesGenerated?: number;
  apiServerStatus?: number;
  whatsappStatus?: string;
  whatsappConnections?: number;
  eventLoopLatencyP95?: string;
  nodeVersion?: string;
  logPath?: string;
  errorLogPath?: string;
  outLogPath?: string;
}

export interface BotHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  score: number;
  issues: string[];
}

export interface UnifiedBotStatus {
  id: string;
  name: string;
  type: 'whatsapp' | 'discord';
  status: 'online' | 'offline' | 'stopped' | 'stopping' | 'errored' | 'launching' | 'unknown';
  pushName?: string;
  apiResponsive: boolean;
  lastSeen: string;
  pm2: BotPM2Metrics;
  health: BotHealth;
}

interface BotsStatusContextType {
  bots: UnifiedBotStatus[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshBots: () => Promise<void>;
  getBotById: (id: string) => UnifiedBotStatus | undefined;
  getBotByPM2Name: (pm2Name: string) => UnifiedBotStatus | undefined;
}

const BotsStatusContext = createContext<BotsStatusContextType | undefined>(undefined);

interface BotsStatusProviderProps {
  children: React.ReactNode;
  refreshInterval?: number; // in milliseconds, default 5000
}

export function BotsStatusProvider({ 
  children, 
  refreshInterval = 5000 
}: BotsStatusProviderProps) {
  const [bots, setBots] = useState<UnifiedBotStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBotsStatus = useCallback(async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: UnifiedBotStatus[] = await response.json();
      setBots(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bots status';
      setError(errorMessage);
      console.error('Error fetching bots status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshBots = useCallback(async () => {
    setIsLoading(true);
    await fetchBotsStatus();
  }, [fetchBotsStatus]);

  const getBotById = useCallback((id: string) => {
    return bots.find(bot => bot.id === id);
  }, [bots]);

  const getBotByPM2Name = useCallback((pm2Name: string) => {
    return bots.find(bot => bot.pm2.name === pm2Name);
  }, [bots]);

  // Initial fetch
  useEffect(() => {
    fetchBotsStatus();
  }, [fetchBotsStatus]);

  // Set up polling
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchBotsStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchBotsStatus, refreshInterval]);

  const contextValue: BotsStatusContextType = {
    bots,
    isLoading,
    error,
    lastUpdated,
    refreshBots,
    getBotById,
    getBotByPM2Name,
  };

  return (
    <BotsStatusContext.Provider value={contextValue}>
      {children}
    </BotsStatusContext.Provider>
  );
}

// Custom hook to use the context
export function useBotsStatus() {
  const context = useContext(BotsStatusContext);
  if (context === undefined) {
    throw new Error('useBotsStatus must be used within a BotsStatusProvider');
  }
  return context;
}

// Convenience hooks for specific data
export function useBotStatus(botId: string) {
  const { getBotById } = useBotsStatus();
  return getBotById(botId);
}

export function useBotPM2Metrics(botId: string) {
  const bot = useBotStatus(botId);
  return bot?.pm2;
}

export function useBotHealth(botId: string) {
  const bot = useBotStatus(botId);
  return bot?.health;
}

export function useBotsMetrics() {
  const { bots } = useBotsStatus();
  
  const totalBots = bots.length;
  const onlineBots = bots.filter(bot => bot.status === 'online').length;
  const erroredBots = bots.filter(bot => bot.status === 'errored').length;
  const stoppedBots = bots.filter(bot => bot.status === 'stopped').length;
  
  const totalMemory = bots.reduce((sum, bot) => sum + (bot.pm2.memory || 0), 0);
  const averageCpu = bots.length > 0 
    ? bots.reduce((sum, bot) => sum + (bot.pm2.cpu || 0), 0) / bots.length 
    : 0;
  
  const healthyBots = bots.filter(bot => bot.health.status === 'healthy').length;
  const warningBots = bots.filter(bot => bot.health.status === 'warning').length;
  const criticalBots = bots.filter(bot => bot.health.status === 'critical').length;

  return {
    totalBots,
    onlineBots,
    erroredBots,
    stoppedBots,
    totalMemory,
    averageCpu,
    healthyBots,
    warningBots,
    criticalBots,
    healthScore: bots.length > 0 
      ? bots.reduce((sum, bot) => sum + bot.health.score, 0) / bots.length 
      : 0,
  };
}
