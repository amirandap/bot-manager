"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw,
  Settings,
  Trash2,
  RefreshCw,
  Cpu,
  Monitor,
  Activity,
  MessageSquare,
  PlayCircle,
  Camera,
  Clock,
  AlertTriangle,
  QrCode,
  Zap,
} from "lucide-react";
import type { Bot, BotStatus } from "@/lib/types";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface HeadlessBotCardProps {
  bot: Bot;
  onUpdate?: (bot: Bot) => void;
  onDelete?: (botId: string) => void;
  onRefresh?: () => void;
}

// Extended interface for bot metrics from PM2 - now dynamic
interface BotMetrics extends BotStatus {
  pm2?: BotStatus["pm2"]; // Use the updated dynamic PM2 interface
}

type ProcessState = "offline" | "not_found" | "running";

export default function HeadlessBotCard({
  bot,
  onDelete,
  onRefresh,
}: HeadlessBotCardProps) {
  const [status, setStatus] = useState<BotMetrics | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Determine process state based on PM2 status
  const getProcessState = (): ProcessState => {
    if (!status || !status.pm2) return "not_found";
    if (status.pm2.pid && status.status === "online") return "running";
    return "offline";
  };

  const processState = getProcessState();
  const whatsappStatus = status?.pm2?.whatsappStatus;

  // Fetch QR code status for WhatsApp bots
  const fetchQRStatus = useCallback(async () => {
    if (bot.type !== "whatsapp") return;
    // QR status fetching logic can be added here if needed
  }, [bot.type]);

  const fetchBotStatus = useCallback(async () => {
    try {
      // Use PM2 metrics endpoint for complete custom metrics
      const response = await fetch(api.getBotStatus(bot.id), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        setStatus(result);

        // Also fetch QR status for WhatsApp bots
        if (bot.type === "whatsapp") {
          fetchQRStatus();
        }
      } else {
        // Set status to indicate bot is not running
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
          },
        });
      }
    } catch (error) {
      console.error("PM2 metrics failed:", error);
      setStatus({
        id: bot.id,
        name: bot.name,
        type: bot.type,
        status: "offline",
        apiResponsive: false,
      });
    } finally {
      // Cleanup after fetching
    }
  }, [bot.id, bot.name, bot.type, fetchQRStatus]);

  // Action handlers
  const handleRestartProcess = async () => {
    setActionLoading("restart");
    try {
      const response = await fetch(api.restartBotPM2(bot.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        setTimeout(() => {
          fetchBotStatus();
          onRefresh?.();
        }, 2000);
      }
    } catch (error) {
      console.error("Error restarting bot:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecreateProcess = async () => {
    setActionLoading("recreate");
    try {
      const response = await fetch(api.recreateBotPM2(bot.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        setTimeout(() => {
          fetchBotStatus();
          onRefresh?.();
        }, 3000);
      }
    } catch (error) {
      console.error("Error recreating bot:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateBotProcess = async () => {
    setActionLoading("create");
    try {
      const response = await fetch(api.base + `/api/bots/${bot.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        setTimeout(() => {
          fetchBotStatus();
          onRefresh?.();
        }, 2000);
      }
    } catch (error) {
      console.error("Error creating bot process:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleScanQR = async () => {
    // Only execute this in browser environment
    if (typeof window === 'undefined') return;
    
    // Create a minimal popup URL with QR code
    const qrUrl = api.proxy.getQRCodeImage(bot.id);
    const popupUrl = `${api.base}/qr-popup?bot=${encodeURIComponent(bot.name)}&qr=${encodeURIComponent(qrUrl)}`;
    
    // Open QR window
    window.open(
      popupUrl,
      "_blank",
      "width=450,height=650,resizable=yes,scrollbars=yes"
    );
  };

  const handleRefreshStatus = async () => {
    setActionLoading("refresh");
    await fetchBotStatus();
    onRefresh?.();
    setActionLoading(null);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete bot "${bot.name}"?`)) {
      onDelete?.(bot.id);
    }
  };

  useEffect(() => {
    fetchBotStatus();
    // Poll for status updates every 30 seconds
    const interval = setInterval(fetchBotStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchBotStatus]);

  const metrics = status?.pm2;

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-6 w-6 text-green-600" />
              <CardTitle className="text-lg">{bot.name}</CardTitle>
            </div>

            {/* Client Information - Dynamic from PM2 metrics */}
            {(metrics?.clientPhoneNumber || metrics?.clientPushName) && (
              <div className="flex flex-wrap gap-2 ml-9">
                {metrics.clientPhoneNumber &&
                  metrics.clientPhoneNumber !== "0" && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-md">
                      <span className="text-xs font-medium text-green-700">
                        📱
                      </span>
                      <span className="text-xs font-mono text-green-800">
                        {metrics.clientPhoneNumber}
                      </span>
                    </div>
                  )}
                {metrics.clientPushName && metrics.clientPushName !== "0" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-md">
                    <span className="text-xs font-medium text-blue-700">
                      👤
                    </span>
                    <span className="text-xs font-medium text-blue-800">
                      {metrics.clientPushName}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={whatsappStatus === "QR_READY" ? "default" : "outline"}
              className={
                whatsappStatus === "QR_READY"
                  ? "bg-blue-100 text-blue-800"
                  : whatsappStatus === "AUTHENTICATED"
                  ? "bg-green-100 text-green-800"
                  : whatsappStatus === "DISCONNECTED"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }
            >
              {whatsappStatus || "Unknown"}
            </Badge>
            {processState !== "running" && (
              <Badge
                variant="outline"
                className={
                  processState === "offline"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }
              >
                {processState === "offline" ? "PM2 Offline" : "PM2 Not Found"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Actions Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Actions</h4>
          <div className="flex flex-wrap gap-2">
            {/* Process state actions */}
            {processState === "offline" && (
              <>
                <Button
                  size="sm"
                  onClick={handleRestartProcess}
                  disabled={actionLoading === "restart"}
                  aria-label="Restart Process"
                  aria-busy={actionLoading === "restart"}
                >
                  {actionLoading === "restart" ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Restart Process
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecreateProcess}
                  disabled={actionLoading === "recreate"}
                  aria-label="Recreate Process"
                  aria-busy={actionLoading === "recreate"}
                >
                  {actionLoading === "recreate" ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="h-4 w-4 mr-2" />
                  )}
                  Recreate Process
                </Button>
              </>
            )}

            {processState === "not_found" && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                size="sm"
                onClick={handleCreateBotProcess}
                disabled={actionLoading === "create"}
                aria-label="Create Bot Process"
                aria-busy={actionLoading === "create"}
              >
                {actionLoading === "create" ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                Create Bot Process
              </Button>
            )}

            {/* QR action */}
            {whatsappStatus === "QR_READY" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleScanQR}
                aria-label="Scan QR Code"
              >
                <Camera className="h-4 w-4 mr-2" />
                Scan QR
              </Button>
            )}

            {/* Always visible actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshStatus}
              disabled={actionLoading === "refresh"}
              aria-label="Refresh Status"
              aria-busy={actionLoading === "refresh"}
            >
              {actionLoading === "refresh" ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Status
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              aria-label="Delete Bot"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Metrics Section - 3x3 Grid */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Metrics</h4>
          <div className="grid grid-cols-3 gap-3">
            {/* Row 1: CPU */}
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-gray-500" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 font-medium">CPU</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">System CPU</div>
                <div className="text-sm font-medium">
                  {metrics?.cpu !== undefined ? `${metrics.cpu}%` : "N/A"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">Memory</div>
                <div className="text-sm font-medium">
                  {metrics?.memory !== undefined
                    ? `${metrics.memory}MB`
                    : "N/A"}
                </div>
              </div>
            </div>

            {/* Row 2: Browser */}
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-gray-500" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 font-medium">Browser</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">CPU Usage</div>
                <div className="text-sm font-medium">
                  {metrics?.browserCpuUsage !== undefined
                    ? `${metrics.browserCpuUsage}%`
                    : "N/A"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">Memory Usage</div>
                <div className="text-sm font-medium">
                  {metrics?.browserMemoryUsage !== undefined
                    ? `${metrics.browserMemoryUsage}MB`
                    : "N/A"}
                </div>
              </div>
            </div>

            {/* Row 3: Metrics */}
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 font-medium">Metrics</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">Event Loop</div>
                <div className="text-sm font-medium">
                  {metrics?.eventLoopLatency !== undefined
                    ? typeof metrics.eventLoopLatency === "number"
                      ? `${Math.round(metrics.eventLoopLatency)}ms`
                      : `${metrics.eventLoopLatency}ms`
                    : "N/A"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">Active Req</div>
                <div className="text-sm font-medium">
                  {metrics?.activeRequests !== undefined
                    ? `${metrics.activeRequests}`
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Metrics - Individual rows */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {/* Restarts */}
            {metrics?.restarts !== undefined && (
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Restarts</div>
                  <div className="text-sm font-medium">{metrics.restarts}</div>
                </div>
              </div>
            )}

            {/* Uptime */}
            {metrics?.uptime !== undefined && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Uptime</div>
                  <div className="text-sm font-medium">
                    {typeof metrics.uptime === "number"
                      ? `${Math.floor(metrics.uptime / 3600)}h ${Math.floor(
                          (metrics.uptime % 3600) / 60
                        )}m`
                      : metrics.uptime}
                  </div>
                </div>
              </div>
            )}

            {/* Message Processing Time (Latency) */}
            {metrics?.messageProcessingTime !== undefined && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Latency</div>
                  <div className="text-sm font-medium">
                    {metrics.messageProcessingTime}ms
                  </div>
                </div>
              </div>
            )}

            {/* Error Count */}
            {metrics?.errorCount !== undefined && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Error Count</div>
                  <div className="text-sm font-medium text-red-600">
                    {metrics.errorCount}
                  </div>
                </div>
              </div>
            )}

            {/* QR Code Status */}
            {metrics?.qrCodeStatus && (
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">QR Status</div>
                  <div className="text-sm font-medium">
                    {metrics.qrCodeStatus}
                  </div>
                </div>
              </div>
            )}

            {/* QR Codes Generated */}
            {metrics?.qrCodesGenerated !== undefined && (
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">QR Generated</div>
                  <div className="text-sm font-medium">
                    {metrics.qrCodesGenerated}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bot Info */}
        <div className="pt-3 border-t border-gray-200">
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Port:</span>
              <span>{bot.apiPort}</span>
            </div>

            {/* Dynamic client info from PM2 metrics */}
            {metrics?.clientPhoneNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600">Client Phone:</span>
                <span className="font-mono text-xs">
                  {metrics.clientPhoneNumber}
                </span>
              </div>
            )}

            {metrics?.clientPushName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Client Name:</span>
                <span>{metrics.clientPushName}</span>
              </div>
            )}

            {/* Fallback to bot config if dynamic metrics not available */}
            {!metrics?.clientPhoneNumber && bot.phoneNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600">Phone (Config):</span>
                <span className="font-mono text-xs">{bot.phoneNumber}</span>
              </div>
            )}

            {!metrics?.clientPushName && bot.pushName && (
              <div className="flex justify-between">
                <span className="text-gray-600">Name (Config):</span>
                <span>{bot.pushName}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
