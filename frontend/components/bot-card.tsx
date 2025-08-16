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
} from "lucide-react";
import StatusIndicator from "./status-indicator";
import PM2StatusIndicator from "./pm2-status-indicator";
import QRCodeDisplay from "./qr-code-display";
import type { Bot } from "@/lib/types";
import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useBotStatus, useBotPM2Metrics, useBotHealth } from "@/lib/contexts/BotsStatusContext";

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
  // Use unified context instead of individual hooks
  const botStatus = useBotStatus(bot.id);
  const pm2Metrics = useBotPM2Metrics(bot.id);
  const health = useBotHealth(bot.id);

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
        setQrStatus(qrData.qrCode || qrData);
      } else {
        setQrStatus({ available: false });
      }
    } catch (error) {
      console.error("❌ Error fetching QR status:", error);
      setQrStatus({ available: false });
    }
  }, [bot.id, bot.type]);

  const handleViewQR = async () => {
    const safeType = typeof bot.type === "string" ? bot.type.toLowerCase() : "";
    if (safeType !== "whatsapp") return;

    try {
      setLoading(true);
      await fetchQRStatus();
      setShowQRModal(true);
    } catch (error) {
      console.error("Error viewing QR:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    try {
      setLoading(true);
      const response = await fetch(api.restartBotPM2(bot.id), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        if (onUpdate) {
          onUpdate(bot);
        }
      }
    } catch (error) {
      console.error("Error restarting bot:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete bot "${bot.name}"? This action cannot be undone.`
    );

    if (confirmDelete) {
      try {
        setLoading(true);
        const response = await fetch(api.deleteBot(bot.id), {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          onDelete(bot.id);
        }
      } catch (error) {
        console.error("Error deleting bot:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusText = () => {
    if (!botStatus) return "Unknown";
    
    // Check if we have custom WhatsApp status from PM2 metrics
    if (pm2Metrics?.whatsappStatus) {
      return pm2Metrics.whatsappStatus;
    }
    
    return botStatus.status || "Unknown";
  };

  const getStatusVariant = () => {
    if (!botStatus) return "secondary";
    
    const status = botStatus.status;
    switch (status) {
      case "online":
        return "default";
      case "errored":
        return "destructive";
      case "stopped":
        return "secondary";
      case "launching":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {getBotIcon(bot.type)}
            {bot.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant()}>
              {getStatusText()}
            </Badge>
            {health && (
              <Badge 
                variant={
                  health.status === "healthy" ? "default" : 
                  health.status === "warning" ? "outline" : 
                  "destructive"
                }
              >
                Health: {health.score}%
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Basic Bot Info */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Port:</span>
              <Badge variant="outline">{bot.apiPort}</Badge>
            </div>

            {/* Status Indicators */}
            <div className="space-y-2">
              <StatusIndicator
                status={botStatus?.status || "unknown"}
              />
              
              {/* PM2 Metrics */}
              {!bot.isExternal && pm2Metrics && (
                <div className="text-xs text-muted-foreground">
                  CPU: {pm2Metrics.cpu}%, MEM: {pm2Metrics.memory}MB, 
                  Restarts: {pm2Metrics.restarts}, 
                  Uptime: {Math.floor((pm2Metrics.uptime || 0) / 60000)}m
                  {pm2Metrics.activeHandles && `, Handles: ${pm2Metrics.activeHandles}`}
                  {pm2Metrics.eventLoopLatency && `, Latency: ${pm2Metrics.eventLoopLatency}ms`}
                  {pm2Metrics.errorCount && `, Errors: ${pm2Metrics.errorCount}`}
                </div>
              )}

              {/* WhatsApp Specific Metrics */}
              {bot.type === "whatsapp" && pm2Metrics && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {pm2Metrics.qrCodeStatus && (
                    <div>QR Status: {pm2Metrics.qrCodeStatus}</div>
                  )}
                  {pm2Metrics.messagesProcessed !== undefined && (
                    <div>Messages: {pm2Metrics.messagesProcessed}</div>
                  )}
                  {pm2Metrics.qrCodesGenerated !== undefined && (
                    <div>QR Codes: {pm2Metrics.qrCodesGenerated}</div>
                  )}
                  {pm2Metrics.botStatus && (
                    <div>Bot Status: {pm2Metrics.botStatus}</div>
                  )}
                </div>
              )}

              {!bot.isExternal && (
                <PM2StatusIndicator 
                  bot={bot}
                />
              )}
            </div>

            {/* Phone Info */}
            {(bot.phoneNumber || botStatus?.pushName) && (
              <div className="space-y-1">
                {bot.phoneNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Phone:</span>
                    <span className="text-sm">{bot.phoneNumber}</span>
                  </div>
                )}
                {botStatus?.pushName && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm">{botStatus.pushName}</span>
                  </div>
                )}
              </div>
            )}

            {/* Health Issues */}
            {health?.issues && health.issues.length > 0 && (
              <div className="space-y-1">
                <span className="text-sm font-medium text-orange-600">Issues:</span>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {health.issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {bot.type === "whatsapp" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewQR}
                  disabled={loading}
                  className="flex items-center gap-1"
                >
                  <QrCode className="h-3 w-3" />
                  QR Code
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleRestart}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Restart
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                className="flex items-center gap-1"
              >
                <Settings className="h-3 w-3" />
                Settings
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>WhatsApp QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code with WhatsApp to connect your bot.
            </DialogDescription>
          </DialogHeader>
          {qrStatus && (
            <QRCodeDisplay
              bot={bot}
              onClose={() => setShowQRModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
