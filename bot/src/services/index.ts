/**
 * Services Barrel Export
 *
 * CONSOLIDATED - Eliminates duplicated services:
 * - Logger moved to utils/loggerWrapper.ts
 * - StartupManager moved to utils/startupUtils.ts
 */

// Remaining specialized services
export { DirectoryManagerService } from "./DirectoryManagerService";

// User and messaging services
export * from "./UserDataService";
export * from "./MediaMessagingService";
export * from "./SMTPService";
