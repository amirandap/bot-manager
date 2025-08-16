export interface MetricDefinition {
  name: string;
  type: 'meter' | 'counter' | 'histogram' | 'metric';
  id: string;
  unit?: string;
}

export const METRICS: Record<string, MetricDefinition> = {
  WHATSAPP_CONNECTIONS: {
    name: 'WhatsApp Connections',
    type: 'meter',
    id: 'whatsapp/connections'
  },
  WHATSAPP_STATUS: {
    name: 'WhatsApp Status',
    type: 'metric',
    id: 'whatsapp/status',
    unit: 'state'
  },
  API_SERVER_STATUS: {
    name: 'API Server Status',
    type: 'metric',
    id: 'api/server-status',
    unit: 'state'
  },
  QR_CODES: {
    name: 'QR Codes Generated',
    type: 'counter',
    id: 'whatsapp/qrcodes'
  },
  QR_STATUS: {
    name: 'QR Code Status',
    type: 'metric',
    id: 'whatsapp/qr-status',
    unit: 'state'
  },
  MESSAGES: {
    name: 'Messages Processed',
    type: 'meter',
    id: 'whatsapp/messages'
  },
  // Add new metrics
  ERRORS: {
    name: 'Error Count',
    type: 'meter',
    id: 'whatsapp/errors'
  },
  MESSAGE_PROCESSING_TIME: {
    name: 'Message Processing Time',
    type: 'histogram',
    id: 'whatsapp/message-processing-time',
    unit: 'ms'
  },
  BROWSER_MEMORY: {
    name: 'Browser Memory Usage',
    type: 'metric',
    id: 'browser/memory',
    unit: 'MB'
  },
  BROWSER_CPU: {
    name: 'Browser CPU Usage',
    type: 'metric',
    id: 'browser/cpu',
    unit: '%'
  },
  CLIENT_PUSHNAME: {
    name: 'Client Push Name',
    type: 'metric',
    id: 'whatsapp/client-pushname',
    unit: 'string'
  },
  CLIENT_PHONE: {
    name: 'Client Phone Number',
    type: 'metric',
    id: 'whatsapp/client-phone',
    unit: 'string'
  }
};