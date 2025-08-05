export interface SystemError extends Error {
    code: string;
    errno?: number;
    syscall?: string;
    path?: string;
}

export type Participant = {
    name: string;
    phone: string;
    image: string;
    rank: number;
}

// =================
// MESSAGE TYPES
// =================

// Generic types for message operations
export interface BaseMessageRequestBody {
  discorduserid?: string;
  phoneNumber?: string | string[];
  to?: string | string[]; // Alias for phoneNumber
  group_id?: string;
  group_name?: string;
}

export interface SendMessageRequestBody extends BaseMessageRequestBody {
  message: string;
}

export interface MediaMessageRequestBody extends BaseMessageRequestBody {
  message?: string; // Optional caption/message for media
}

export interface ErrorObject {
  phoneNumber: string;
  error: string;
  errorType?: string;
  timestamp?: string;
}

export interface ProcessingResult {
  messagesSent: string[];
  errors: ErrorObject[];
}

export interface SendResponse {
  success: boolean;
  messagesSent: string[];
  errors: ErrorObject[];
  totalSent: number;
  totalErrors: number;
}

export interface MediaSendResponse extends SendResponse {
  fileInfo?: {
    name: string;
    size: number;
    type: string;
  };
}