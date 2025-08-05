// Export WhatsApp client from the main index file
import { Client } from 'whatsapp-web.js';

// This will be set by the main index.ts file
let whatsappClient: Client | null = null;

export const setClient = (client: Client | null) => {
    whatsappClient = client;
};

export const getClient = (): Client | null => {
    return whatsappClient;
};

// Legacy export for compatibility
export const client = {
    get instance(): Client | null {
        return whatsappClient;
    }
};

// Default export for compatibility with existing routes
export default whatsappClient;
