
import { botLogger } from "./loggerWrapper";
/**
 * PM2 Utilities - Centralized PM2 process communication
 * Handles metrics updates and failure notifications for PM2 monitoring
 * Falls back to JSON file logging when PM2 is not available
 */
import * as fs from "fs";
import * as path from "path";
// Track if we've already warned about PM2 not being available
let pm2WarningShown = false;
let jsonFallbackInitialized = false;

// JSON fallback configuration
const JSON_FALLBACK_CONFIG = {
  enabled: false,
  filePath: path.join(process.cwd(), 'bot-status.json'),
  maxHistoryEntries: 100 // Keep last 100 entries to prevent file from growing too large
};

interface BotStatusEntry {
  timestamp: string;
  type: 'metric' | 'failure' | 'shutdown';
  data: any;
}

interface BotStatusFile {
  process_info: {
    pid: number;
    started_at: string;
    running_with_pm2: boolean;
    node_version: string;
    working_directory: string;
  };
  current_status: {
    overall_status: 'starting' | 'running' | 'error' | 'stopped';
    current_step: string;
    progress_percentage: number;
    last_update: string;
    bot_ready: boolean;
    api_ready: boolean;
    whatsapp_connected: boolean;
  };
  metrics_history: BotStatusEntry[];
  failures: BotStatusEntry[];
  last_shutdown?: BotStatusEntry;
}

/**
 * Initialize JSON fallback system
 */
function initializeJsonFallback(): void {
  if (jsonFallbackInitialized) return;
  
  try {
    const initialStatus: BotStatusFile = {
      process_info: {
        pid: process.pid,
        started_at: new Date().toISOString(),
        running_with_pm2: false,
        node_version: process.version,
        working_directory: process.cwd()
      },
      current_status: {
        overall_status: 'starting',
        current_step: 'initialization',
        progress_percentage: 0,
        last_update: new Date().toISOString(),
        bot_ready: false,
        api_ready: false,
        whatsapp_connected: false
      },
      metrics_history: [],
      failures: []
    };

    // Create or update the status file
    fs.writeFileSync(JSON_FALLBACK_CONFIG.filePath, JSON.stringify(initialStatus, null, 2));
    botLogger.info(`📊 JSON fallback initialized: ${JSON_FALLBACK_CONFIG.filePath}`);
    jsonFallbackInitialized = true;
  } catch (error) {
    console.error('❌ Failed to initialize JSON fallback:', error);
  }
}

/**
 * Update JSON fallback file with new data
 */
function updateJsonFallback(type: 'metric' | 'failure' | 'shutdown', data: any): void {
  if (!JSON_FALLBACK_CONFIG.enabled) return;

  try {
    let statusFile: BotStatusFile;
    
    // Read existing file or create new one
    if (fs.existsSync(JSON_FALLBACK_CONFIG.filePath)) {
      const fileContent = fs.readFileSync(JSON_FALLBACK_CONFIG.filePath, 'utf8');
      statusFile = JSON.parse(fileContent);
    } else {
      initializeJsonFallback();
      return updateJsonFallback(type, data);
    }

    const entry: BotStatusEntry = {
      timestamp: new Date().toISOString(),
      type,
      data
    };

    // Update based on entry type
    switch (type) {
      case 'metric':
        // Update current status
        if (data.startup_metrics) {
          const metrics = data.startup_metrics;
          statusFile.current_status.current_step = metrics.step;
          statusFile.current_status.progress_percentage = data.progress_percentage || 0;
          statusFile.current_status.last_update = entry.timestamp;
          statusFile.current_status.overall_status = metrics.status === 'failure' ? 'error' : 
                                                   metrics.status === 'success' && metrics.step === 'startup_complete' ? 'running' : 'starting';
          
          // Update specific flags based on step
          if (metrics.step === 'whatsapp_connected' && metrics.status === 'success') {
            statusFile.current_status.whatsapp_connected = true;
          }
          if (metrics.step === 'express_api_setup' && metrics.status === 'success') {
            statusFile.current_status.api_ready = true;
          }
          if (metrics.step === 'startup_complete' && metrics.status === 'success') {
            statusFile.current_status.bot_ready = true;
            statusFile.current_status.overall_status = 'running';
          }
        }
        
        // Add to history
        statusFile.metrics_history.push(entry);
        
        // Trim history if too large
        if (statusFile.metrics_history.length > JSON_FALLBACK_CONFIG.maxHistoryEntries) {
          statusFile.metrics_history = statusFile.metrics_history.slice(-JSON_FALLBACK_CONFIG.maxHistoryEntries);
        }
        break;

      case 'failure':
        statusFile.current_status.overall_status = 'error';
        statusFile.current_status.last_update = entry.timestamp;
        statusFile.failures.push(entry);
        
        // Trim failures if too large
        if (statusFile.failures.length > 50) {
          statusFile.failures = statusFile.failures.slice(-50);
        }
        break;

      case 'shutdown':
        statusFile.current_status.overall_status = 'stopped';
        statusFile.current_status.last_update = entry.timestamp;
        statusFile.last_shutdown = entry;
        break;
    }

    // Write back to file
    fs.writeFileSync(JSON_FALLBACK_CONFIG.filePath, JSON.stringify(statusFile, null, 2));
  } catch (error) {
    console.error('❌ Failed to update JSON fallback:', error);
  }
}

/**
 * Check if PM2 is available and setup fallback if needed
 */
function checkPM2Available(): boolean {
  if (!process.send) {
    if (!pm2WarningShown) {
      console.warn('⚠️ PM2 process.send not available - using JSON fallback');
      pm2WarningShown = true;
      JSON_FALLBACK_CONFIG.enabled = true;
      initializeJsonFallback();
    }
    return false;
  }
  return true;
}

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
  const failureData: PM2FailureAlert = {
    critical_failure: true,
    error_message: error.message,
    error_context: context,
    timestamp: new Date().toISOString(),
    should_restart: shouldRestart,
    step: step,
    stack_trace: error.stack
  };

  if (checkPM2Available()) {
    try {
      process.send({
        type: "process:msg",
        data: failureData,
      });
    } catch (sendError) {
      console.error('❌ Failed to send PM2 failure alert:', sendError);
    }
  } else {
    // Fallback to JSON file
    updateJsonFallback('failure', failureData);
    botLogger.error(`🚨 CRITICAL FAILURE [${context}]: ${error.message}`);
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
  const metricData: PM2MetricUpdate = {
    step,
    status,
    timestamp: new Date().toISOString(),
    message,
    progress,
    details
  };

  const pm2Data = {
    startup_metrics: metricData,
    current_step: step,
    overall_status: status,
    progress_percentage: progress || 0
  };

  if (checkPM2Available()) {
    try {
      process.send({
        type: "process:msg",
        data: pm2Data,
      });
    } catch (sendError) {
      console.error('❌ Failed to send PM2 metrics update:', sendError);
    }
  } else {
    // Fallback to JSON file
    updateJsonFallback('metric', pm2Data);
    const progressStr = progress !== undefined ? ` (${progress}%)` : '';
    botLogger.info(`📊 [${step}] ${status.toUpperCase()}: ${message || 'No message'}${progressStr}`, '💬');
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
  const shutdownData: PM2ShutdownNotification = {
    graceful_shutdown: true,
    signal: signal || 'manual',
    error: error?.message || null,
    timestamp: new Date().toISOString(),
    reason
  };

  if (checkPM2Available()) {
    try {
      process.send({
        type: "process:msg",
        data: shutdownData,
      });
    } catch (sendError) {
      console.error('❌ Failed to send PM2 shutdown notification:', sendError);
    }
  } else {
    // Fallback to JSON file
    updateJsonFallback('shutdown', shutdownData);
    botLogger.info(`🛑 SHUTDOWN: ${reason || 'Manual shutdown'} (Signal: ${signal || 'manual'})`);
  }
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
 * Predefined startup steps for consistent tracking
 */
export const STARTUP_STEPS = {
  VALIDATION: 'startup_validation',
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
/**
 * Get the current bot status from JSON file
 */
export function getCurrentBotStatus(): BotStatusFile | null {
  if (!fs.existsSync(JSON_FALLBACK_CONFIG.filePath)) {
    return null;
  }
  
  try {
    const fileContent = fs.readFileSync(JSON_FALLBACK_CONFIG.filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ Failed to read bot status file:', error);
    return null;
  }
}

/**
 * Check if bot is currently running (based on process check and recent activity)
 */
export function isBotCurrentlyRunning(): boolean {
  const status = getCurrentBotStatus();
  if (!status) return false;
  
  // Check if the process is still running
  try {
    process.kill(status.process_info.pid, 0); // This doesn't kill, just checks if PID exists
    
    // Also check if there's been recent activity (within last 5 minutes)
    const lastUpdate = new Date(status.current_status.last_update);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    return lastUpdate > fiveMinutesAgo && status.current_status.overall_status !== 'stopped';
  } catch (error) {
    // Process doesn't exist
    return false;
  }
}

/**
 * Clean up old status file if the process is no longer running
 */
export function cleanupStaleStatusFile(): boolean {
  if (!isBotCurrentlyRunning()) {
    try {
      if (fs.existsSync(JSON_FALLBACK_CONFIG.filePath)) {
        fs.unlinkSync(JSON_FALLBACK_CONFIG.filePath);
        botLogger.info('Cleaned up stale status file from previous run', '🧹');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to cleanup stale status file:', error);
    }
  }
  return false;
}

/**
 * Get startup progress summary
 */
export function getStartupProgressSummary(): {
  isComplete: boolean;
  progress: number;
  currentStep: string;
  status: string;
  failureCount: number;
} {
  const status = getCurrentBotStatus();
  if (!status) {
    return {
      isComplete: false,
      progress: 0,
      currentStep: 'not_started',
      status: 'unknown',
      failureCount: 0
    };
  }
  
  return {
    isComplete: status.current_status.progress_percentage >= 100,
    progress: status.current_status.progress_percentage,
    currentStep: status.current_status.current_step,
    status: status.current_status.overall_status,
    failureCount: status.failures.length
  };
}

export function getTotalStartupSteps(): number {
  return Object.keys(STARTUP_STEPS).length;
}

/**
 * MASTER STEP HANDLER
 * Single function that handles all step status updates based on parameters
 * Replaces all individual step functions with unified behavior
 */
export function handleStep(
  step: keyof typeof STARTUP_STEPS,
  action: 'start' | 'progress' | 'complete' | 'fail',
  options?: {
    message?: string;
    error?: Error;
    details?: any;
    shouldRestart?: boolean;
  }
): void {
  const stepName = STARTUP_STEPS[step];
  const totalSteps = getTotalStartupSteps();
  const stepNumber = Object.keys(STARTUP_STEPS).indexOf(step) + 1;
  const { message, error, details, shouldRestart = false } = options || {};
  
  // Calculate progress percentage based on action
  let progress: number;
  let pm2Status: 'in_progress' | 'success' | 'failure';
  
  switch (action) {
    case 'start':
    case 'progress':
      progress = Math.round(((stepNumber - 1) / totalSteps) * 100);
      pm2Status = 'in_progress';
      break;
    case 'complete':
      progress = Math.round((stepNumber / totalSteps) * 100);
      pm2Status = 'success';
      break;
    case 'fail':
      progress = Math.round(((stepNumber - 1) / totalSteps) * 100);
      pm2Status = 'failure';
      break;
  }

  // Generate default message if not provided
  const defaultMessage = message || `Step ${stepNumber}/${totalSteps}: ${stepName}`;
  
  // Log to console with appropriate emoji and level
  switch (action) {
    case 'start':
      botLogger.info(`🚀 [${stepNumber}/${totalSteps}] Starting: ${defaultMessage}`, "🔄");
      break;
    case 'progress':
      botLogger.info(`⏳ [${stepNumber}/${totalSteps}] ${defaultMessage}`, "🔄");
      break;
    case 'complete':
      botLogger.success(`✅ [${stepNumber}/${totalSteps}] ${defaultMessage}`);
      break;
    case 'fail':
      botLogger.error(`❌ [${stepNumber}/${totalSteps}] ${defaultMessage}`);
      if (error) {
        botLogger.error(`   Error: ${error.message}`);
        if (error.stack) {
          botLogger.error(`   Stack: ${error.stack}`);
        }
      }
      break;
  }

  // Update PM2 metrics with unified call
  updatePM2Metrics(
    stepName,
    pm2Status,
    defaultMessage,
    progress,
    {
      step_number: stepNumber,
      total_steps: totalSteps,
      startup_phase: true,
      action,
      ...details
    }
  );

  // Handle failures with PM2 alerts (only for 'fail' action)
  if (action === 'fail' && error) {
    alertPM2Failure(error, `step_${step.toLowerCase()}`, shouldRestart, stepName);
  }
}

/**
 * CONVENIENCE EXPORTS (Optional - for backward compatibility and cleaner code)
 * These are thin wrappers around the master function for common use cases
 */
export function startStep(step: keyof typeof STARTUP_STEPS, message?: string): void {
  handleStep(step, 'start', { message });
}

export function progressStep(step: keyof typeof STARTUP_STEPS, message?: string): void {
  handleStep(step, 'progress', { message });
}

export function completeStep(step: keyof typeof STARTUP_STEPS, message?: string, details?: any): void {
  handleStep(step, 'complete', { message, details });
}

export function failStep(
  step: keyof typeof STARTUP_STEPS, 
  error: Error, 
  shouldRestart: boolean = false,
  details?: any
): void {
  handleStep(step, 'fail', { 
    message: `Failed: ${error.message}`, 
    error, 
    shouldRestart, 
    details 
  });
}
