/**
 * Logger Utilities - Pure logging functions
 * Provides direct access to the logger instance without exposing the class
 */

import { LoggerService } from "../services/LoggerService";

// Create logger instance for direct usage - eliminates wrapper overhead
const loggerInstance = LoggerService.getInstance();

// Export directly for maximum efficiency - keeps all existing functionality
export const botLogger = loggerInstance;

// Export for backward compatibility
export default loggerInstance;
