/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-len */

/**
 * @deprecated This file has been moved to utils for better organization
 * Import from utils/mediaMessaging.ts instead
 */

// Re-export from utils for backward compatibility
export {
  sendImageMessage,
  sendDocumentMessage,
  sendAudioMessage,
  sendVideoMessage,
} from '../utils/mediaMessaging';

export { sendTextMessage } from '../utils/textMessaging';
export { sendErrorMessage } from '../utils/errorHandler';




