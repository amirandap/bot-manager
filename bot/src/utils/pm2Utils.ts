/**
 * PM2 Utilities - Centralized PM2 process communication
 * Handles metrics updates and failure notifications for PM2 monitoring
 */

export interface PM2MetricUpdate {
  step: string;
  status: 'success' | 'failure' | 'in_progress';
  timestamp: string;
  message?: string;
  progress?: number; // 0-100 percentage
  details?: any;
}

export interface PM2FailureAlert {
  critical_failure: boolean;
  error_message: string;
  error_context: string;
  timestamp: string;
  should_restart: boolean;
  step?: string;
  stack_trace?: string;
}

export interface PM2ShutdownNotification {
  graceful_shutdown: boolean;
  signal?: string;
  error?: string;
  timestamp: string;
  reason?: string;
}

/**
 * Alert PM2 about critical failures
 */
export function alertPM2Failure(
  error: Error, 
  context: string, 
  shouldRestart: boolean = false,
  step?: string
): void {
  if (!process.send) {
    console.warn('⚠️ PM2 process.send not available - running outside PM2');
    return;
  }

  const failureData: PM2FailureAlert = {
    critical_failure: true,
    error_message: error.message,
    error_context: context,
    timestamp: new Date().toISOString(),
    should_restart: shouldRestart,
    step: step,
    stack_trace: error.stack
  };

  try {
    process.send({
      type: "process:msg",
      data: failureData,
    });
  } catch (sendError) {
    console.error('❌ Failed to send PM2 failure alert:', sendError);
  }
}

/**
 * Update PM2 with step-by-step metrics
 */
export function updatePM2Metrics(
  step: string,
  status: 'success' | 'failure' | 'in_progress',
  message?: string,
  progress?: number,
  details?: any
): void {
  if (!process.send) {
    console.warn('⚠️ PM2 process.send not available - running outside PM2');
    return;
  }

  const metricData: PM2MetricUpdate = {
    step,
    status,
    timestamp: new Date().toISOString(),
    message,
    progress,
    details
  };

  try {
    process.send({
      type: "process:msg",
      data: {
        startup_metrics: metricData,
        current_step: step,
        overall_status: status,
        progress_percentage: progress || 0
      },
    });
  } catch (sendError) {
    console.error('❌ Failed to send PM2 metrics update:', sendError);
  }
}

/**
 * Notify PM2 about graceful shutdown
 */
export function notifyPM2Shutdown(
  signal?: string,
  error?: Error,
  reason?: string
): void {
  if (!process.send) {
    console.warn('⚠️ PM2 process.send not available - running outside PM2');
    return;
  }

  const shutdownData: PM2ShutdownNotification = {
    graceful_shutdown: true,
    signal: signal || 'manual',
    error: error?.message || null,
    timestamp: new Date().toISOString(),
    reason
  };

  try {
    process.send({
      type: "process:msg",
      data: shutdownData,
    });
  } catch (sendError) {
    console.error('❌ Failed to send PM2 shutdown notification:', sendError);
  }
}

/**
 * Update PM2 with startup progress
 */
export function updateStartupProgress(
  completedSteps: number,
  totalSteps: number,
  currentStepName: string,
  status: 'success' | 'failure' | 'in_progress' = 'in_progress'
): void {
  const progress = Math.round((completedSteps / totalSteps) * 100);
  
  updatePM2Metrics(
    currentStepName,
    status,
    `Step ${completedSteps}/${totalSteps}: ${currentStepName}`,
    progress,
    {
      completed_steps: completedSteps,
      total_steps: totalSteps,
      startup_phase: true
    }
  );
}

/**
 * Mark startup as completed successfully
 */
export function markStartupComplete(): void {
  updatePM2Metrics(
    'startup_complete',
    'success',
    'Bot startup completed successfully',
    100,
    {
      startup_phase: false,
      bot_ready: true,
      api_ready: true
    }
  );
}

/**
 * Mark a specific step as successful
 */
export function markStepSuccess(stepName: string, message?: string, details?: any): void {
  updatePM2Metrics(stepName, 'success', message, undefined, details);
}

/**
 * Mark a specific step as failed
 */
export function markStepFailure(stepName: string, error: Error, details?: any): void {
  updatePM2Metrics(
    stepName, 
    'failure', 
    `Failed: ${error.message}`, 
    undefined, 
    { ...details, error_stack: error.stack }
  );
}

/**
 * Mark a specific step as in progress
 */
export function markStepInProgress(stepName: string, message?: string, progress?: number): void {
  updatePM2Metrics(stepName, 'in_progress', message, progress);
}

/**
 * Predefined startup steps for consistent tracking
 */
export const STARTUP_STEPS = {
  VALIDATION: 'startup_validation',
  LIFECYCLE_INIT: 'bot_lifecycle_initialization', 
  WHATSAPP_CLIENT: 'whatsapp_client_initialization',
  ERROR_CHECK: 'initialization_error_check',
  API_SETUP: 'express_api_setup',
  SHUTDOWN_HANDLERS: 'graceful_shutdown_setup',
  COMPLETE: 'startup_complete'
} as const;

/**
 * Predefined WhatsApp lifecycle steps for consistent tracking
 */
export const WHATSAPP_LIFECYCLE_STEPS = {
  INITIALIZING: 'whatsapp_initializing',
  BROWSER_LAUNCHING: 'whatsapp_browser_launching',
  WAITING_FOR_QR: 'whatsapp_waiting_for_qr',
  QR_READY: 'whatsapp_qr_ready',
  QR_SCANNED: 'whatsapp_qr_scanned',
  AUTHENTICATING: 'whatsapp_authenticating',
  CONNECTED: 'whatsapp_connected',
  READY: 'whatsapp_ready',
  DISCONNECTED: 'whatsapp_disconnected',
  RECONNECTING: 'whatsapp_reconnecting',
  LOADING: 'whatsapp_loading',
  ERROR_BROWSER: 'whatsapp_error_browser',
  ERROR_CHROME: 'whatsapp_error_chrome',
  ERROR_VALIDATION: 'whatsapp_error_validation',
  ERROR_CONNECTION: 'whatsapp_error_connection',
  ERROR_AUTHENTICATION: 'whatsapp_error_authentication',
  ERROR_UNKNOWN: 'whatsapp_error_unknown',
  QR_ERROR: 'whatsapp_qr_error',
  STOPPING: 'whatsapp_stopping',
  STOPPED: 'whatsapp_stopped'
} as const;

/**
 * Get total number of startup steps
 */
export function getTotalStartupSteps(): number {
  return Object.keys(STARTUP_STEPS).length;
}
