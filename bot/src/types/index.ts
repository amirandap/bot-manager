// =================
// BARREL EXPORT FOR BOT TYPES
// =================

// Re-export core shared types
export * from "./core";

// Re-export all types from the main types file
export * from "./types";

// Import types for local use
import type {
  SystemError,
  WhatsAppError,
  SendMessageRequestBody,
  MediaMessageRequestBody,
  ValidationResult,
  RecipientValidationResult,
  FileValidationResult,
} from "./types";

// Common type unions for convenience
export type AnyError = SystemError | WhatsAppError;
export type MessageRequest = SendMessageRequestBody | MediaMessageRequestBody;
export type ValidationResults =
  | ValidationResult
  | RecipientValidationResult
  | FileValidationResult;

// Type guards for runtime type checking
export function isWhatsAppError(error: unknown): error is WhatsAppError {
  return Boolean(
    error &&
      typeof error === "object" &&
      "category" in error &&
      "severity" in error
  );
}

export function isSystemError(error: unknown): error is SystemError {
  return Boolean(error && typeof error === "object" && "code" in error);
}

export function isMediaRequest(body: unknown): body is MediaMessageRequestBody {
  const bodyObj = body as Record<string, unknown>;
  return Boolean(
    body &&
      typeof body === "object" &&
      !("message" in bodyObj && typeof bodyObj.message === "string")
  );
}

export function isTextRequest(body: unknown): body is SendMessageRequestBody {
  const bodyObj = body as Record<string, unknown>;
  return Boolean(
    body &&
      typeof body === "object" &&
      "message" in bodyObj &&
      typeof bodyObj.message === "string"
  );
}
