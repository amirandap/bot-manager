/**
 * Utility for reporting metrics to PM2.
 *
 * PM2 allows exposing custom metrics through its monitoring system.
 * This module provides functions to report the WhatsApp client status to PM2.
 */

import { BotLifecycleState } from "./botLifecycleTracker";

// PM2 expects metrics to be set on io
declare global {
  interface NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _METRICS?: any; // PM2 metrics property
  }
}

/**
 * Initialize PM2 metrics reporting
 */
export function initPM2Metrics(): void {
  // Create the _METRICS object if it doesn't exist
  if (!global.NodeJS) {
    (global as any).NodeJS = {};
  }

  if (!(global as any).NodeJS._METRICS) {
    (global as any).NodeJS._METRICS = {};
  }

  // Initialize with default values
  updatePM2Metrics({
    whatsapp_status: "initializing",
    is_connected: false,
    qr_ready: false,
    uptime_ms: 0,
    messages_sent: 0,
    messages_received: 0,
  });

  console.log("📊 PM2 metrics initialized for better monitoring");
}

interface BotMetrics {
  whatsapp_status?: string;
  is_connected?: boolean;
  qr_ready?: boolean;
  uptime_ms?: number;
  messages_sent?: number;
  messages_received?: number;
  [key: string]: any; // Allow additional metrics
}

/**
 * Update PM2 metrics with current values
 */
export function updatePM2Metrics(metrics: BotMetrics): void {
  try {
    if ((global as any).NodeJS && (global as any).NodeJS._METRICS) {
      Object.assign((global as any).NodeJS._METRICS, metrics);
    }
  } catch (error) {
    // Don't crash if PM2 metrics reporting fails
    console.error("⚠️ Error updating PM2 metrics:", error);
  }
}

/**
 * Update PM2 metrics with WhatsApp client status
 */
export function updatePM2StatusMetric(
  status: BotLifecycleState,
  isConnected: boolean,
  qrReady: boolean
): void {
  updatePM2Metrics({
    whatsapp_status: status,
    is_connected: isConnected,
    qr_ready: qrReady,
  });
}

/**
 * Update PM2 message count metrics
 */
export function updatePM2MessageCounters(
  sent?: number,
  received?: number
): void {
  const metrics: BotMetrics = {};

  if (sent !== undefined) {
    metrics.messages_sent = sent;
  }

  if (received !== undefined) {
    metrics.messages_received = received;
  }

  updatePM2Metrics(metrics);
}

/**
 * Update PM2 uptime metric
 */
export function updatePM2Uptime(uptimeMs: number): void {
  updatePM2Metrics({ uptime_ms: uptimeMs });
}

// Export a singleton instance
export const pm2Metrics = {
  init: initPM2Metrics,
  updateStatus: updatePM2StatusMetric,
  updateMessageCounters: updatePM2MessageCounters,
  updateUptime: updatePM2Uptime,
  update: updatePM2Metrics,
};

export default pm2Metrics;
