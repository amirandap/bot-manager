"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import type { Bot, BotStatus } from "@/lib/types";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface BotCardProps {
  bot: Bot;
  onUpdate?: (bot: Bot) => void;
  onDelete?: (botId: string) => void;
}

export default function BotCard({ bot, onUpdate, onDelete }: BotCardProps) {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(false);

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

  const fetchBotStatus = useCallback(async () => {
    setLoading(true);
    try {
      // Use GET endpoint with bot ID in URL
      const response = await fetch(api.proxy.getBotStatus(bot.id), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const statusData: BotStatus = await response.json();
        setStatus(statusData);
      }
    } catch (error) {
      console.error("Failed to fetch bot status:", error);
    } finally {
      setLoading(false);
    }
  }, [bot.id]);

  const handleViewQR = async () => {
    const safeType = typeof bot.type === "string" ? bot.type.toLowerCase() : "";
    if (safeType === "whatsapp") {
      try {
        // Get QR code data with JSON response
        const response = await fetch(`/api/bots/${bot.id}/qr-code`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        const qrData = await response.json();
        
        if (response.ok && qrData.success) {
          if (qrData.status === 'available') {
            // QR code is available, display it in a new window
            const qrWindow = window.open('', '_blank', 'width=400,height=500');
            if (qrWindow) {
              qrWindow.document.write(`
                <html>
                  <head>
                    <title>WhatsApp QR Code</title>
                    <style>
                      body { 
                        font-family: Arial, sans-serif; 
                        padding: 20px; 
                        text-align: center; 
                        background-color: #f5f5f5;
                      }
                      .container {
                        background: white;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        max-width: 350px;
                        margin: 0 auto;
                      }
                      .qr-image {
                        max-width: 280px;
                        border: 2px solid #25D366;
                        border-radius: 10px;
                        margin: 20px 0;
                      }
                      .expires {
                        color: #666;
                        font-size: 12px;
                        margin: 10px 0;
                      }
                      .button {
                        background-color: #25D366;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 5px;
                        font-size: 14px;
                      }
                      .button:hover {
                        background-color: #1ea952;
                      }
                      .button.secondary {
                        background-color: #6c757d;
                      }
                      .button.secondary:hover {
                        background-color: #5a6268;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="container">
                      <h2 style="color: #25D366; margin-bottom: 10px;">📱 Scan QR Code</h2>
                      <p style="color: #333; margin-bottom: 20px;">
                        Scan this QR code with your WhatsApp mobile app
                      </p>
                      <img src="data:image/png;base64,${qrData.qrCode}" alt="QR Code" class="qr-image" />
                      <div class="expires">
                        Generated: ${new Date(qrData.generatedAt).toLocaleString()}<br>
                        Expires in: ${qrData.expiresIn} minute(s)
                      </div>
                      <button class="button" onclick="window.location.reload()">
                        🔄 Refresh QR Code
                      </button>
                      <button class="button secondary" onclick="window.close()">
                        ✕ Close
                      </button>
                    </div>
                  </body>
                </html>
              `);
            }
          } else if (qrData.status === 'connected') {
            alert(`✅ Bot Already Connected\n\nThis WhatsApp bot is already connected.\nPhone: ${qrData.phoneNumber || 'Unknown'}`);
          }
        } else {
          // Handle different error states
          let message = 'QR Code not available';
          
          if (qrData.status === 'expired') {
            message = `⏰ QR Code Expired\n\n${qrData.message}\n\nPlease restart the bot to generate a new QR code.`;
          } else if (qrData.status === 'not_available') {
            message = `⚠️ ${qrData.message}\n\nPossible reasons:\n${qrData.reasons?.join('\n• ') || 'Unknown'}`;
          } else {
            message = qrData.message || 'Unknown error occurred';
          }
          
          alert(message);
        }
      } catch (error) {
        console.error('Error fetching QR code:', error);
        alert('❌ Failed to fetch QR code. Please try again.');
      }
    }
  };

  useEffect(() => {
    fetchBotStatus();
    // Poll for status updates every 30 seconds
    const interval = setInterval(fetchBotStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchBotStatus]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
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
                (typeof bot.type === "string" && bot.type.toLowerCase() === "discord") ? "default" : "outline"
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
        <div className="flex items-center justify-between mb-4 flex-col space-y-2">
          <div className="flex items-center gap-2">
            <StatusIndicator
              status={status?.status || "unknown"}
              botStatus={status || undefined}
              showDetails={false}
            />
            <span className="text-sm font-medium capitalize">
              {status?.status || "Loading..."}
            </span>
            {status?.apiResponsive === false && (
              <span className="text-xs text-red-500">(API Down)</span>
            )}
          </div>

          <div className="text-xs text-muted-foreground space-y-1 w-full">
            <div>API Host: {bot.apiHost}</div>
            <div>Port: {bot.apiPort}</div>
            {!bot.isExternal && bot.pm2ServiceId && (
              <div>PM2 Service: {bot.pm2ServiceId}</div>
            )}
            {bot.phoneNumber && <div>Phone: {bot.phoneNumber}</div>}
            {bot.pushName && <div>Push Name: {bot.pushName}</div>}
            <div>Created: {formatDate(bot.createdAt)}</div>
            {status?.lastSeen && (
              <div>Last Seen: {new Date(status.lastSeen).toLocaleString()}</div>
            )}

            {/* Enhanced PM2 Information - only for internal bots */}
            {!bot.isExternal && status?.pm2 && (
              <div className="pt-2 border-t border-gray-200">
                <div className="font-medium text-gray-700">Process Info:</div>
                {status.pm2.pid && <div>PID: {status.pm2.pid}</div>}
                {status.pm2.cpu !== undefined && (
                  <div>CPU: {status.pm2.cpu}%</div>
                )}
                {status.pm2.memory !== undefined && (
                  <div>Memory: {status.pm2.memory}MB</div>
                )}
                {status.pm2.restarts !== undefined && (
                  <div>Restarts: {status.pm2.restarts}</div>
                )}
                {status.pm2.uptime !== undefined && (
                  <div>
                    Uptime: {Math.floor(status.pm2.uptime / 1000 / 60)}m
                  </div>
                )}
                {status.apiResponseTime && (
                  <div>API Response: {status.apiResponseTime}ms</div>
                )}
              </div>
            )}
          </div>
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

          {(typeof bot.type === "string" && bot.type.toLowerCase() === "whatsapp") && (
            <Button
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              onClick={handleViewQR}
            >
              <QrCode className="h-4 w-4 mr-1" />
              View QR Code
            </Button>
          )}

          {onUpdate && (
            <Button
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              onClick={() => onUpdate(bot)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}

          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              className="w-full cursor-pointer"
              onClick={() => onDelete(bot.id)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
