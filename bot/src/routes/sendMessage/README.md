# SendMessage Module Documentation

## Overview
The `sendMessage` module has been refactored to improve code maintainability and separation of concerns. The original 263-line monolithic file has been split into specialized modules.

## Module Structure

### Core Modules

#### 1. `types.ts`
- **Purpose**: Type definitions and interfaces
- **Exports**: 
  - `SendMessageRequestBody`: Request payload interface
  - `ErrorObject`: Error response structure
  - `ProcessingResult`: Processing result interface
  - `SendResponse`: API response interface

#### 2. `recipientProcessor.ts`
- **Purpose**: Handles recipient normalization and processing
- **Key Function**: `processRecipients()` - Processes and separates groups from phone numbers
- **Features**:
  - Supports unified `to` field handling
  - Discord user integration
  - Duplicate removal
  - Group/phone separation

#### 3. `groupMessageHandler.ts`
- **Purpose**: Handles group message sending
- **Key Function**: `sendToGroups()` - Sends messages to WhatsApp groups
- **Features**:
  - File upload support
  - Error handling per group
  - Group ID validation

#### 4. `phoneMessageHandler.ts`
- **Purpose**: Handles individual phone number messaging
- **Key Function**: `sendToPhones()` - Sends messages to individual phone numbers
- **Features**:
  - Message formatting
  - File attachment support
  - Phone number validation
  - Error categorization

#### 5. `errorHandler.ts`
- **Purpose**: Centralized error handling and reporting
- **Key Functions**:
  - `sendErrorReport()` - Reports errors via WhatsApp
  - `handleCriticalError()` - Handles system-level errors
- **Features**:
  - Error categorization
  - Troubleshooting suggestions
  - Fallback error reporting

#### 6. `requestValidator.ts`
- **Purpose**: Request validation and response building
- **Key Functions**:
  - `validateRequest()` - Validates incoming requests
  - `buildResponse()` - Constructs API responses
- **Features**:
  - Input validation
  - Response standardization
  - Status code management

### Main Route File

#### `sendMessage.ts` (Refactored)
- **Purpose**: Main route handler orchestrating all modules
- **Size**: Reduced from 263 lines to ~65 lines
- **Architecture**: Clean, modular, and maintainable
- **Flow**:
  1. Request validation
  2. Recipient processing
  3. Group message handling
  4. Phone message handling
  5. Error reporting
  6. Response building

## Benefits of Refactoring

### 1. **Separation of Concerns**
- Each module has a single, well-defined responsibility
- Easier to test individual components
- Cleaner code organization

### 2. **Maintainability**
- Easier to locate and fix bugs
- Simpler to add new features
- Reduced cognitive load when reading code

### 3. **Reusability**
- Modules can be imported and used in other parts of the application
- Common functionality is centralized

### 4. **Testing**
- Each module can be unit tested independently
- Mock dependencies easily for isolated testing

### 5. **Code Readability**
- Main route file is now a clear orchestrator
- Business logic is properly separated from HTTP handling

## Usage Example

```typescript
import express from "express";
import multer from "multer";
import { client } from "../config/whatsAppClient";
import RecipientProcessor from "./sendMessage/recipientProcessor";
import GroupMessageHandler from "./sendMessage/groupMessageHandler";
import PhoneMessageHandler from "./sendMessage/phoneMessageHandler";
import ErrorHandler from "./sendMessage/errorHandler";
import RequestValidator from "./sendMessage/requestValidator";

// The main route handler becomes much cleaner and easier to follow
```

## Migration Notes

- **Backward Compatibility**: The API interface remains unchanged
- **File Structure**: New modular structure in `sendMessage/` directory
- **Dependencies**: No new external dependencies added
- **Performance**: No performance impact, only organizational improvements

## Development Guidelines

When modifying the sendMessage functionality:

1. **Single Responsibility**: Keep each module focused on one concern
2. **Error Handling**: Use the centralized `ErrorHandler` for consistency
3. **Type Safety**: Leverage TypeScript interfaces from `types.ts`
4. **Testing**: Test each module independently
5. **Documentation**: Update this README when adding new modules

## Future Enhancements

Potential areas for further improvement:
- Add comprehensive unit tests for each module
- Implement retry logic for failed messages
- Add message queuing for high-volume scenarios
- Implement rate limiting per recipient
- Add message templates support
