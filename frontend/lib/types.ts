export interface LogEntry {
  timestamp: string
  level: string
  message: string
}

export interface Bot {
  id: string
  name: string
  type: string
  status: string
  uptime: string | null
  port: number | string
  rootFolder: string
  QrCode: string
}

