"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Square, MessageSquare, MessageCircle } from "lucide-react"
import StatusIndicator from "./status-indicator"
import type { Bot } from "@/lib/types"

interface BotCardProps {
  bot: Bot
  onStart: () => void
  onStop: () => void
}

export default function BotCard({ bot, onStart, onStop }: BotCardProps) {

  const getBotIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "discord":
        return <MessageCircle className="h-5 w-5" />
      case "whatsapp":
        return <MessageSquare className="h-5 w-5" />
      default:
        return <MessageSquare className="h-5 w-5" />
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getBotIcon(bot.type)}
            <CardTitle>{bot.name}</CardTitle>
          </div>
          <Badge variant={bot.type.toLowerCase() === "discord" ? "default" : "outline"}>{bot.type}</Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StatusIndicator status={bot.status} />
            <span className="text-sm font-medium capitalize">{bot.status}</span>
          </div>
          <span className="text-xs text-muted-foreground">{bot.uptime ? `Uptime: ${bot.uptime}` : ""}</span>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={onStart}
            disabled={bot.status === "online" || bot.status === "starting"}
          >
            <Play className="h-4 w-4 mr-1" />
            Start
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onStop}
            disabled={bot.status === "offline" || bot.status === "stopping"}
          >
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

