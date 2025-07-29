/**
 * SMTP Configuration Utilities
 * Functions to check and validate SMTP email configuration
 */

/**
 * Checks if all required SMTP environment variables are configured
 * @returns {boolean} True if SMTP is fully configured, false otherwise
 */
export function isSmtpConfigured(): boolean {
  return !!(
    process.env.GMAIL_USER &&
    process.env.GMAIL_PASS &&
    process.env.MAIL_RECIPIENT
  );
}

/**
 * Gets the SMTP configuration if all required variables are present
 * @returns {object|null} SMTP config object or null if not configured
 */
export function getSmtpConfig(): {
  user: string;
  pass: string;
  recipient: string;
} | null {
  if (!isSmtpConfigured()) {
    return null;
  }

  return {
    user: process.env.GMAIL_USER!,
    pass: process.env.GMAIL_PASS!,
    recipient: process.env.MAIL_RECIPIENT!,
  };
}

/**
 * Logs SMTP configuration status
 */
export function logSmtpStatus(): void {
  if (isSmtpConfigured()) {
    console.log("✅ SMTP configured - email notifications enabled");
  } else {
    const missing = [];
    if (!process.env.GMAIL_USER) missing.push("GMAIL_USER");
    if (!process.env.GMAIL_PASS) missing.push("GMAIL_PASS");
    if (!process.env.MAIL_RECIPIENT) missing.push("MAIL_RECIPIENT");
    
    console.log(`📧 SMTP not configured - email notifications disabled (missing: ${missing.join(", ")})`);
  }
}
