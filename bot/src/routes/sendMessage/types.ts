export interface SendMessageRequestBody {
  discorduserid?: string;
  phoneNumber?: string | string[];
  to?: string | string[]; // Alias for phoneNumber
  message: string;
  group_id?: string;
  group_name?: string;
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
}
