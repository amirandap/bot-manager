"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, MessageCircle, RefreshCw, QrCode } from "lucide-react"
import StatusIndicator from "./status-indicator"
import type { Bot } from "@/lib/types"
import Link from "next/link"

interface BotCardProps {
  bot: Bot
  onStart: () => void
  onStop: () => void
}

export default function BotCard({ bot, onStop }: BotCardProps) {

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
        <div className="flex items-center justify-between mb-4 flex-col">
          <div className="flex items-center gap-2">
            <StatusIndicator status={bot.status} />
            <span className="text-sm font-medium capitalize">{bot.status}</span>
          </div>
          <span className="text-xs text-muted-foreground">{bot.uptime ? `Uptime: ${bot.uptime}` : ""}</span>
          <span className="text-xs text-muted-foreground">Port: {bot.port}</span>
          <span className="text-xs text-muted-foreground">Root folder: {bot.rootFolder}</span>
          {bot.client?.pushname && (
            <>
            <span className="text-xs text-muted-foreground">
              Pushname: {bot.client.pushname}
            </span>
            <span className="text-xs text-muted-foreground">
              Wid: {bot.client.wid._serialized}
            </span>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full cursor-pointer"
            onClick={onStop}
            disabled={bot.status === "offline" || bot.status === "stopping"}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Restart
          </Button>
          <Button
            asChild
            size="sm"
            className="w-full cursor-pointer"
            disabled={bot.status === "offline" || bot.status === "stopping"}
          >
            <Link href={bot.QrCode} target="_blank">
            <QrCode className="h-4 w-4 mr-1" />
            Scan QR
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

