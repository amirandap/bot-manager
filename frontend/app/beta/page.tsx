"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import BotMonitorCard from "../../components/bot-monitor-card";
import { BotMetrics } from "../../components/bot-monitor-card";

interface Bot {
  id: string;
  name: string;
  type: string;
  apiPort: number;
  apiHost: string;
  pushName: string;
  enabled: boolean;
  pm2ServiceId: string;
  isExternal: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BotStatus {
  id: string;
  name: string;
  status: string;
  health: string;
  score: number;
  pm2?: BotMetrics;
  lastUpdated: string;
}

export default function BetaPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [botStatuses, setBotStatuses] = useState<Record<string, BotStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bots list
  const fetchBots = async () => {
    try {
      const response = await fetch("/api/bots");
      if (!response.ok) throw new Error("Failed to fetch bots");
      const data = await response.json();
      setBots(data);
    } catch (err) {
      console.error("Error fetching bots:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  // Fetch individual bot status
  const fetchBotStatus = async (botId: string) => {
    try {
      const response = await fetch(`/api/status/${botId}`);
      if (!response.ok) throw new Error(`Failed to fetch status for ${botId}`);
      const status = await response.json();

      setBotStatuses((prev) => ({
        ...prev,
        [botId]: status,
      }));
    } catch (err) {
      console.error(`Error fetching status for ${botId}:`, err);
      setBotStatuses((prev) => ({
        ...prev,
        [botId]: {
          id: botId,
          name: "Unknown",
          status: "error",
          health: "critical",
          score: 0,
          lastUpdated: new Date().toISOString(),
        },
      }));
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchBots();
      setLoading(false);
    };
    loadData();
  }, []);

  // Fetch statuses for all bots when bots list changes
  useEffect(() => {
    if (bots.length > 0) {
      bots.forEach((bot) => {
        fetchBotStatus(bot.id);
      });
    }
  }, [bots]);

  // Auto-refresh statuses every 30 seconds
  useEffect(() => {
    if (bots.length === 0) return;

    const interval = setInterval(() => {
      bots.forEach((bot) => {
        fetchBotStatus(bot.id);
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [bots]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando bots...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Beta - Monitor de Bots
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Versión experimental con nuevo diseño de tarjetas
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                {bots.length} bot{bots.length !== 1 ? "s" : ""}
              </div>
              <Link
                href="/"
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                ← Volver al dashboard principal
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bot Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {bots.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              No hay bots configurados
            </p>
            <p className="text-gray-400 text-sm">
              Configura un bot en el dashboard principal para verlo aquí
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {bots.map((bot) => {
              const status = botStatuses[bot.id];
              const metrics = status?.pm2;

              // Convert our data to the expected BotMetrics format
              const formattedMetrics: BotMetrics = metrics
                ? {
                    pid: metrics.pid || 0,
                    cpu: metrics.cpu || 0,
                    memory: metrics.memory || 0,
                    restarts: metrics.restarts || 0,
                    uptime: metrics.uptime || 0,
                    status: metrics.status || "unknown",
                    activeHandles: metrics.activeHandles || 0,
                    activeRequests: metrics.activeRequests || 0,
                    eventLoopLatency: String(metrics.eventLoopLatency || "0ms"),
                    heapUsage: metrics.heapUsage || 0,
                    errorCount: metrics.errorCount || 0,
                    httpRequests: metrics.httpRequests || 0,
                    botStatus: metrics.botStatus || status?.status || "unknown",
                    browserCpuUsage: metrics.browserCpuUsage || 0,
                    browserMemoryUsage: metrics.browserMemoryUsage || 0,
                    messageProcessingTime: metrics.messageProcessingTime || 0,
                    qrCodeStatus: metrics.qrCodeStatus || "unknown",
                    qrCodesGenerated: metrics.qrCodesGenerated || 0,
                    apiServerStatus: metrics.apiServerStatus || 0,
                    whatsappStatus: metrics.whatsappStatus || "unknown",
                  }
                : {
                    // Default empty metrics when no data is available
                    pid: 0,
                    cpu: 0,
                    memory: 0,
                    restarts: 0,
                    uptime: 0,
                    status: "unknown",
                    activeHandles: 0,
                    activeRequests: 0,
                    eventLoopLatency: "0ms",
                    heapUsage: 0,
                    errorCount: 0,
                    httpRequests: 0,
                    botStatus: "loading",
                    browserCpuUsage: 0,
                    browserMemoryUsage: 0,
                    messageProcessingTime: 0,
                    qrCodeStatus: "unknown",
                    qrCodesGenerated: 0,
                    apiServerStatus: 0,
                    whatsappStatus: "loading",
                  };

              return (
                <div key={bot.id} className="flex justify-center">
                  <BotMonitorCard title={bot.name} metrics={formattedMetrics} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>Actualización automática cada 30 segundos</p>
            <p>Beta v1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
