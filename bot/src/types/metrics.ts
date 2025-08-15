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
  QR_CODES: {
    name: 'QR Codes Generated',
    type: 'counter',
    id: 'whatsapp/qrcodes'
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
  }
};