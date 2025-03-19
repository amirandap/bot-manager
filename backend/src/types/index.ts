export interface Bot {
    id: string;
    name: string;
    status: 'online' | 'offline';
    type: string;
    uptime: string | null
}

export interface Bots {
    discord: Bot[];
    whatsapp: Bot[];
}