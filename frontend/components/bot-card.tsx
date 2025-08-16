"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  MessageCircle,
  RefreshCw,
  Settings,
  Trash2,
  QrCode,
  PlayCircle,
} from "lucide-react";
import StatusIndicator from "./status-indicator";
import PM2StatusIndicator from "./pm2-status-indicator";
import QRCodeDisplay from "./qr-code-display";
import type { Bot, BotStatus } from "@/lib/types";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface BotCardProps {
  bot: Bot;
  onUpdate?: (bot: Bot) => void;
  onDelete?: (botId: string) => void;
}

interface QRStatus {
  available: boolean;
  filePath?: string;
  createdAt?: string;
  ageMinutes?: number;
  expired?: boolean;
}

export default function BotCard({ bot, onUpdate, onDelete }: BotCardProps) {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [qrStatus, setQrStatus] = useState<QRStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const getBotIcon = (type?: string) => {
    const safeType = typeof type === "string" ? type.toLowerCase() : "";
    switch (safeType) {
      case "discord":
        return <MessageCircle className="h-5 w-5" />;
      case "whatsapp":
        return <MessageSquare className="h-5 w-5" />;
      default:
        return <MessageSquare className="h-5 w-5" />;
    }
  };

  // Fetch QR code status for WhatsApp bots
  const fetchQRStatus = useCallback(async () => {
    if (bot.type !== "whatsapp") return;

    try {
      const response = await fetch(api.proxy.getQRCodeStatus(bot.id), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const qrData = await response.json();
        console.log("🔍 QR status received:", qrData);
        setQrStatus(qrData.qrCode || qrData);
      } else {
        console.log("⚠️ QR status request failed:", response.status);
        setQrStatus({ available: false });
      }
    } catch (error) {
      console.error("❌ Error fetching QR status:", error);
      setQrStatus({ available: false });
    }
  }, [bot.id, bot.type]);

  const fetchBotStatus = useCallback(async () => {
    setLoading(true);
    try {
      // 🚀 Use the PM2 metrics endpoint for complete custom metrics
      const response = await fetch(api.getBotStatusMetrics(bot.id), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        const statusData = result.status || result;
        console.log("✅ Bot status received:", statusData);
        setStatus(statusData);

        // Also fetch QR status for WhatsApp bots
        if (bot.type === "whatsapp") {
          fetchQRStatus();
        }
      } else {
        console.warn("PM2 metrics not available for bot:", bot.id);

        // Set status to indicate bot is not running (but don't error)
        setStatus({
          id: bot.id,
          name: bot.name,
          type: bot.type,
          status: "offline",
          apiResponsive: false,
          pm2: {
            pid: undefined,
            cpu: 0,
            memory: 0,
            restarts: 0,
            uptime: 0,
            lastRestart: undefined,
          },
        });
      }
    } catch (error) {
      console.error("PM2 metrics failed:", error);

      // No fallback - PM2 metrics only
      setStatus({
        id: bot.id,
        name: bot.name,
        type: bot.type,
        status: "offline",
        apiResponsive: false,
      });
    } finally {
      setLoading(false);
    }
  }, [bot.id, bot.name, bot.type, fetchQRStatus]);

  const handleViewQR = async () => {
    const safeType = typeof bot.type === "string" ? bot.type.toLowerCase() : "";
    if (safeType === "whatsapp") {
      // Open QR modal instead of new window
      setShowQRModal(true);
    }
  };

  const handleSpawnBot = async () => {
    setLoading(true);
    try {
      // Call the PM2 spawn endpoint
      const response = await fetch(api.base + `/api/bots/${bot.id}/spawn`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        console.log("Bot spawned successfully");
        // Refresh status after spawning
        setTimeout(() => {
          fetchBotStatus();
        }, 2000);
      } else {
        console.error("Failed to spawn bot");
      }
    } catch (error) {
      console.error("Error spawning bot:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBotStatus();
    // Poll for status updates every 30 seconds
    const interval = setInterval(fetchBotStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchBotStatus]);

  return (
    <>
      <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getBotIcon(bot.type)}
            <CardTitle>{bot.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                typeof bot.type === "string" &&
                bot.type.toLowerCase() === "discord"
                  ? "default"
                  : "outline"
              }
            >
              {bot.type || "Unknown"}
            </Badge>
            <Badge
              variant={bot.isExternal ? "secondary" : "default"}
              title={
                bot.isExternal
                  ? "External bot (not managed by our PM2)"
                  : "Internal bot (managed by our PM2)"
              }
            >
              {bot.isExternal ? "External" : "Internal"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StatusIndicator
              status={status?.status || "unknown"}
              botStatus={status || undefined}
              showDetails={false}
            />
            <span className="text-sm font-medium capitalize">
              {status?.status || "Loading..."}
            </span>
            {/* Real PM2 Metrics in parentheses */}
            {!bot.isExternal && status?.pm2 && (
              <span className="text-xs text-gray-500">
                (CPU: {status.pm2.cpu}%, MEM: {status.pm2.memory}MB, ↻
                {status.pm2.restarts}, ⏱
                {Math.floor((status.pm2.uptime || 0) / 60000)}m
                {/* Custom PM2 Metrics */}
                {status.pm2.activeHandles &&
                  `, AH: ${status.pm2.activeHandles}`}
                {status.pm2.eventLoopLatency &&
                  `, EL: ${typeof status.pm2.eventLoopLatency === 'number' 
                    ? Math.round(status.pm2.eventLoopLatency)
                    : status.pm2.eventLoopLatency}ms`}
                {status.pm2.errorCount && `, ERR: ${status.pm2.errorCount}`})
              </span>
            )}
          </div>
        </div>

        {/* Essential bot info only */}
        <div className="text-sm space-y-1 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Port:</span>
            <span>{bot.apiPort}</span>
          </div>

          {/* WhatsApp specific info */}
          {bot.type === "whatsapp" && (
            <>
              {/* Dynamic client info from PM2 metrics (priority) */}
              {status?.pm2?.clientPhoneNumber && status.pm2.clientPhoneNumber !== '0' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">📱 Cliente:</span>
                  <span className="font-mono text-sm">{status.pm2.clientPhoneNumber}</span>
                </div>
              )}
              
              {status?.pm2?.clientPushName && status.pm2.clientPushName !== '0' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">👤 Nombre:</span>
                  <span className="font-medium">{status.pm2.clientPushName}</span>
                </div>
              )}

              {/* Fallback to static config if dynamic not available */}
              {!status?.pm2?.clientPhoneNumber && bot.phoneNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone (Config):</span>
                  <span>{bot.phoneNumber}</span>
                </div>
              )}

              {!status?.pm2?.clientPushName && status?.status === "online" && status?.pushName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">WhatsApp Name:</span>
                  <span>{status.pushName}</span>
                </div>
              )}

              {/* QR Status - only show if relevant */}
              {qrStatus?.available && !qrStatus?.expired && (
                <div className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                  <span className="text-green-600 font-medium">
                    🔥 QR Ready to scan ({Math.round(qrStatus.ageMinutes || 0)}m
                    old)
                  </span>
                </div>
              )}

              {qrStatus?.expired && (
                <div className="p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                  <span className="text-orange-600 font-medium">
                    ⏰ QR Code expired - refresh needed
                  </span>
                </div>
              )}
            </>
          )}

          {/* Advanced PM2 Metrics Section - only show if available */}
          {!bot.isExternal &&
            status?.pm2 &&
            (status.pm2.activeHandles ||
              status.pm2.eventLoopLatency ||
              status.pm2.heapUsage ||
              status.pm2.httpRequests) && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                <div className="font-medium text-blue-700 mb-1">
                  📊 PM2 Advanced Metrics:
                </div>
                <div className="grid grid-cols-2 gap-1 text-blue-600">
                  {status.pm2.activeHandles && (
                    <div>Active Handles: {status.pm2.activeHandles}</div>
                  )}
                  {status.pm2.activeRequests && (
                    <div>Active Requests: {status.pm2.activeRequests}</div>
                  )}
                  {status.pm2.eventLoopLatency && (
                    <div>
                      Event Loop: {typeof status.pm2.eventLoopLatency === 'number' 
                        ? Math.round(status.pm2.eventLoopLatency)
                        : status.pm2.eventLoopLatency}ms
                    </div>
                  )}
                  {status.pm2.httpRequests && (
                    <div>HTTP Requests: {status.pm2.httpRequests}</div>
                  )}
                  {status.pm2.heapUsage && (
                    <div>Heap: {typeof status.pm2.heapUsage === 'number' 
                      ? Math.round(status.pm2.heapUsage)
                      : 'N/A'}%</div>
                  )}
                  {status.pm2.errorCount !== undefined && (
                    <div>Errors: {status.pm2.errorCount}</div>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* PM2 Status Indicator - separate detailed PM2 management */}
        {!bot.isExternal && (
          <PM2StatusIndicator bot={bot} onStatusChange={fetchBotStatus} />
        )}

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full cursor-pointer"
            onClick={fetchBotStatus}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`}
            />
            Refresh Status
          </Button>

          {/* QR Code button - only show when QR is available and not expired */}
          {bot.type === "whatsapp" &&
            qrStatus?.available &&
            !qrStatus?.expired && (
              <Button
                variant="outline"
                size="sm"
                className="w-full cursor-pointer bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                onClick={handleViewQR}
              >
                <QrCode className="h-4 w-4 mr-1" />
                🔥 View QR Code
              </Button>
            )}

          {onUpdate && (
            <Button
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              onClick={() => onUpdate && onUpdate(bot)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}

          {/* Show spawn button only when bot is offline */}
          {!bot.isExternal && status?.status === "offline" && (
            <Button
              variant="default"
              size="sm"
              className="w-full cursor-pointer bg-green-600 hover:bg-green-700"
              onClick={handleSpawnBot}
              disabled={loading}
            >
              <PlayCircle className="h-4 w-4 mr-1" />
              Create Bot Process
            </Button>
          )}

          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              className="w-full cursor-pointer"
              onClick={() => onDelete && onDelete(bot.id)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>

    {/* QR Code Modal */}
    <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            WhatsApp QR Code - {bot.name}
          </DialogTitle>
          <DialogDescription>
            Scan this QR code with your WhatsApp to connect the bot
          </DialogDescription>
        </DialogHeader>
        <QRCodeDisplay 
          bot={bot} 
          onClose={() => setShowQRModal(false)}
          autoCloseOnAuth={true}
        />
      </DialogContent>
    </Dialog>
    </>
  );
}
