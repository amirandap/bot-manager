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

  const getBotIcon = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
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

  const handleViewQR = () => {
    if (bot.type === "whatsapp") {
      // Create a form to POST to the backend proxy
      const form = document.createElement("form");
      form.method = "POST";
      form.action = `/api/bots/qr-code`;
      form.target = "_blank";

      const botIdInput = document.createElement("input");
      botIdInput.type = "hidden";
      botIdInput.name = "botId";
      botIdInput.value = bot.id;

      form.appendChild(botIdInput);
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
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
                bot.type.toLowerCase() === "discord" ? "default" : "outline"
              }
            >
              {bot.type}
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

          {bot.type === "whatsapp" && (
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
