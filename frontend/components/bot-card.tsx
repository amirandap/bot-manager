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
      // 🚀 PRIMARY: Use PM2 metrics-based status (recommended)
      const response = await fetch(api.getBotStatusMetrics(bot.id), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        const statusData: BotStatus = result.status || result;

        // If we have lifecycle data in the response, use it for status
        // This prioritizes the bot's own lifecycle state over PM2 status
        if (statusData.lifecycle && statusData.lifecycle.currentState) {
          // Override the status with lifecycle state for more detailed status
          statusData.status = statusData.lifecycle
            .currentState as BotStatus["status"];
        }

        setStatus(statusData);
      } else {
        // PM2 metrics failed, fallback to proxy (legacy API)
        console.warn("PM2 metrics failed, falling back to proxy API");
        throw new Error("PM2 metrics not available");
      }
    } catch (error) {
      console.error("PM2 metrics failed, trying proxy fallback:", error);

      // 📦 FALLBACK: Use legacy proxy API if PM2 metrics fail
      try {
        const fallbackResponse = await fetch(api.proxy.getBotStatus(bot.id), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (fallbackResponse.ok) {
          const statusData: BotStatus = await fallbackResponse.json();

          // If we have lifecycle data in the response, use it for status
          if (statusData.lifecycle && statusData.lifecycle.currentState) {
            statusData.status = statusData.lifecycle
              .currentState as BotStatus["status"];
          }

          setStatus(statusData);
          console.log("✅ Proxy fallback successful");
        } else {
          console.error("Both PM2 and proxy APIs failed");
          // Set a default offline status based on bot config
          setStatus({
            id: bot.id,
            name: bot.name,
            type: bot.type,
            status: "offline",
            apiResponsive: false,
          });
        }
      } catch (fallbackError) {
        console.error("Proxy fallback also failed:", fallbackError);
        // Set a default offline status based on bot config
        setStatus({
          id: bot.id,
          name: bot.name,
          type: bot.type,
          status: "offline",
          apiResponsive: false,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [bot.id, bot.name, bot.type]);

  const handleViewQR = async () => {
    const safeType = typeof bot.type === "string" ? bot.type.toLowerCase() : "";
    if (safeType === "whatsapp") {
      // Open QR display in new window/tab
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
                  margin: 0;
                  padding: 20px;
                  background-color: #f5f5f5;
                }
                .container {
                  max-width: 400px;
                  margin: 0 auto;
                  background: white;
                  border-radius: 12px;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                  overflow: hidden;
                }
                .header {
                  background: #25D366;
                  color: white;
                  padding: 20px;
                  text-align: center;
                }
                .content {
                  padding: 20px;
                  text-align: center;
                }
                .qr-container {
                  margin: 20px 0;
                  padding: 15px;
                  border: 2px solid #25D366;
                  border-radius: 8px;
                  background: #f8f9fa;
                }
                .qr-image {
                  max-width: 100%;
                  height: auto;
                  border-radius: 4px;
                }
                .status {
                  margin: 15px 0;
                  padding: 10px;
                  border-radius: 6px;
                  font-size: 14px;
                }
                .status.loading {
                  background: #e3f2fd;
                  color: #1976d2;
                }
                .status.error {
                  background: #ffebee;
                  color: #c62828;
                }
                .status.success {
                  background: #e8f5e8;
                  color: #2e7d32;
                }
                .status.warning {
                  background: #fff3e0;
                  color: #f57c00;
                }
                .timer {
                  margin: 10px 0;
                  font-family: monospace;
                  font-size: 16px;
                  font-weight: bold;
                }
                .progress-bar {
                  width: 100%;
                  height: 6px;
                  background: #e0e0e0;
                  border-radius: 3px;
                  overflow: hidden;
                  margin: 10px 0;
                }
                .progress-fill {
                  height: 100%;
                  background: #25D366;
                  transition: width 0.3s ease;
                }
                .buttons {
                  margin-top: 20px;
                  display: flex;
                  gap: 10px;
                  justify-content: center;
                }
                .btn {
                  padding: 10px 20px;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  font-size: 14px;
                  transition: background-color 0.2s;
                }
                .btn-primary {
                  background: #25D366;
                  color: white;
                }
                .btn-primary:hover {
                  background: #1ea952;
                }
                .btn-secondary {
                  background: #6c757d;
                  color: white;
                }
                .btn-secondary:hover {
                  background: #5a6268;
                }
                .spinner {
                  border: 2px solid #f3f3f3;
                  border-top: 2px solid #25D366;
                  border-radius: 50%;
                  width: 20px;
                  height: 20px;
                  animation: spin 1s linear infinite;
                  display: inline-block;
                  margin-right: 8px;
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                .instructions {
                  margin-top: 20px;
                  padding: 15px;
                  background: #e3f2fd;
                  border-radius: 6px;
                  font-size: 12px;
                  color: #1976d2;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0;">📱 WhatsApp QR Code</h2>
                  <p style="margin: 5px 0 0 0; opacity: 0.9;">Bot: ${bot.name}</p>
                </div>
                <div class="content">
                  <div id="status" class="status loading">
                    <div class="spinner"></div>
                    Loading QR code...
                  </div>
                  <div id="qr-container" class="qr-container" style="display: none;">
                    <img id="qr-image" class="qr-image" alt="QR Code" />
                    <div id="timer" class="timer"></div>
                    <div class="progress-bar">
                      <div id="progress-fill" class="progress-fill" style="width: 100%;"></div>
                    </div>
                  </div>
                  <div class="buttons">
                    <button class="btn btn-primary" onclick="refreshQR()">🔄 Refresh</button>
                    <button class="btn btn-secondary" onclick="toggleAutoRefresh()" id="auto-btn">⏸️ Stop Auto</button>
                    <button class="btn btn-secondary" onclick="window.close()">✕ Close</button>
                  </div>
                  <div class="instructions">
                    <strong>📱 How to scan:</strong><br>
                    Open WhatsApp → Settings → Linked Devices → Link a Device → Scan QR Code
                  </div>
                </div>
              </div>

              <script>
                let autoRefreshInterval;
                let isAutoRefreshing = true;
                let timeRemaining = 0;
                let timerInterval;

                async function fetchQRStatus() {
                  try {
                    const response = await fetch('/api/bots/${bot.id}/qr-code/status');
                    return response.ok ? await response.json() : null;
                  } catch (error) {
                    console.error('Error fetching QR status:', error);
                    return null;
                  }
                }

                async function fetchQRImage() {
                  try {
                    const response = await fetch('/api/bots/${bot.id}/qr-code/image');
                    return response.ok ? await response.blob() : null;
                  } catch (error) {
                    console.error('Error fetching QR image:', error);
                    return null;
                  }
                }

                async function updateQR() {
                  const statusEl = document.getElementById('status');
                  const qrContainer = document.getElementById('qr-container');
                  const qrImage = document.getElementById('qr-image');

                  try {
                    const status = await fetchQRStatus();
                    
                    if (!status) {
                      statusEl.className = 'status error';
                      statusEl.innerHTML = '❌ Failed to load QR status';
                      qrContainer.style.display = 'none';
                      return;
                    }

                    if (!status.qrCode.available) {
                      statusEl.className = 'status warning';
                      statusEl.innerHTML = '⚠️ QR Code not available<br><small>Bot may be starting up or already connected</small>';
                      qrContainer.style.display = 'none';
                      return;
                    }

                    if (status.qrCode.expired) {
                      statusEl.className = 'status error';
                      statusEl.innerHTML = '⏰ QR Code expired<br><small>Please restart the bot to generate a new QR code</small>';
                      qrContainer.style.display = 'none';
                      return;
                    }

                    const imageBlob = await fetchQRImage();
                    if (imageBlob) {
                      const imageUrl = URL.createObjectURL(imageBlob);
                      qrImage.src = imageUrl;
                      qrContainer.style.display = 'block';
                      statusEl.className = 'status success';
                      statusEl.innerHTML = '✅ QR Code ready to scan';

                      // Start countdown timer
                      if (status.qrCode.createdAt) {
                        const createdAt = new Date(status.qrCode.createdAt);
                        const expiresAt = new Date(createdAt.getTime() + 2 * 60 * 1000);
                        timeRemaining = Math.max(0, expiresAt.getTime() - Date.now());
                        startTimer();
                      }
                    } else {
                      statusEl.className = 'status error';
                      statusEl.innerHTML = '❌ Failed to load QR image';
                      qrContainer.style.display = 'none';
                    }
                  } catch (error) {
                    statusEl.className = 'status error';
                    statusEl.innerHTML = '❌ Error: ' + error.message;
                    qrContainer.style.display = 'none';
                  }
                }

                function startTimer() {
                  if (timerInterval) clearInterval(timerInterval);
                  
                  timerInterval = setInterval(() => {
                    timeRemaining = Math.max(0, timeRemaining - 1000);
                    
                    const minutes = Math.floor(timeRemaining / 60000);
                    const seconds = Math.floor((timeRemaining % 60000) / 1000);
                    
                    document.getElementById('timer').textContent = 
                      minutes > 0 ? \`\${minutes}:\${seconds.toString().padStart(2, '0')}\` : \`\${seconds}s\`;
                    
                    const percentage = Math.max(0, (timeRemaining / (2 * 60 * 1000)) * 100);
                    document.getElementById('progress-fill').style.width = percentage + '%';
                    
                    if (timeRemaining <= 0) {
                      clearInterval(timerInterval);
                      updateQR(); // Refresh when expired
                    }
                  }, 1000);
                }

                function refreshQR() {
                  document.getElementById('status').className = 'status loading';
                  document.getElementById('status').innerHTML = '<div class="spinner"></div>Refreshing...';
                  updateQR();
                }

                function toggleAutoRefresh() {
                  const btn = document.getElementById('auto-btn');
                  if (isAutoRefreshing) {
                    clearInterval(autoRefreshInterval);
                    btn.textContent = '▶️ Start Auto';
                    isAutoRefreshing = false;
                  } else {
                    autoRefreshInterval = setInterval(updateQR, 5000);
                    btn.textContent = '⏸️ Stop Auto';
                    isAutoRefreshing = true;
                  }
                }

                // Initial load and auto-refresh setup
                updateQR();
                autoRefreshInterval = setInterval(updateQR, 5000);

                // Cleanup on page unload
                window.addEventListener('beforeunload', () => {
                  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
                  if (timerInterval) clearInterval(timerInterval);
                });
              </script>
            </body>
          </html>
        `);
        qrWindow.document.close();
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

            {/* Bot Lifecycle information */}
            {status?.lifecycle && (
              <div className="pt-2 border-t border-gray-200 mt-2">
                <div className="font-medium text-gray-700">Lifecycle:</div>
                <div>
                  State:{" "}
                  <span className="font-medium">
                    {status.lifecycle.currentState}
                  </span>
                </div>

                {status.lifecycle.lastStateChange && (
                  <div className="mt-1">
                    <div>
                      Changed:{" "}
                      {new Date(
                        status.lifecycle.lastStateChange.timestamp
                      ).toLocaleTimeString()}
                    </div>
                    {status.lifecycle.lastStateChange.details && (
                      <div className="text-gray-500 italic">
                        {status.lifecycle.lastStateChange.details}
                      </div>
                    )}
                    {status.lifecycle.lastStateChange.error && (
                      <div className="text-red-500 font-medium">
                        {status.lifecycle.lastStateChange.error}
                      </div>
                    )}
                  </div>
                )}

                {status.lifecycle.stateHistory &&
                  status.lifecycle.stateHistory.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-blue-500 hover:text-blue-700">
                        State History
                      </summary>
                      <div className="mt-1 pl-2 border-l-2 border-gray-200 max-h-32 overflow-y-auto">
                        {status.lifecycle.stateHistory.map((event, idx) => (
                          <div
                            key={idx}
                            className="mb-1 pb-1 border-b border-gray-100"
                          >
                            <div className="flex justify-between">
                              <span className="font-medium">{event.state}</span>
                              <span className="text-gray-400">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            {event.details && (
                              <div className="text-gray-500 text-xs">
                                {event.details}
                              </div>
                            )}
                            {event.error && (
                              <div className="text-red-500 text-xs">
                                {event.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
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

          {typeof bot.type === "string" &&
            bot.type.toLowerCase() === "whatsapp" && (
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
