import fs from "fs";
import path from "path";
import { ConfigService } from "./configService";

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  raw: string;
}

export interface LogsResponse {
  botId: string;
  botName: string;
  logs: LogEntry[];
  totalLines: number;
  hasMore: boolean;
}

export class LogService {
  private configService: ConfigService;
  private dataDirectory: string;
  private logsDirectory: string;

  constructor() {
    this.configService = ConfigService.getInstance();
    this.dataDirectory = path.join(__dirname, "../../../data");
    this.logsDirectory = path.join(__dirname, "../../../logs");
  }

  /**
   * Find the correct log directory for a bot
   */
  private findBotLogDirectory(botId: string): string | null {
    // First, try data/logs/botId (new structure)
    const dataLogDir = path.join(this.dataDirectory, "logs", botId);
    if (fs.existsSync(dataLogDir)) {
      return dataLogDir;
    }

    // Then, try data/logs/whatsapp-bot-* (bot instances)
    const dataLogsDir = path.join(this.dataDirectory, "logs");
    if (fs.existsSync(dataLogsDir)) {
      const directories = fs.readdirSync(dataLogsDir);
      // Look for directories that might match this bot
      const botDir = directories.find(dir => {
        const dirPath = path.join(dataLogsDir, dir);
        return fs.statSync(dirPath).isDirectory() && 
               (dir.includes(botId) || dir.startsWith('whatsapp-bot-'));
      });
      
      if (botDir) {
        return path.join(dataLogsDir, botDir);
      }
    }

    // Finally, try the main logs directory for PM2 logs
    const pm2LogsDir = this.logsDirectory;
    if (fs.existsSync(pm2LogsDir)) {
      // Check if there are PM2 logs for this bot (wabot-[port] pattern)
      const bot = this.configService.getBotById(botId);
      if (bot && bot.apiPort) {
        const pm2Pattern = `wabot-${bot.apiPort}`;
        const files = fs.readdirSync(pm2LogsDir);
        const hasLogs = files.some(file => file.startsWith(pm2Pattern));
        if (hasLogs) {
          return pm2LogsDir;
        }
      }
    }

    return null;
  }

  /**
   * Find the best matching log file in a directory
   */
  private findLogFile(logDir: string, type: "combined" | "error" | "out", botId?: string): string | null {
    if (!fs.existsSync(logDir)) {
      return null;
    }

    const files = fs.readdirSync(logDir);
    
    // Standard log file names
    const standardNames = {
      combined: ["combined.log"],
      error: ["error.log"],
      out: ["out.log"]
    };

    // PM2 numbered log files
    const pm2Patterns = {
      combined: [/^combined-\d+\.log$/, /^out-\d+\.log$/],
      error: [/^error-\d+\.log$/],
      out: [/^out-\d+\.log$/]
    };

    // Bot-specific PM2 logs (wabot-[port]-[type].log)
    const bot = botId ? this.configService.getBotById(botId) : null;
    const botPatterns = bot && bot.apiPort ? {
      combined: [`wabot-${bot.apiPort}.log`, `wabot-${bot.apiPort}-combined.log`],
      error: [`wabot-${bot.apiPort}-error.log`],
      out: [`wabot-${bot.apiPort}-out.log`]
    } : { combined: [], error: [], out: [] };

    // Try different patterns in order of preference
    const patterns = [
      ...standardNames[type],
      ...botPatterns[type],
      ...pm2Patterns[type]
    ];

    for (const pattern of patterns) {
      if (typeof pattern === 'string') {
        if (files.includes(pattern)) {
          return path.join(logDir, pattern);
        }
      } else {
        // RegExp pattern
        const matchingFile = files.find(f => pattern.test(f));
        if (matchingFile) {
          return path.join(logDir, matchingFile);
        }
      }
    }

    return null;
  }

  /**
   * Get logs for a specific bot
   */
  async getBotLogs(
    botId: string,
    options: {
      lines?: number;
      offset?: number;
      type?: "combined" | "error" | "out";
      follow?: boolean;
    } = {}
  ): Promise<LogsResponse> {
    const { lines = 100, offset = 0, type = "combined" } = options;

    // Get bot info
    const bot = this.configService.getBotById(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    // Find the correct log directory for this bot
    const logDir = this.findBotLogDirectory(botId);
    if (!logDir) {
      console.log(`⚠️  No log directory found for bot ${botId}`);
      return {
        botId,
        botName: bot.name,
        logs: [],
        totalLines: 0,
        hasMore: false,
      };
    }

    // Find the correct log file in the directory
    const logFilePath = this.findLogFile(logDir, type, botId);
    if (!logFilePath) {
      console.log(`⚠️  No ${type} log file found for bot ${botId} in ${logDir}`);
      return {
        botId,
        botName: bot.name,
        logs: [],
        totalLines: 0,
        hasMore: false,
      };
    }

    console.log(`📋 Reading logs for bot ${botId}: ${logFilePath}`);

    try {
      // Read log file
      const logContent = fs.readFileSync(logFilePath, "utf8");
      console.log(`📋 Log file size: ${logContent.length} characters`);
      
      const logLines = logContent.split("\n").filter(line => line.trim() !== "");
      console.log(`📋 Found ${logLines.length} non-empty lines`);

      const totalLines = logLines.length;
      
      // Apply pagination
      const startIndex = Math.max(0, totalLines - offset - lines);
      const endIndex = Math.max(0, totalLines - offset);
      console.log(`📋 Pagination: start=${startIndex}, end=${endIndex}, total=${totalLines}`);
      
      const selectedLines = logLines.slice(startIndex, endIndex);
      console.log(`📋 Selected ${selectedLines.length} lines`);
      
      // Parse log lines
      const logs: LogEntry[] = selectedLines.map(line => this.parseLogLine(line));

      // Reverse to show newest first
      logs.reverse();

      return {
        botId,
        botName: bot.name,
        logs,
        totalLines,
        hasMore: startIndex > 0,
      };
    } catch (error) {
      console.error(`❌ Error reading log file: ${error}`);
      throw new Error(`Failed to read logs: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get real-time logs for a specific bot (tail -f equivalent)
   */
  async getTailLogs(
    botId: string,
    lines: number = 50,
    type: "combined" | "error" | "out" = "combined"
  ): Promise<LogEntry[]> {
    const bot = this.configService.getBotById(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    // Find the correct log directory for this bot
    const logDir = this.findBotLogDirectory(botId);
    if (!logDir) {
      return [];
    }

    // Find the correct log file in the directory
    const logFilePath = this.findLogFile(logDir, type, botId);
    if (!logFilePath || !fs.existsSync(logFilePath)) {
      return [];
    }

    try {
      const logContent = fs.readFileSync(logFilePath, "utf8");
      const logLines = logContent.split("\n").filter(line => line.trim() !== "");
      
      // Get last N lines
      const tailLines = logLines.slice(-lines);
      
      // Parse and return
      return tailLines.map(line => this.parseLogLine(line));
    } catch (error) {
      console.error(`❌ Error reading tail logs: ${error}`);
      return [];
    }
  }

  /**
   * Get available log files for a bot
   */
  getAvailableLogFiles(botId: string): string[] {
    const bot = this.configService.getBotById(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    const logDir = this.findBotLogDirectory(botId);
    if (!logDir || !fs.existsSync(logDir)) {
      return [];
    }

    try {
      const files = fs.readdirSync(logDir);
      return files.filter(file => file.endsWith(".log"));
    } catch (error) {
      console.error(`❌ Error reading log directory: ${error}`);
      return [];
    }
  }

  /**
   * Clear logs for a specific bot
   */
  async clearBotLogs(
    botId: string,
    type?: "combined" | "error" | "out"
  ): Promise<boolean> {
    const bot = this.configService.getBotById(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    const logDir = this.findBotLogDirectory(botId);
    if (!logDir || !fs.existsSync(logDir)) {
      console.log(`ℹ️  Log directory doesn't exist: ${logDir}`);
      return true;
    }

    try {
      if (type) {
        // Clear specific log file
        const logFilePath = this.findLogFile(logDir, type, botId);
        if (logFilePath && fs.existsSync(logFilePath)) {
          fs.writeFileSync(logFilePath, "");
          console.log(`✅ Cleared ${type} logs for bot ${botId}`);
        }
      } else {
        // Clear all log files in the directory
        const logFiles = fs.readdirSync(logDir).filter(file => file.endsWith(".log"));
        
        for (const logFile of logFiles) {
          const logFilePath = path.join(logDir, logFile);
          if (fs.existsSync(logFilePath)) {
            fs.writeFileSync(logFilePath, "");
          }
        }
        
        console.log(`✅ Cleared all logs for bot ${botId}`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Error clearing logs: ${error}`);
      throw new Error(`Failed to clear logs: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Parse a log line to extract timestamp, level, and message
   */
  private parseLogLine(line: string): LogEntry {
    // PM2 log format: 2024-01-20T10:30:45: PM2 log: [timestamp] level: message
    // or just: timestamp level: message
    // or raw message without format
    
    const raw = line;
    
    // Try to extract timestamp (ISO format or PM2 format)
    const isoTimestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^\s]*)/);
    const pm2TimestampMatch = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
    
    let timestamp = new Date().toISOString();
    let remainingLine = line;
    
    if (isoTimestampMatch) {
      timestamp = isoTimestampMatch[1];
      remainingLine = line.substring(line.indexOf(timestamp) + timestamp.length);
    } else if (pm2TimestampMatch) {
      timestamp = new Date(pm2TimestampMatch[1]).toISOString();
      remainingLine = line.substring(line.indexOf(pm2TimestampMatch[1]) + pm2TimestampMatch[1].length);
    }
    
    // Try to extract log level
    const levelMatch = remainingLine.match(/\b(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)\b/i);
    let level = "INFO";
    let message = remainingLine.trim();
    
    if (levelMatch) {
      level = levelMatch[1].toUpperCase();
      // Remove level from message if it's at the beginning
      message = remainingLine.replace(/^\s*:?\s*(ERROR|WARN|INFO|DEBUG|TRACE|FATAL)\s*:?\s*/i, "").trim();
    }
    
    // Clean up common PM2 prefixes
    message = message
      .replace(/^PM2 log:\s*/, "")
      .replace(/^\[\d+\]\s*/, "")
      .replace(/^App\s*\[\w+\]\s*/, "")
      .trim();
    
    if (!message) {
      message = raw;
    }

    return {
      timestamp,
      level,
      message,
      raw,
    };
  }

  /**
   * Get log statistics for a bot
   */
  async getLogStats(botId: string): Promise<{
    totalLines: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    lastUpdate: string;
    fileSizes: Record<string, number>;
  }> {
    const bot = this.configService.getBotById(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    const logDir = this.findBotLogDirectory(botId);
    if (!logDir || !fs.existsSync(logDir)) {
      return {
        totalLines: 0,
        errorCount: 0,
        warnCount: 0,
        infoCount: 0,
        lastUpdate: new Date().toISOString(),
        fileSizes: {},
      };
    }

    try {
      const stats = {
        totalLines: 0,
        errorCount: 0,
        warnCount: 0,
        infoCount: 0,
        lastUpdate: new Date().toISOString(),
        fileSizes: {} as Record<string, number>,
      };

      const logFiles = fs.readdirSync(logDir).filter(file => file.endsWith(".log"));
      let lastModified = 0;

      // Get primary log file for line counting (prefer combined, then out)
      const primaryLogFile = this.findLogFile(logDir, "combined", botId) || 
                            this.findLogFile(logDir, "out", botId);

      for (const logFile of logFiles) {
        const logFilePath = path.join(logDir, logFile);
        
        if (fs.existsSync(logFilePath)) {
          const fileStats = fs.statSync(logFilePath);
          stats.fileSizes[logFile] = fileStats.size;
          
          if (fileStats.mtimeMs > lastModified) {
            lastModified = fileStats.mtimeMs;
            stats.lastUpdate = fileStats.mtime.toISOString();
          }

          // Count lines and levels only in the primary log file
          if (primaryLogFile && logFilePath === primaryLogFile) {
            const content = fs.readFileSync(logFilePath, "utf8");
            const lines = content.split("\n").filter(line => line.trim() !== "");
            stats.totalLines = lines.length;

            // Count by level
            for (const line of lines) {
              const upperLine = line.toUpperCase();
              if (upperLine.includes("ERROR")) stats.errorCount++;
              else if (upperLine.includes("WARN")) stats.warnCount++;
              else stats.infoCount++;
            }
          }
        }
      }

      return stats;
    } catch (error) {
      console.error(`❌ Error getting log stats: ${error}`);
      throw new Error(`Failed to get log stats: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}
