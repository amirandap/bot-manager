/**
 * Directory management service
 * CONSOLIDATED - uses unified logger directly
 */

import fs from "fs";
import { logger } from "./LoggerService";
import { SESSION_PATH, QR_PATH, LOGS_PATH } from "../config/EnvironmentManager";
export class DirectoryManagerService {
  public ensureDirectoriesExist(): void {
    const directories = [SESSION_PATH, QR_PATH, LOGS_PATH];
    
    directories.forEach((dir) => {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          logger.info(`Directory 'created': dir`);
        } else {
          logger.info(`Directory 'exists': dir`);
        }
      } catch (error) {
        logger.error(`Failed to create directory ${dir}`, error);
        throw new Error(`Directory creation failed for ${dir}: ${error}`);
      }
    });
  }

  public cleanupFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`File cleaned up: ${filePath}`, "🧹");
        return true;
      }
      return false;
    } catch (error) {
      logger.warn(`Could not clean up file ${filePath}: ${error}`);
      return false;
    }
  }

  public fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      logger.warn(`Error checking file existence ${filePath}: ${error}`);
      return false;
    }
  }

  public createDirectoryIfNotExists(dirPath: string): void {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        logger.info(`Directory 'created': dirPath`);
      }
    } catch (error) {
      logger.error(`Failed to create directory ${dirPath}`, error);
      throw new Error(`Directory creation failed for ${dirPath}: ${error}`);
    }
  }

  // Methods from utils/DirectoryManager.ts for backwards compatibility
  public ensureDirectories(directories: string[]): void {
    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Directory 'created': dir`);
      } else {
        logger.info(`Directory 'exists': dir`);
      }
    });
  }

  public ensureDirectory(directory: string): boolean {
    try {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
        logger.info(`Directory 'created': directory`);
        return true;
      } else {
        logger.info(`Directory 'exists': directory`);
        return true;
      }
    } catch (error) {
      logger.error(`Failed to create directory ${directory}`, error);
      return false;
    }
  }
}
