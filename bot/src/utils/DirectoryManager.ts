import * as fs from "fs";
import { Logger } from "../services/Logger";

export class DirectoryManager {
  private logger: Logger;

  public constructor(logger: Logger) {
    this.logger = logger;
  }

  public ensureDirectories(directories: string[]): void {
    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.directoryCreated(dir);
      } else {
        this.logger.directoryExists(dir);
      }
    });
  }

  public ensureDirectory(directory: string): boolean {
    try {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
        this.logger.directoryCreated(directory);
        return true;
      } else {
        this.logger.directoryExists(directory);
        return true;
      }
    } catch (error) {
      this.logger.error(`Failed to create directory ${directory}: ${error}`);
      return false;
    }
  }
}
