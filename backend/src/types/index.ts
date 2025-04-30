export interface Bot {
    id: string
    name: string
    type: string
    status: string
    uptime: string | null
    port: number | string
    rootFolder: string
    QrCode: string
    client: {
      wid: {
        _serialized: string
        user: string
        server: string
      }
      pushname: string
    }
}

export interface Bots {
    discord: Bot[];
    whatsapp: Bot[];
}