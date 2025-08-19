"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from         setTimeout(() => {
          onRefresh?.()
        }, 2000)omponents/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  RotateCcw,
  Trash2,
  RefreshCw,
  Monitor,
  Clock,
  AlertTriangle,
  QrCode,
  Copy,
  Maximize2,
  MoreHorizontal,
} from "lucide-react"
import type { Bot } from "@/lib/types"
import { useState, useCallback, useEffect } from "react"
import { api } from "@/lib/api"
import QRCodeDisplay from "@/components/qr-code-display"
import { useBotStatus } from "@/lib/contexts/BotsStatusContext"

interface HeadlessBotCardProps {
  bot: Bot
  onUpdate?: (bot: Bot) => void
  onDelete?: (botId: string) => void
  onRefresh?: () => void
}

type ProcessState = "offline" | "not_found" | "running"

type StatusType = "online" | "offline" | "starting" | "error" | "idle" | "qr_required" | "degraded"

export default function HeadlessBotCard({ bot, onDelete, onRefresh }: HeadlessBotCardProps) {
  const botStatus = useBotStatus(bot.id); // Use context instead of local state
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showQrModal, setShowQrModal] = useState(false)

  const getDisplayStatus = (): { type: StatusType; label: string; color: string } => {
    if (!botStatus || !botStatus.pm2) {
      return { type: "offline", label: "Offline", color: "bg-red-500" }
    }

    const whatsappStatus = botStatus.pm2.whatsappStatus
    const processState = getProcessState()

    if (whatsappStatus === "QR_READY") {
      return { type: "qr_required", label: "QR Required", color: "bg-orange-500" }
    }

    if (processState === "running") {
      if (whatsappStatus === "AUTHENTICATED") {
        const cpuUsage = botStatus.pm2.cpu || 0
        const memoryUsage = botStatus.pm2.memory || 0
        const errorCount = botStatus.pm2.errorCount || 0

        if (errorCount > 0) {
          return { type: "error", label: "Error", color: "bg-red-500" }
        }
        if (cpuUsage > 80 || memoryUsage > 800) {
          return { type: "degraded", label: "Degraded", color: "bg-orange-500" }
        }
        if (cpuUsage < 5 && memoryUsage < 100) {
          return { type: "idle", label: "Idle", color: "bg-green-500" }
        }
        return { type: "online", label: "Online", color: "bg-green-500" }
      }
      return { type: "starting", label: "Starting", color: "bg-orange-500" }
    }

    return { type: "offline", label: "Offline", color: "bg-red-500" }
  }

  const getStatusMessage = (): string => {
    const displayStatus = getDisplayStatus()
    const metrics = botStatus?.pm2

    switch (displayStatus.type) {
      case "offline":
        return "Servicio detenido"
      case "starting":
        return "Iniciando Chrome..."
      case "error":
        return "Se requiere reautenticación"
      case "idle":
        return "En espera..."
      case "qr_required":
        return "QR listo para escanear"
      case "degraded":
        return metrics?.cpu && metrics.cpu > 80 ? "Latencia alta" : "Heap alto"
      case "online":
        return "Launching Chrome"
      default:
        return "Proceso detenido"
    }
  }

  const formatUptime = (uptime: number): string => {
    if (uptime < 60) return "0m"
    if (uptime < 3600) return `${Math.floor(uptime / 60)}m`
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`
  }

  const getProcessState = (): ProcessState => {
    if (!botStatus || !botStatus.pm2) return "not_found"
    if (botStatus.pm2.pid && botStatus.status === "online") return "running"
    return "offline"
  }

  const processState = getProcessState()
  const whatsappStatus = botStatus?.pm2?.whatsappStatus

  const fetchQRStatus = useCallback(async () => {
    if (bot.type !== "whatsapp") return
    // QR status now comes from context, no need to fetch separately
  }, [bot.type])

  // Bot status comes automatically from the global context
  // No need for manual fetching

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
          fetchBotStatus()
          onRefresh?.()
        }, 3000)
      }
    } catch (error) {
      console.error("Error recreating bot:", error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateBotProcess = async () => {
    setActionLoading("create")
    try {
      const response = await fetch(api.base + `/api/bots/${bot.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (response.ok) {
        setTimeout(() => {
          onRefresh?.()
        }, 2000)
      }
    } catch (error) {
      console.error("Error creating bot process:", error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleScanQR = async () => {
    setShowQrModal(true)
  }

  const handleRefreshStatus = async () => {
    setActionLoading("refresh")
    await fetchBotStatus()
    onRefresh?.()
    setActionLoading(null)
  }

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete bot "${bot.name}"?`)) {
      onDelete?.(bot.id)
    }
  }

  useEffect(() => {
    fetchBotStatus()
    const interval = setInterval(fetchBotStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchBotStatus])

  const metrics = status?.pm2
  const displayStatus = getDisplayStatus()

  return (
    <Card className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${displayStatus.color}`} />
            <div>
              <h3 className="font-semibold text-gray-900">{bot.name}</h3>
              <p className="text-sm text-gray-500">{metrics?.clientPhoneNumber || bot.phoneNumber || "Bot Ventas"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${displayStatus.color} text-white border-0 text-xs px-2 py-1`}>
              {displayStatus.label}
            </Badge>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">CPU</span>
            <span className="text-sm font-medium">{metrics?.cpu || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(metrics?.cpu || 0, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Heap</span>
            <span className="text-sm font-medium">{Math.round((metrics?.memory || 0) / 10)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                (metrics?.memory || 0) > 800 ? "bg-red-500" : "bg-green-500"
              }`}
              style={{ width: `${Math.min((metrics?.memory || 0) / 10, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{metrics?.uptime ? formatUptime(metrics.uptime) : "0m"} uptime</span>
          </div>
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{metrics?.restarts || 0} restarts</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">req 0</span>
            <span className="text-gray-600">pid {metrics?.pid || "—"}</span>
          </div>

          <div className="flex items-center gap-2">
            {displayStatus.type === "offline" && <span className="text-red-600">✕</span>}
            {displayStatus.type === "starting" && <span className="text-orange-600">—</span>}
            {displayStatus.type === "error" && <span className="text-red-600">✕</span>}
            {displayStatus.type === "idle" && <span className="text-green-600">—</span>}
            {displayStatus.type === "qr_required" && <QrCode className="h-4 w-4 text-orange-600" />}
            {displayStatus.type === "online" && <span className="text-green-600">—</span>}
            {displayStatus.type === "degraded" && <span className="text-orange-600">—</span>}
            <span className="text-sm text-gray-700">{getStatusMessage()}</span>
          </div>

          {displayStatus.type === "qr_required" && (
            <div className="text-center py-8">
              <QrCode className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">Escanea el QR</p>
              <Button variant="outline" size="sm" onClick={handleScanQR} className="text-xs bg-transparent">
                <QrCode className="h-3 w-3 mr-1" />
                QR listo para escanear
              </Button>
              <p className="text-xs text-gray-500 mt-2">Esperando QR</p>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Chrome CPU</span>
            </div>
            <span className="text-gray-600">{metrics?.browserCpuUsage || 0}%</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Chrome Mem</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-200 rounded-full h-1">
                <div
                  className="bg-green-500 h-1 rounded-full"
                  style={{ width: `${Math.min((metrics?.browserMemoryUsage || 0) / 10, 100)}%` }}
                />
              </div>
              <span className="text-gray-600">{metrics?.browserMemoryUsage || 0}MB</span>
            </div>
          </div>
        </div>

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

        <div className="flex gap-2 pt-2">
          {processState === "offline" && (
            <Button size="sm" onClick={handleRestartProcess} disabled={actionLoading === "restart"} className="flex-1">
              {actionLoading === "restart" ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Reiniciar"}
            </Button>
          )}

          {processState === "not_found" && (
            <Button size="sm" onClick={handleCreateBotProcess} disabled={actionLoading === "create"} className="flex-1">
              {actionLoading === "create" ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Crear Proceso"}
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleRefreshStatus} disabled={actionLoading === "refresh"}>
            <RefreshCw className={`h-4 w-4 ${actionLoading === "refresh" ? "animate-spin" : ""}`} />
          </Button>

          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md">
          <QRCodeDisplay
            bot={bot}
            onClose={() => setShowQrModal(false)}
            autoRefresh={true}
            refreshInterval={3000}
            autoCloseOnAuth={true}
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}
