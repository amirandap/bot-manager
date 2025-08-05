/**
 * Message Formatter Service
 * Handles message formatting and personalization
 */

import { User } from '../types/types';
import { getFallbackNumber } from './fallbackUtils';
import { getDisplayName } from './userDataService';

/**
 * Format message with user data
 * @param message Raw message template
 * @param user User data for personalization
 * @returns Formatted message and phone number
 */
export function formatMessage(message: string, user: User): {
  formattedMessage: string;
  phoneNumber: string;
} {
  const phoneNumber = user.celular || getFallbackNumber();
  const formattedMessage = message.replace(/-/g, ' ');

  return { formattedMessage, phoneNumber };
}

/**
 * Create personalized greeting message
 * @param message Base message
 * @param user User data
 * @param greeting Custom greeting prefix
 * @returns Personalized message
 */
export function createPersonalizedMessage(
  message: string,
  user: User,
  greeting: string = 'Saludos',
): string {
  const displayName = getDisplayName(user);
  const cleanMessage = message.replace(/-/g, ' ');
  
  return `${greeting} ${displayName}, como estas? ${cleanMessage}`;
}

/**
 * Format message with user placeholders
 * Supports placeholders like {{name}}, {{username}}, {{email}}
 * @param template Message template with placeholders
 * @param user User data
 * @returns Message with placeholders replaced
 */
export function formatMessageWithPlaceholders(
  template: string,
  user: User,
): string {
  let formattedMessage = template;

  // Define placeholder mappings
  const placeholders = {
    '{{name}}': getDisplayName(user),
    '{{full_name}}': user.full_name || 'Usuario',
    '{{first_name}}': user.full_name ? user.full_name.split(' ')[0] : 'Usuario',
    '{{username}}': user.username || 'usuario',
    '{{nickname}}': user.nickname || getDisplayName(user),
    '{{email}}': user.email || '',
    '{{instagram}}': user.instagram || '',
    '{{discord_id}}': user.user_discord_id || '',
    '{{phone}}': user.celular || '',
  };

  // Replace all placeholders
  Object.entries(placeholders).forEach(([placeholder, value]) => {
    formattedMessage = formattedMessage.replace(
      new RegExp(placeholder, 'g'),
      value,
    );
  });

  // Clean up dashes
  formattedMessage = formattedMessage.replace(/-/g, ' ');

  return formattedMessage;
}

/**
 * Create error notification message for user issues
 * @param error Error details
 * @param user User data (if available)
 * @param context Additional context
 * @returns Formatted error message
 */
export function createErrorNotification(
  error: string,
  user: User | null,
  context: string,
): string {
  const timestamp = new Date().toISOString();
  
  let message = `🚨 ERROR en ${context}\n\n`;
  
  if (user) {
    message += `Usuario: ${user.full_name || 'N/A'}\n`;
    message += `Instagram: www.instagram.com/${user.instagram || 'N/A'}\n`;
    message += `Teléfono: ${user.celular || 'N/A'}\n`;
    message += `Discord ID: ${user.user_discord_id || 'N/A'}\n`;
  }
  
  message += `Error: ${error}\n`;
  message += `Tiempo: ${timestamp}`;

  return message;
}
