/**
 * Directory Manager Service
 * Handles file system operations and directory management
 * CONSOLIDATED - uses unified botLogger directly
 */
import * as fs from "fs";
import { botLogger } from "../utils";
import { SESSION_PATH, QR_PATH, LOGS_PATH } from "../config/EnvironmentManager";
export class DirectoryManagerService {
  public ensureDirectoriesExist(): void {
    const directories = [SESSION_PATH, QR_PATH, LOGS_PATH];
    
    directories.forEach((dir) => {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          botLogger.logDirectory('created', dir);
        } else {
          botLogger.logDirectory('exists', dir);
        }
      } catch (error) {
        botLogger.errorWithContext(`Failed to create directory ${dir}`, error);
        throw new Error(`Directory creation failed for ${dir}: ${error}`);
      }
    });
  }

  public cleanupFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        botLogger.info(`File cleaned up: ${filePath}`, "🧹");
        return true;
      }
      return false;
    } catch (error) {
      botLogger.warn(`Could not clean up file ${filePath}: ${error}`);
      return false;
    }
  }

  public fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      botLogger.warn(`Error checking file existence ${filePath}: ${error}`);
      return false;
    }
  }

  public createDirectoryIfNotExists(dirPath: string): void {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        botLogger.logDirectory('created', dirPath);
      }
    } catch (error) {
      botLogger.errorWithContext(`Failed to create directory ${dirPath}`, error);
      throw new Error(`Directory creation failed for ${dirPath}: ${error}`);
    }
  }

  // Methods from utils/DirectoryManager.ts for backwards compatibility
  public ensureDirectories(directories: string[]): void {
    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        botLogger.logDirectory('created', dir);
      } else {
        botLogger.logDirectory('exists', dir);
      }
    });
  }

  public ensureDirectory(directory: string): boolean {
    try {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
        botLogger.logDirectory('created', directory);
        return true;
      } else {
        botLogger.logDirectory('exists', directory);
        return true;
      }
    } catch (error) {
      botLogger.errorWithContext(`Failed to create directory ${directory}`, error);
      return false;
    }
  }
}
