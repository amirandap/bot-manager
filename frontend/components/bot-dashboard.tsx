"use client"

import { useEffect, useState } from "react"
import BotCard from "./bot-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Bot } from "@/lib/types"

export default function BotDashboard() {
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchBotStatuses = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/bots")

      if (!response.ok) {
        throw new Error(`Failed to fetch bot statuses: ${response.status}`)
      }

      const data = await response.json()
      setBots(data)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Error fetching bot statuses:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch bot statuses")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBotStatuses()

    // Set up polling interval (every 10 seconds)
    const intervalId = setInterval(fetchBotStatuses, 10000)

    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }, [])

  const handleBotAction = async (botId: string, action: "start" | "stop") => {
    try {
      setError(null)

      const response = await fetch(`/api/bots/${botId}/${action}`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} bot: ${response.status}`)
      }

      // Refresh bot statuses after action
      fetchBotStatuses()
    } catch (err) {
      console.error(`Error ${action}ing bot:`, err)
      setError(err instanceof Error ? err.message : `Failed to ${action} bot`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground" suppressHydrationWarning>
          {lastUpdated && <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchBotStatuses}
          disabled={loading}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {bots.map((bot, index) => (
          <BotCard
            key={index}
            bot={{ ...bot, type: 'Whatsapp', id: index.toString(), name: `WhatsApp Bot ${index + 1}` }}
            onStart={() => handleBotAction(bot.id, "start")}
            onStop={() => handleBotAction(bot.id, "stop")}
          />
        ))}

        {!loading && bots.length === 0 && !error && (
          <div className="col-span-2 text-center py-12 text-muted-foreground">
            No bots found. Please check your API configuration.
          </div>
        )}
      </div>
    </div>
  )
}

