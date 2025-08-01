/* eslint-disable-next-line */
/* eslint-disable no-process-env */
/**
 * Environment variables helper
 * This module isolates access to process.env to avoid linting issues
 * This file intentionally disables the no-process-env rule as its sole
 * purpose is to centralize and isolate environment variable access
 */

/**
 * Get an environment variable
 */
export const getEnv = (key: string): string | undefined => {
  try {
    // eslint-disable-next-line no-process-env
    return process.env[key];
  } catch (err) {
    return undefined;
  }
};

/**
 * Check if an environment variable is set to a truthy value
 */
export const isEnvEnabled = (key: string): boolean => {
  const val = getEnv(key);
  return val === "true" || val === "1" || val === "yes";
};

/**
 * Get all environment variables
 */
export const getAllEnv = (): Record<string, string | undefined> => {
  // eslint-disable-next-line no-process-env
  return { ...process.env };
};
