import { ScrollArea } from "@/components/ui/scroll-area"
import type { LogEntry } from "@/lib/types"

interface LogViewerProps {
  logs: LogEntry[]
}

export default function LogViewer({ logs }: LogViewerProps) {
  const getLogLevelClass = (level: string) => {
    switch (level.toLowerCase()) {
      case "error":
        return "text-red-500"
      case "warning":
        return "text-yellow-500"
      case "info":
        return "text-blue-500"
      default:
        return "text-gray-500"
    }
  }

  return (
    <ScrollArea className="h-[200px] w-full rounded border p-2 bg-muted/50">
      {logs && logs.length > 0 ? (
        <div className="space-y-1 font-mono text-xs">
          {logs.map((log, index) => (
            <div key={index} className="flex">
              <span className="text-muted-foreground mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className={`${getLogLevelClass(log.level)} mr-2`}>[{log.level.toUpperCase()}]</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm">No logs available</div>
      )}
    </ScrollArea>
  )
}

