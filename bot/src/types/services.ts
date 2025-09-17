/**
 * =================
 * SERVICE TYPES
 * =================
 * 
 * All service-related types centralized
 */

// =================
// LOGGER SERVICE
// =================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerConfig {
  logLevel: LogLevel;
  logToFile: boolean;
  logToConsole: boolean;
  logDirectory: string;
  silentMetrics?: boolean; // Silenciar logs automáticos de métricas
}

// =================
// SESSION STATE SERVICE
// =================

export interface SessionState {
  hasExistingSession: boolean;
  sessionPath: string;
  lastSessionTimestamp?: Date;
  sessionFiles: string[];
  isFirstTime: boolean;
  isSessionCorrupted: boolean;
}

// =================
// ERROR HANDLER SERVICE
// =================

export interface ErrorPattern {
  pattern: RegExp;
  category: import('./types').ErrorCategory;
  severity: import('./types').ErrorSeverity;
  isRecoverable: boolean;
  description: string;
  retryAfter?: number;
}