"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  RefreshCw,
  QrCode,
  PlayCircle,
  RotateCcw,
  Plus,
  Trash2,
  Camera,
  Cpu,
  MemoryStick,
  Clock,
  AlertTriangle,
  Activity,
  Zap,
  Server,
  MessageCircle,
  Eye,
  Wifi,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Bot, BotStatus } from "@/lib/types";

interface HeadlessBotCardProps {
  bot: Bot;
  onUpdate?: (bot: Bot) => void;
  onDelete?: (botId: string) => void;
  onRefresh?: () => void;
}

interface ProcessState {
  state: "offline" | "not_found" | "running";
  pm2Status?: string;
}

// Extended PM2 interface to include custom metrics
interface ExtendedPM2Metrics {
  pid?: number;
  cpu?: number;
  memory?: number;
  restarts?: number;
  uptime?: number;
  lastRestart?: string;
  status?: string;
  activeHandles?: number;
  activeRequests?: number;
  eventLoopLatency?: number;
  heapUsage?: {
    used: number;
    total: number;
    percent: number;
  };
  errorCount?: number;
  httpRequests?: number;
  // Bot-specific custom metrics
  botStatus?: string;
  browserCpuUsage?: number;
  browserMemoryUsage?: number;
  messageProcessingTime?: number;
  qrCodeStatus?: string;
  qrCodesGenerated?: number;
  apiServerStatus?: number;
  whatsappStatus?: string;
}

export default function HeadlessBotCard({
  bot,
  onDelete,
  onRefresh,
}: HeadlessBotCardProps) {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Determine process state based on PM2 status
  const getProcessState = (): ProcessState => {
    if (!status?.pm2) {
      return { state: "not_found" };
    }

    const pm2 = status.pm2 as ExtendedPM2Metrics;
    if (pm2.pid && pm2.status === "online") {
      return { state: "running", pm2Status: pm2.status };
    }

    return { state: "offline", pm2Status: pm2.status };
  };

  // Get WhatsApp status from custom metrics
  const getWhatsAppStatus = (): string => {
    const pm2 = status?.pm2 as ExtendedPM2Metrics;
    return pm2?.whatsappStatus || "unknown";
  };

  // Fetch status information
  const fetchBotStatus = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(api.getBotStatusMetrics(bot.id), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const result = await response.json();
        const statusData = result.status || result;
        setStatus(statusData);
      } else {
        setStatus({
          id: bot.id,
          name: bot.name,
          type: bot.type,
          status: "offline",
          apiResponsive: false,
        });
      }
    } catch {
      console.error("Error fetching bot status");
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
  }, [bot.id, bot.name, bot.type]);

  // Action handlers with loading states
  const handleAction = async (
    actionKey: string,
    actionFn: () => Promise<void>
  ) => {
    setActionLoading((prev) => ({ ...prev, [actionKey]: true }));
    try {
      await actionFn();
      console.log(`Action completed: ${actionKey}`);
      setTimeout(() => {
        fetchBotStatus();
        onRefresh?.();
      }, 2000);
    } catch (error) {
      console.error(`Failed to ${actionKey}:`, error);
    } finally {
      setActionLoading((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleRestartProcess = () =>
    handleAction("restart", async () => {
      const response = await fetch(`${api.base}/api/bots/${bot.id}/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Restart failed");
    });

  const handleRecreateProcess = () =>
    handleAction("recreate", async () => {
      const response = await fetch(
        `${api.base}/api/bots/${bot.id}/pm2/recreate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) throw new Error("Recreate failed");
    });

  const handleCreateProcess = () =>
    handleAction("create", async () => {
      const response = await fetch(`${api.base}/api/bots/${bot.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Create failed");
    });

  const handleScanQR = async () => {
    if (bot.type !== "whatsapp") return;

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
                <button class="btn btn-primary" onclick="refreshQR()">🔄 Refresh</button>
                <button class="btn btn-secondary" onclick="window.close()">✕ Close</button>
              </div>
            </div>
            <script>
              async function fetchQRImage() {
                try {
                  const response = await fetch('${api.base}/api/bots/${bot.id}/qr-code/image');
                  return response.ok ? await response.blob() : null;
                } catch (error) {
                  return null;
                }
              }
              
              async function updateQR() {
                const statusEl = document.getElementById('status');
                const qrContainer = document.getElementById('qr-container');
                const qrImage = document.getElementById('qr-image');
                
                statusEl.className = 'status loading';
                statusEl.innerHTML = 'Loading QR code...';
                
                const imageBlob = await fetchQRImage();
                if (imageBlob) {
                  const imageUrl = URL.createObjectURL(imageBlob);
                  qrImage.src = imageUrl;
                  qrContainer.style.display = 'block';
                  statusEl.className = 'status success';
                  statusEl.innerHTML = '✅ QR Code ready to scan';
                } else {
                  statusEl.className = 'status error';
                  statusEl.innerHTML = '❌ Failed to load QR image';
                  qrContainer.style.display = 'none';
                }
              }
              
              function refreshQR() { updateQR(); }
              updateQR();
            </script>
          </body>
        </html>
      `);
      qrWindow.document.close();
    }
  };

  const handleRefreshStatus = () => {
    fetchBotStatus();
    onRefresh?.();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(bot.id);
    }
  };

  // Utility functions for badge colors based on semaphore rules
  const getBadgeVariant = (
    value: number | string | undefined,
    thresholds: { yellow?: number; red?: number; goodValues?: string[] }
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (value === undefined || value === null) return "outline";

    if (typeof value === "string") {
      if (thresholds.goodValues?.includes(value)) return "default";
      return "destructive";
    }

    if (typeof value === "number") {
      if (thresholds.red && value >= thresholds.red) return "destructive";
      if (thresholds.yellow && value >= thresholds.yellow) return "secondary";
      return "default";
    }

    return "outline";
  };

  const processState = getProcessState();
  const whatsappStatus = getWhatsAppStatus();
  const pm2Metrics = status?.pm2 as ExtendedPM2Metrics;

  useEffect(() => {
    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchBotStatus]);

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-green-600" />
            <CardTitle className="text-lg">Headless WhatsApp Bot</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                processState.state === "running"
                  ? "default"
                  : processState.state === "offline"
                  ? "secondary"
                  : "destructive"
              }
            >
              {processState.state}
            </Badge>
            {whatsappStatus && (
              <Badge
                variant={
                  whatsappStatus === "QR_READY" ? "default" : "outline"
                }
                className={
                  whatsappStatus === "QR_READY"
                    ? "bg-blue-500 hover:bg-blue-600"
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
          <h4 className="font-medium text-sm text-gray-700">Actions</h4>
          <div className="flex flex-wrap gap-2">
            {/* Process state specific buttons */}
            {processState.state === "offline" && (
              <>
                <Button
                  size="sm"
                  onClick={handleRestartProcess}
                  disabled={actionLoading.restart}
                  aria-label="Restart bot process"
                  aria-busy={actionLoading.restart}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {actionLoading.restart ? "Restarting..." : "Restart Process"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecreateProcess}
                  disabled={actionLoading.recreate}
                  aria-label="Recreate bot process"
                  aria-busy={actionLoading.recreate}
                >
                  <PlayCircle className="h-4 w-4 mr-1" />
                  {actionLoading.recreate
                    ? "Recreating..."
                    : "Recreate Process"}
                </Button>
              </>
            )}

            {processState.state === "not_found" && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                size="sm"
                onClick={handleCreateProcess}
                disabled={actionLoading.create}
                aria-label="Create bot process"
                aria-busy={actionLoading.create}
              >
                <Plus className="h-4 w-4 mr-1" />
                {actionLoading.create ? "Creating..." : "Create Bot Process"}
              </Button>
            )}

            {whatsappStatus === "QR_READY" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleScanQR}
                aria-label="Scan QR code"
              >
                <Camera className="h-4 w-4 mr-1" />
                Scan QR
              </Button>
            )}

            {/* Always visible buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshStatus}
              disabled={loading}
              aria-label="Refresh status"
              aria-busy={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`}
              />
              Refresh Status
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              aria-label="Delete bot"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>

        {/* Metrics Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700">Metrics</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {/* Bot Status */}
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Bot Status:</span>
              <Badge variant="outline" className="text-xs">
                {pm2Metrics?.botStatus || "Unknown"}
              </Badge>
            </div>

            {/* Browser CPU Usage */}
            <div className="flex items-center gap-2" title="Browser CPU usage. Yellow ≥80%, Red ≥95%">
              <Cpu className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">CPU:</span>
              <Badge
                variant={getBadgeVariant(pm2Metrics?.browserCpuUsage, {
                  yellow: 80,
                  red: 95,
                })}
                className="text-xs"
              >
                {pm2Metrics?.browserCpuUsage ?? 0}%
              </Badge>
            </div>

            {/* Browser Memory Usage */}
            <div className="flex items-center gap-2" title="Browser memory usage. Yellow ≥1GB, Red ≥2GB">
              <MemoryStick className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Memory:</span>
              <Badge
                variant={getBadgeVariant(pm2Metrics?.browserMemoryUsage, {
                  yellow: 1024,
                  red: 2048,
                })}
                className="text-xs"
              >
                {pm2Metrics?.browserMemoryUsage ?? 0}MB
              </Badge>
            </div>

            {/* Message Processing Time */}
            <div className="flex items-center gap-2" title="Message processing time. Yellow &gt;500ms, Red &gt;1000ms">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Proc Time:</span>
              <Badge
                variant={getBadgeVariant(pm2Metrics?.messageProcessingTime, {
                  yellow: 500,
                  red: 1000,
                })}
                className="text-xs"
              >
                {pm2Metrics?.messageProcessingTime ?? 0}ms
              </Badge>
            </div>

            {/* Error Count */}
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Errors:</span>
              <Badge
                variant={getBadgeVariant(pm2Metrics?.errorCount, { red: 1 })}
                className="text-xs"
              >
                {pm2Metrics?.errorCount ?? 0}
              </Badge>
            </div>

            {/* Messages Processed */}
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Messages:</span>
              <Badge variant="outline" className="text-xs">
                {pm2Metrics?.httpRequests ?? 0}
              </Badge>
            </div>

            {/* QR Code Status */}
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">QR Status:</span>
              <Badge
                variant={
                  pm2Metrics?.qrCodeStatus === "SCANME"
                    ? "default"
                    : "outline"
                }
                className={
                  pm2Metrics?.qrCodeStatus === "SCANME"
                    ? "bg-blue-500 hover:bg-blue-600 text-xs"
                    : "text-xs"
                }
              >
                {pm2Metrics?.qrCodeStatus || "Unknown"}
              </Badge>
            </div>

            {/* QR Codes Generated */}
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">QR Generated:</span>
              <Badge variant="outline" className="text-xs">
                {pm2Metrics?.qrCodesGenerated ?? 0}
              </Badge>
            </div>

            {/* API Server Status */}
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">API Server:</span>
              <Badge
                variant={
                  pm2Metrics?.apiServerStatus === 1 ? "default" : "destructive"
                }
                className="text-xs"
              >
                {pm2Metrics?.apiServerStatus === 1 ? "Up" : "Down"}
              </Badge>
            </div>

            {/* Event Loop Latency */}
            <div className="flex items-center gap-2" title="Event loop latency. Yellow &gt;10ms, Red &gt;40ms">
              <Zap className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Latency:</span>
              <Badge
                variant={getBadgeVariant(status?.pm2?.eventLoopLatency, {
                  yellow: 10,
                  red: 40,
                })}
                className="text-xs"
              >
                {Math.round(status?.pm2?.eventLoopLatency ?? 0)}ms
              </Badge>
            </div>

            {/* Active Handles */}
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Handles:</span>
              <Badge variant="outline" className="text-xs">
                {status?.pm2?.activeHandles ?? 0}
              </Badge>
            </div>

            {/* Active Requests */}
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Requests:</span>
              <Badge
                variant={
                  (status?.pm2?.activeRequests ?? 0) > 0
                    ? "secondary"
                    : "outline"
                }
                className="text-xs"
              >
                {status?.pm2?.activeRequests ?? 0}
              </Badge>
            </div>
          </div>
        </div>

        {/* Bot Info */}
        <div className="text-sm space-y-1 pt-2 border-t">
          <div className="flex justify-between">
            <span className="text-gray-600">Name:</span>
            <span>{bot.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Port:</span>
            <span>{bot.apiPort}</span>
          </div>
          {status?.pushName && (
            <div className="flex justify-between">
              <span className="text-gray-600">WhatsApp Name:</span>
              <span>{status.pushName}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
