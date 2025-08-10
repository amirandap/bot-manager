/**
 * Directory Manager Service
 * Handles file system operations and directory management
 */

import * as fs from "fs";
import { Logger } from "./Logger";
import { SESSION_PATH, QR_PATH, LOGS_PATH } from "../config/EnvironmentManager";

export class DirectoryManagerService {
  constructor(private logger: Logger) {}

  public ensureDirectoriesExist(): void {
    const directories = [SESSION_PATH, QR_PATH, LOGS_PATH];
    
    directories.forEach((dir) => {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          this.logger.info(`Created directory: ${dir}`, "📁");
        } else {
          this.logger.info(`Directory exists: ${dir}`, "✅");
        }
      } catch (error) {
        this.logger.error(`Failed to create directory ${dir}: ${error}`);
        throw new Error(`Directory creation failed for ${dir}: ${error}`);
      }
    });
  }

  public cleanupFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.info(`File cleaned up: ${filePath}`, "🧹");
        return true;
      }
      return false;
    } catch (error) {
      this.logger.warn(`Could not clean up file ${filePath}: ${error}`);
      return false;
    }
  }

  public fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch (error) {
      this.logger.warn(`Error checking file existence ${filePath}: ${error}`);
      return false;
    }
  }

  public createDirectoryIfNotExists(dirPath: string): void {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        this.logger.info(`Created directory: ${dirPath}`, "📁");
      }
    } catch (error) {
      this.logger.error(`Failed to create directory ${dirPath}: ${error}`);
      throw new Error(`Directory creation failed for ${dirPath}: ${error}`);
    }
  }
}
