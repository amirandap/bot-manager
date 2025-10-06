"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  RotateCcw,
  Trash2,
  RefreshCw,
  Monitor,
  Clock,
  AlertTriangle,
  QrCode,
  Maximize2,
  Tag,
} from "lucide-react"
import type { Bot } from "@/lib/types"
import { useState, useCallback } from "react"
import { api } from "@/lib/api"
import QRCodeDisplay from "@/components/qr-code-display"
import { useBotStatus } from "@/lib/contexts/BotsStatusContext"

interface HeadlessBotCardProps {
  bot: Bot
  onUpdate?: (bot: Bot) => void
  onDelete?: (botId: string) => void
  onRefresh?: () => void
}

type StatusType = "online" | "offline" | "starting" | "error" | "idle" | "qr_required" | "degraded"

export default function HeadlessBotCard({ bot, onDelete, onRefresh }: HeadlessBotCardProps) {
  const botStatus = useBotStatus(bot.id); // Use context instead of local state
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)

  const getDisplayStatus = (): { type: StatusType; label: string; color: string } => {
    // PM2 is the single source of truth - if no bot status, it's offline
    if (!botStatus) {
      return { type: "offline", label: "Offline", color: "bg-red-500" }
    }

    // Use the backend status which is now derived from PM2
    const backendStatus = botStatus.status
    
    // For external bots (no PM2 data), use backend status directly
    if (botStatus.isExternal || !botStatus.pm2) {
      switch (backendStatus) {
        case "online":
          return { type: "online", label: "Online", color: "bg-green-500" }
        case "error":
          return { type: "error", label: "Error", color: "bg-red-500" }
        case "spawning":
          return { type: "starting", label: "Starting", color: "bg-orange-500" }
        case "stopped":
          return { type: "offline", label: "Offline", color: "bg-red-500" }
        default:
          return { type: "offline", label: "Unknown", color: "bg-gray-500" }
      }
    }

    // For PM2-managed bots, enhance status with PM2 metrics
    const pm2Metrics = botStatus.pm2
    const whatsappStatus = pm2Metrics.whatsappStatus
    const qrCodeStatus = pm2Metrics.qrCodeStatus
    const errorCount = pm2Metrics.errorCount || 0

    // If there are active errors, show error status
    if (errorCount > 0) {
      return { type: "error", label: "Error", color: "bg-red-500" }
    }

    // Backend status is derived from PM2, so use it as base
    switch (backendStatus) {
      case "online":
        // For WhatsApp bots, check for special states
        if (bot.type === "whatsapp") {
          // QR code needs to be scanned
          if (qrCodeStatus === "QR_READY" || qrCodeStatus === "SCANME" || qrCodeStatus === "SCANNED" || whatsappStatus === "QR_READY") {
            return { type: "qr_required", label: "QR Required", color: "bg-orange-500" }
          }

          // Check for performance issues
          const cpuUsage = pm2Metrics.cpu || 0
          const heapUsage = pm2Metrics.heapUsage || 0
          
          if (cpuUsage > 80 || heapUsage > 90) {
            return { type: "degraded", label: "Degraded", color: "bg-orange-500" }
          }
          
          // Check if bot is actively working vs idle
          if (cpuUsage < 5 && heapUsage < 50) {
            return { type: "idle", label: "Idle", color: "bg-green-500" }
          }
        }
        
        return { type: "online", label: "Online", color: "bg-green-500" }

      case "error":
        return { type: "error", label: "Error", color: "bg-red-500" }

      case "spawning":
        return { type: "starting", label: "Starting", color: "bg-orange-500" }

      case "stopped":
        return { type: "offline", label: "Offline", color: "bg-red-500" }

      default:
        return { type: "offline", label: "Unknown", color: "bg-gray-500" }
    }
  }

  const getStatusMessage = (): string => {
    const displayStatus = getDisplayStatus()
    
    // If no bot status, show basic message
    if (!botStatus) {
      return "Sin conexión"
    }

    // Use backend status message when available (derived from PM2)
    if (botStatus.statusMessage) {
      switch (displayStatus.type) {
        case "error":
          return "Se requiere atención"
        case "qr_required":
          return "QR listo para escanear"
        case "degraded":
          const pm2Metrics = botStatus.pm2
          return pm2Metrics?.cpu && pm2Metrics.cpu > 80 ? "CPU alta" : "Memoria alta"
        default:
          return botStatus.statusMessage
      }
    }

    // Fallback to PM2 bot status if available
    const pm2BotStatus = botStatus.pm2?.botStatus
    if (pm2BotStatus) {
      return pm2BotStatus
    }

    // Default messages based on display status
    switch (displayStatus.type) {
      case "offline":
        return "Servicio detenido"
      case "starting":
        return "Iniciando servicio..."
      case "error":
        return "Se requiere atención"
      case "idle":
        return "En espera..."
      case "qr_required":
        return "QR listo para escanear"
      case "degraded":
        return "Rendimiento degradado"
      case "online":
        return "Operativo"
      default:
        return "Estado desconocido"
    }
  }

  const formatUptime = (uptime: number): string => {
    // Backend sends uptime in milliseconds, convert to seconds first
    const uptimeSeconds = Math.floor(uptime / 1000)
    
    if (uptimeSeconds < 60) return "0m"
    if (uptimeSeconds < 3600) return `${Math.floor(uptimeSeconds / 60)}m`
    const hours = Math.floor(uptimeSeconds / 3600)
    const minutes = Math.floor((uptimeSeconds % 3600) / 60)
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`
  }

  const handleRestartProcess = async () => {
    setActionLoading("restart")
    try {
      const response = await fetch(api.restartBotPM2(bot.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        setTimeout(() => {
          onRefresh?.()
        }, 2000)
      }
    } catch (error) {
      console.error("Error restarting bot:", error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRecreateProcess = async () => {
    setActionLoading("recreate")
    try {
      const response = await fetch(api.recreateBotPM2(bot.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        setTimeout(() => {
          onRefresh?.()
        }, 2000)
      }
    } catch (error) {
      console.error("Error recreating bot:", error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteBot = async () => {
    if (!confirm(`Are you sure you want to delete ${bot.name}?`)) return

    try {
      setActionLoading("delete")
      await onDelete?.(bot.id)
    } catch (error) {
      console.error("Error deleting bot:", error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleScanQR = useCallback(async () => {
    // QR scanning logic using context data
    if (bot.type === "whatsapp" && (
      botStatus?.pm2?.qrCodeStatus === "QR_READY" || 
      botStatus?.pm2?.qrCodeStatus === "SCANME" ||
      botStatus?.pm2?.qrCodeStatus === "SCANNED" ||
      botStatus?.pm2?.whatsappStatus === "QR_READY"
    )) {
      setShowQrModal(true)
    }
  }, [bot.type, botStatus?.pm2?.qrCodeStatus, botStatus?.pm2?.whatsappStatus])

  const displayStatus = getDisplayStatus()
  const metrics = botStatus?.pm2

  return (
    <>
      <Card className="border border-gray-200 hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${displayStatus.color}`} />
              <div>
                <h3 className="font-semibold text-gray-900">{bot.name}</h3>
                <p className="text-sm text-gray-500">{bot.type}</p>
              </div>
            </div>
            <Badge variant={displayStatus.type === "online" ? "default" : "secondary"}>
              {displayStatus.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">{getStatusMessage()}</p>

            {/* Phone Number Display */}
            {botStatus?.pm2?.clientPhoneNumber && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">📱</span>
                <span className="font-mono text-gray-700">{botStatus.pm2.clientPhoneNumber}</span>
              </div>
            )}

            {/* Push Name Display */}
            {botStatus?.pm2?.clientPushName && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">👤</span>
                <span className="text-gray-700">{botStatus.pm2.clientPushName}</span>
              </div>
            )}
          </div>

          {/* PM2 Metrics */}
          {metrics && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className="text-gray-600">CPU</span>
                </div>
                <span className="font-medium">{metrics.cpu?.toFixed(1) || 0}%</span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-gray-600">RAM</span>
                </div>
                <span className="font-medium">{Math.round(metrics.memory || 0)}MB</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">Uptime</span>
                <span className="font-medium">{formatUptime(metrics.uptime || 0)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <RotateCcw className="h-3 w-3 text-gray-400" />
                <span className="text-gray-600">Restarts</span>
                <span className="font-medium">{metrics.restarts || 0}</span>
              </div>
              
              {metrics.botVersion && (
                <div className="flex items-center gap-2">
                  <Tag className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-600">Version</span>
                  <span className="font-medium">{metrics.botVersion}</span>
                </div>
              )}
            </div>
          )}

          {/* QR Code Section */}
          {bot.type === "whatsapp" && displayStatus.type === "qr_required" && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
              <p className="text-lg font-medium text-gray-700 mb-2">Escanea el QR</p>
              <Button variant="outline" size="sm" onClick={handleScanQR} className="text-xs bg-transparent">
                <QrCode className="h-3 w-3 mr-1" />
                QR listo para escanear
              </Button>
              <p className="text-xs text-gray-500 mt-2">Esperando QR</p>
            </div>
          )}

          {/* Bot Custom Metrics */}
          {metrics && bot.type === "whatsapp" && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Bot Metrics</h4>
              
              {/* Bot Status & WhatsApp Status */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {metrics.botStatus && (
                  <div className="flex flex-col">
                    <span className="text-gray-500">Bot Status</span>
                    <span className="font-medium text-gray-700">{metrics.botStatus}</span>
                  </div>
                )}
                {metrics.whatsappStatus && (
                  <div className="flex flex-col">
                    <span className="text-gray-500">WhatsApp</span>
                    <span className="font-medium text-gray-700">{metrics.whatsappStatus}</span>
                  </div>
                )}
              </div>

              {/* QR Code & API Status */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {metrics.qrCodeStatus && (
                  <div className="flex flex-col">
                    <span className="text-gray-500">QR Status</span>
                    <span className="font-medium text-gray-700">{metrics.qrCodeStatus}</span>
                  </div>
                )}
                {metrics.apiServerStatus && (
                  <div className="flex flex-col">
                    <span className="text-gray-500">API Server</span>
                    <span className="font-medium text-gray-700">{metrics.apiServerStatus}</span>
                  </div>
                )}
              </div>

              {/* Message Processing */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {metrics.messagesProcessed !== undefined && (
                  <div className="flex flex-col">
                    <span className="text-gray-500">Messages</span>
                    <span className="font-medium text-gray-700">{metrics.messagesProcessed}</span>
                  </div>
                )}
                {metrics.messageProcessingTime !== undefined && (
                  <div className="flex flex-col">
                    <span className="text-gray-500">Proc. Time</span>
                    <span className="font-medium text-gray-700">{metrics.messageProcessingTime}ms</span>
                  </div>
                )}
              </div>

              {/* Error Count & QR Codes Generated */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {metrics.errorCount !== undefined && (
                  <div className="flex flex-col">
                    <span className="text-gray-500">Errors</span>
                    <span className={`font-medium ${metrics.errorCount > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                      {metrics.errorCount}
                    </span>
                  </div>
                )}
                {metrics.qrCodesGenerated !== undefined && (
                  <div className="flex flex-col">
                    <span className="text-gray-500">QR Generated</span>
                    <span className="font-medium text-gray-700">{metrics.qrCodesGenerated}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Browser Metrics */}
          {metrics && (metrics.browserCpuUsage || metrics.browserMemoryUsage) && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Browser Metrics</h4>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Chrome CPU</span>
                </div>
                <span className="text-gray-600">{metrics.browserCpuUsage || 0}%</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Chrome Mem</span>
                </div>
                <span className="text-gray-600">{metrics.browserMemoryUsage || 0}MB</span>
              </div>
            </div>
          )}

          {/* Error States */}
          {displayStatus.type === "error" && (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">Se requiere reautenticación</span>
            </div>
          )}

          {displayStatus.type === "degraded" && (
            <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-700">{(metrics?.cpu || 0) > 80 ? "Latencia alta" : "Heap alto"}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRestartProcess}
              disabled={actionLoading === "restart"}
              className="flex-1"
            >
              {actionLoading === "restart" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              <span className="ml-1">Restart</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRecreateProcess}
              disabled={actionLoading === "recreate"}
              className="flex-1"
            >
              {actionLoading === "recreate" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
              <span className="ml-1">Recreate</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteBot}
              disabled={actionLoading === "delete"}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {actionLoading === "delete" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      {showQrModal && (
        <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
          <DialogContent className="sm:max-w-md">
            <QRCodeDisplay 
              bot={{ ...bot, id: bot.id }} 
              onClose={() => {
                setShowQrModal(false)
                onRefresh?.()
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
