"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Trash2,
  QrCode,
  PlayCircle,
  RotateCcw,
  Settings,
  MessageSquare,
  Camera,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  Cpu,
  MemoryStick,
  Zap,
  Users,
  MessageCircle,
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

// Extended interface for bot metrics from PM2
interface BotMetrics extends BotStatus {
  pm2?: BotStatus["pm2"] & {
    // Bot-specific custom metrics
    botStatus?: string;
    browserCpuUsage?: number;
    browserMemoryUsage?: number;
    messageProcessingTime?: number;
    qrCodeStatus?: string;
    qrCodesGenerated?: number;
    apiServerStatus?: number;
    whatsappStatus?: string;
  };
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
    // Open QR display in new window/tab with enhanced interface
    const qrWindow = window.open(
      "",
      "_blank",
      "width=450,height=650,resizable=yes,scrollbars=yes"
    );
    if (qrWindow) {
      qrWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>WhatsApp QR Code - ${bot.name}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
                margin: 0; padding: 20px; background-color: #f5f5f5;
              }
              .container {
                max-width: 400px; margin: 0 auto; background: white;
                border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                overflow: hidden;
              }
              .header {
                background: #25D366; color: white; padding: 20px; text-align: center;
              }
              .content { padding: 20px; text-align: center; }
              .qr-container {
                margin: 20px 0; padding: 15px; border: 2px solid #25D366;
                border-radius: 8px; background: #f8f9fa;
              }
              .qr-image { max-width: 100%; height: auto; border-radius: 4px; }
              .status {
                margin: 15px 0; padding: 10px; border-radius: 6px; font-size: 14px;
              }
              .status.loading { background: #e3f2fd; color: #1976d2; }
              .status.error { background: #ffebee; color: #c62828; }
              .status.success { background: #e8f5e8; color: #2e7d32; }
              .btn {
                padding: 10px 20px; border: none; border-radius: 6px;
                cursor: pointer; font-size: 14px; margin: 5px;
              }
              .btn-primary { background: #25D366; color: white; }
              .btn-secondary { background: #6c757d; color: white; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">📱 WhatsApp QR Code</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">Bot: ${bot.name}</p>
              </div>
              <div class="content">
                <div id="status" class="status loading">Loading QR code...</div>
                <div id="qr-container" class="qr-container" style="display: none;">
                  <img id="qr-image" class="qr-image" alt="QR Code" />
                </div>
                <div>
                  <button class="btn btn-primary" onclick="refreshQR()">🔄 Refresh</button>
                  <button class="btn btn-secondary" onclick="window.close()">✕ Close</button>
                </div>
              </div>
            </div>
            <script>
              async function refreshQR() {
                try {
                  const response = await fetch('${api.proxy.getQRCodeImage(
                    bot.id
                  )}');
                  if (response.ok) {
                    const blob = await response.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    document.getElementById('qr-image').src = imageUrl;
                    document.getElementById('qr-container').style.display = 'block';
                    document.getElementById('status').className = 'status success';
                    document.getElementById('status').innerHTML = '✅ QR Code ready to scan';
                  }
                } catch (error) {
                  document.getElementById('status').className = 'status error';
                  document.getElementById('status').innerHTML = '❌ Error loading QR code';
                }
              }
              refreshQR();
            </script>
          </body>
        </html>
      `);
      qrWindow.document.close();
    }
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

  // Helper functions for metric styling
  const getMetricBadgeVariant = (
    metricType: string,
    value: number | string | undefined
  ): "default" | "destructive" | "secondary" | "outline" => {
    if (value === undefined || value === null) return "outline";

    switch (metricType) {
      case "errorCount":
        return typeof value === "number" && value > 0
          ? "destructive"
          : "default";
      case "browserCpuUsage":
        if (typeof value === "number") {
          if (value >= 95) return "destructive";
          if (value >= 80) return "secondary";
        }
        return "default";
      case "browserMemoryUsage":
        if (typeof value === "number") {
          if (value >= 2048) return "destructive";
          if (value >= 1024) return "secondary";
        }
        return "default";
      case "messageProcessingTime":
        if (typeof value === "number") {
          if (value > 1000) return "destructive";
          if (value > 500) return "secondary";
        }
        return "default";
      case "apiServerStatus":
        return typeof value === "number" && value === 0
          ? "destructive"
          : "default";
      case "eventLoopLatency":
        if (typeof value === "number") {
          if (value > 40) return "destructive";
          if (value > 10) return "secondary";
        }
        return "default";
      case "activeRequests":
        return typeof value === "number" && value > 0 ? "secondary" : "default";
      default:
        return "outline";
    }
  };

  const formatMetricValue = (
    metricType: string,
    value: number | string | undefined
  ): string => {
    if (value === undefined || value === null) return "N/A";

    switch (metricType) {
      case "browserCpuUsage":
        return `${value}%`;
      case "browserMemoryUsage":
        return `${value}MB`;
      case "messageProcessingTime":
        return `${value}ms`;
      case "eventLoopLatency":
        return `${typeof value === "number" ? Math.round(value) : value}ms`;
      case "apiServerStatus":
        return typeof value === "number" && value === 0 ? "Down" : "Up";
      default:
        return String(value);
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
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-green-600" />
            <CardTitle className="text-lg">{bot.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={processState === "running" ? "default" : "outline"}
              className={
                processState === "running"
                  ? "bg-green-100 text-green-800"
                  : processState === "offline"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }
            >
              {processState === "running"
                ? "Running"
                : processState === "offline"
                ? "Offline"
                : "Not Found"}
            </Badge>
            {whatsappStatus && (
              <Badge
                variant={whatsappStatus === "QR_READY" ? "default" : "outline"}
                className={
                  whatsappStatus === "QR_READY"
                    ? "bg-blue-100 text-blue-800"
                    : ""
                }
              >
                {whatsappStatus}
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

        {/* Metrics Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Metrics</h4>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Bot-specific metrics */}
            {metrics?.botStatus && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Bot Status</div>
                  <div className="text-sm font-medium truncate">
                    {metrics.botStatus}
                  </div>
                </div>
              </div>
            )}

            {metrics?.browserCpuUsage !== undefined && (
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Browser CPU</div>
                  <Badge
                    variant={getMetricBadgeVariant(
                      "browserCpuUsage",
                      metrics.browserCpuUsage
                    )}
                    className="text-xs"
                  >
                    {formatMetricValue(
                      "browserCpuUsage",
                      metrics.browserCpuUsage
                    )}
                  </Badge>
                </div>
              </div>
            )}

            {metrics?.browserMemoryUsage !== undefined && (
              <div className="flex items-center gap-2">
                <MemoryStick className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Browser Memory</div>
                  <Badge
                    variant={getMetricBadgeVariant(
                      "browserMemoryUsage",
                      metrics.browserMemoryUsage
                    )}
                    className="text-xs"
                  >
                    {formatMetricValue(
                      "browserMemoryUsage",
                      metrics.browserMemoryUsage
                    )}
                  </Badge>
                </div>
              </div>
            )}

            {metrics?.messageProcessingTime !== undefined && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Msg Process Time</div>
                  <Badge
                    variant={getMetricBadgeVariant(
                      "messageProcessingTime",
                      metrics.messageProcessingTime
                    )}
                    className="text-xs"
                  >
                    {formatMetricValue(
                      "messageProcessingTime",
                      metrics.messageProcessingTime
                    )}
                  </Badge>
                </div>
              </div>
            )}

            {metrics?.errorCount !== undefined && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Error Count</div>
                  <Badge
                    variant={getMetricBadgeVariant(
                      "errorCount",
                      metrics.errorCount
                    )}
                    className="text-xs"
                  >
                    {metrics.errorCount}
                  </Badge>
                </div>
              </div>
            )}

            {/* Messages Processed - renamed from httpRequests */}
            {metrics?.httpRequests !== undefined && (
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">
                    Messages Processed
                  </div>
                  <div className="text-sm font-medium">
                    {metrics.httpRequests}
                  </div>
                </div>
              </div>
            )}

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

            {metrics?.apiServerStatus !== undefined && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">API Server</div>
                  <Badge
                    variant={getMetricBadgeVariant(
                      "apiServerStatus",
                      metrics.apiServerStatus
                    )}
                    className="text-xs"
                  >
                    {formatMetricValue(
                      "apiServerStatus",
                      metrics.apiServerStatus
                    )}
                  </Badge>
                </div>
              </div>
            )}

            {metrics?.eventLoopLatency !== undefined && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Event Loop</div>
                  <Badge
                    variant={getMetricBadgeVariant(
                      "eventLoopLatency",
                      metrics.eventLoopLatency
                    )}
                    className="text-xs"
                  >
                    {formatMetricValue(
                      "eventLoopLatency",
                      metrics.eventLoopLatency
                    )}
                  </Badge>
                </div>
              </div>
            )}

            {metrics?.activeHandles !== undefined && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Active Handles</div>
                  <div className="text-sm font-medium">
                    {metrics.activeHandles}
                  </div>
                </div>
              </div>
            )}

            {metrics?.activeRequests !== undefined && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">Active Requests</div>
                  <Badge
                    variant={getMetricBadgeVariant(
                      "activeRequests",
                      metrics.activeRequests
                    )}
                    className="text-xs"
                  >
                    {metrics.activeRequests}
                  </Badge>
                </div>
              </div>
            )}

            {/* Basic system metrics */}
            {metrics?.cpu !== undefined && (
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">System CPU</div>
                  <div className="text-sm font-medium">{metrics.cpu}%</div>
                </div>
              </div>
            )}

            {metrics?.memory !== undefined && (
              <div className="flex items-center gap-2">
                <MemoryStick className="h-4 w-4 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500">System Memory</div>
                  <div className="text-sm font-medium">{metrics.memory}MB</div>
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
            {bot.phoneNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span>{bot.phoneNumber}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
