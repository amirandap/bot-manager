/**
 * Helper to track message sending and update metrics
 */

import { pm2Metrics } from "./pm2Metrics";

// These variables should match the ones in whatsAppClient.ts
// We'll track them here to avoid circular dependencies
let messagesSent = 0;
let messagesReceived = 0;

/**
 * Track a sent message and update PM2 metrics
 */
export function trackSentMessage(count = 1): void {
  messagesSent += count;
  updateMetrics();
}

/**
 * Track a received message and update PM2 metrics
 */
export function trackReceivedMessage(count = 1): void {
  messagesReceived += count;
  updateMetrics();
}

/**
 * Get current message counters
 */
export function getMessageCounters(): { sent: number; received: number } {
  return {
    sent: messagesSent,
    received: messagesReceived,
  };
}

/**
 * Reset message counters (useful for testing or after restarts)
 */
export function resetMessageCounters(): void {
  messagesSent = 0;
  messagesReceived = 0;
  updateMetrics();
}

/**
 * Update PM2 metrics with current counter values
 */
function updateMetrics(): void {
  pm2Metrics.updateMessageCounters(messagesSent, messagesReceived);
}

export default {
  trackSentMessage,
  trackReceivedMessage,
  getMessageCounters,
  resetMessageCounters,
};
