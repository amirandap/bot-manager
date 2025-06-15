"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Server,
  RotateCw,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Bot } from "@/lib/types";

interface PM2StatusData {
  isExternal: boolean;
  pm2ServiceId?: string;
  pm2Status:
    | "online"
    | "stopped"
    | "errored"
    | "unknown"
    | "external"
    | "no-service"
    | "error";
  pm2Details?: {
    status: "online" | "stopped" | "errored" | "unknown";
    pid?: number;
    cpu?: number;
    memory?: number;
    restarts?: number;
    uptime?: number;
    lastRestart?: string;
  };
  message?: string;
}

interface PM2StatusIndicatorProps {
  bot: Bot;
  onStatusChange?: () => void;
}

export default function PM2StatusIndicator({
  bot,
  onStatusChange,
}: PM2StatusIndicatorProps) {
  const [pm2Status, setPM2Status] = useState<PM2StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPM2Status = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(api.getBotPM2Status(bot.id));
      if (response.ok) {
        const data: PM2StatusData = await response.json();
        setPM2Status(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(
          errorData.error || `Failed to fetch PM2 status: ${response.status}`
        );
      }
    } catch (err) {
      console.error("Failed to fetch PM2 status:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch PM2 status"
      );
    } finally {
      setLoading(false);
    }
  }, [bot.id]);

  const handleRestartPM2 = async () => {
    if (!pm2Status || pm2Status.isExternal) return;

    setActionLoading("restart");
    setError(null);

    try {
      const response = await fetch(api.restartBotPM2(bot.id), {
        method: "POST",
      });

      if (response.ok) {
        await fetchPM2Status(); // Refresh status
        onStatusChange?.(); // Notify parent to refresh
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(
          errorData.error || `Failed to restart PM2 service: ${response.status}`
        );
      }
    } catch (err) {
      console.error("Failed to restart PM2 service:", err);
      setError(
        err instanceof Error ? err.message : "Failed to restart PM2 service"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecreatePM2 = async () => {
    if (!pm2Status || pm2Status.isExternal) return;

    setActionLoading("recreate");
    setError(null);

    try {
      const response = await fetch(api.recreateBotPM2(bot.id), {
        method: "POST",
      });

      if (response.ok) {
        await fetchPM2Status(); // Refresh status
        onStatusChange?.(); // Notify parent to refresh
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(
          errorData.error ||
            `Failed to recreate PM2 service: ${response.status}`
        );
      }
    } catch (err) {
      console.error("Failed to recreate PM2 service:", err);
      setError(
        err instanceof Error ? err.message : "Failed to recreate PM2 service"
      );
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchPM2Status();
  }, [fetchPM2Status]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "stopped":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "errored":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "external":
        return <Server className="h-4 w-4 text-blue-500" />;
      case "no-service":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "online":
        return "default" as const;
      case "stopped":
        return "destructive" as const;
      case "errored":
        return "destructive" as const;
      case "external":
        return "secondary" as const;
      case "no-service":
        return "outline" as const;
      case "error":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  const formatUptime = (uptime?: number) => {
    if (!uptime) return "Unknown";
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  if (!pm2Status) {
    return (
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">PM2 Status</span>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>
        <Badge variant="outline">Loading...</Badge>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* PM2 Status Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          {getStatusIcon(pm2Status.pm2Status)}
          <span className="text-sm font-medium">PM2 Status</span>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(pm2Status.pm2Status)}>
            {pm2Status.pm2Status.toUpperCase()}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPM2Status}
            disabled={loading}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* PM2 Details */}
      {pm2Status.pm2Details && (
        <div className="text-xs text-muted-foreground space-y-1 px-3">
          <div className="grid grid-cols-2 gap-2">
            {pm2Status.pm2Details.pid && (
              <div>PID: {pm2Status.pm2Details.pid}</div>
            )}
            {pm2Status.pm2Details.cpu !== undefined && (
              <div>CPU: {pm2Status.pm2Details.cpu}%</div>
            )}
            {pm2Status.pm2Details.memory !== undefined && (
              <div>Memory: {pm2Status.pm2Details.memory}MB</div>
            )}
            {pm2Status.pm2Details.restarts !== undefined && (
              <div>Restarts: {pm2Status.pm2Details.restarts}</div>
            )}
            {pm2Status.pm2Details.uptime !== undefined && (
              <div className="col-span-2">
                Uptime: {formatUptime(pm2Status.pm2Details.uptime)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Service ID */}
      {pm2Status.pm2ServiceId && (
        <div className="px-3 text-xs text-muted-foreground">
          Service: {pm2Status.pm2ServiceId}
        </div>
      )}

      {/* PM2 Management Buttons */}
      {!pm2Status.isExternal && pm2Status.pm2Status !== "no-service" && (
        <div className="flex gap-2 px-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleRestartPM2}
            disabled={actionLoading !== null}
          >
            {actionLoading === "restart" ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Restart
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleRecreatePM2}
            disabled={actionLoading !== null}
          >
            {actionLoading === "recreate" ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <RotateCw className="h-3 w-3 mr-1" />
            )}
            Recreate
          </Button>
        </div>
      )}

      {/* Message */}
      {pm2Status.message && (
        <div className="px-3 text-xs text-muted-foreground italic">
          {pm2Status.message}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mx-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
