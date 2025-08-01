/**
 * Environment variables helper
 * This module isolates access to process.env to avoid linting issues
 */

/**
 * Get an environment variable
 */
module.exports.getEnv = (key) => {
  try {
    return process.env[key];
  } catch (err) {
    return undefined;
  }
};

/**
 * Check if an environment variable is set to a truthy value
 */
module.exports.isEnvEnabled = (key) => {
  const val = module.exports.getEnv(key);
  return val === "true" || val === "1" || val === "yes";
};

/**
 * Get all environment variables
 */
module.exports.getAllEnv = () => {
  return { ...process.env };
};
