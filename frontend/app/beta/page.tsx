"use client";

import React from "react";
import Link from "next/link";
import BotMonitorCard from "../../components/bot-monitor-card";
import { BotMetrics } from "../../components/bot-monitor-card";
import { useBotsStatus } from "@/lib/contexts/BotsStatusContext";

export default function BetaPage() {
  const { bots, isLoading, error, lastUpdated, refreshBots } = useBotsStatus();

  if (isLoading) {
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
            onClick={refreshBots}
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
                Versión experimental con contexto global y métricas completas
              </p>
              {lastUpdated && (
                <p className="text-xs text-gray-500 mt-1">
                  Última actualización: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                {bots.length} bot{bots.length !== 1 ? "s" : ""}
              </div>
              <button
                onClick={refreshBots}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                🔄 Actualizar
              </button>
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
              // Convert UnifiedBotStatus to BotMetrics format for the card
              const formattedMetrics: BotMetrics = {
                // Core PM2 metrics
                pid: bot.pm2.pid || 0,
                cpu: bot.pm2.cpu || 0,
                memory: bot.pm2.memory || 0,
                restarts: bot.pm2.restarts || 0,
                uptime: bot.pm2.uptime || 0,
                status: bot.pm2.status || "unknown",

                // Advanced metrics
                activeHandles: bot.pm2.activeHandles || 0,
                activeRequests: bot.pm2.activeRequests || 0,
                eventLoopLatency: bot.pm2.eventLoopLatency || "0ms",
                heapUsage: bot.pm2.heapUsage || 0,
                errorCount: bot.pm2.errorCount || 0,
                httpRequests: 0, // Not available in current PM2 metrics

                // Bot-specific metrics
                botStatus: bot.pm2.botStatus || bot.status,
                browserCpuUsage: bot.pm2.browserCpuUsage || 0,
                browserMemoryUsage: bot.pm2.browserMemoryUsage || 0,
                messageProcessingTime: bot.pm2.messageProcessingTime || 0,
                qrCodeStatus: bot.pm2.qrCodeStatus || "unknown",
                qrCodesGenerated: bot.pm2.qrCodesGenerated || 0,
                apiServerStatus: bot.pm2.apiServerStatus || 0,
                whatsappStatus: bot.pm2.whatsappStatus || "unknown",

                // NEW: Client information from comprehensive metrics
                clientPhoneNumber: String(bot.pm2.clientPhoneNumber || ""),
                clientPushName: String(bot.pm2.clientPushName || ""),
                whatsappConnections: bot.pm2.whatsappConnections || 0,
              };

              return (
                <div key={bot.id} className="flex justify-center">
                  <BotMonitorCard 
                    title={bot.name} 
                    metrics={formattedMetrics} 
                  />
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
            <p>Actualización automática cada 5 segundos via contexto global</p>
            <p>Beta v2.0 - Contexto Global</p>
          </div>
        </div>
      </div>
    </div>
  );
}
