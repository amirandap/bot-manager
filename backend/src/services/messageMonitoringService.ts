import fs from 'fs';
import path from 'path';

export interface MessageLog {
  id: string;
  timestamp: string;
  type: 'received' | 'sent' | 'failed' | 'processing' | 'error';
  level: 'info' | 'warn' | 'error';
  requestId?: string;
  botId?: string;
  recipient?: string;
  message?: string;
  messageType?: string;
  endpoint?: string;
  success?: boolean;
  errorType?: string;
  errorDetails?: string;
  troubleshooting?: string;
  raw: string;
}

export interface MessageStats {
  totalMessages: number;
  successCount: number;
  failureCount: number;
  errorCount: number;
  processedCount: number;
  receivedCount: number;
  byBot: { [botId: string]: number };
  byType: { [type: string]: number };
  byErrorType: { [errorType: string]: number };
  lastHour: number;
  last24Hours: number;
}

export class MessageMonitoringService {
  private logPaths: string[] = [
    path.join(process.cwd(), '..', 'logs'),
    path.join(process.cwd(), 'logs'),
    '/pm2/logs',
    '/var/log/pm2',
    path.join(process.env.HOME || '/home/user', '.pm2', 'logs'),
  ];

  /**
   * Get backend logs related to message processing
   */
  public async getMessageLogs(
    lines: number = 100,
    offset: number = 0,
    type?: 'received' | 'sent' | 'failed' | 'processing' | 'error'
  ): Promise<{
    logs: MessageLog[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const logFile = await this.findBackendLogFile();
      if (!logFile) {
        return { logs: [], total: 0, hasMore: false };
      }

      const content = await fs.promises.readFile(logFile, 'utf-8');
      const allLines = content.split('\n').filter(line => line.trim());
      
      // Filter lines that contain message processing information
      const messageLines = allLines.filter(line => this.isMessageRelatedLog(line));
      
      // Apply pagination
      const totalLines = messageLines.length;
      const startIndex = Math.max(0, totalLines - offset - lines);
      const endIndex = Math.max(0, totalLines - offset);
      
      const selectedLines = messageLines.slice(startIndex, endIndex);
      
      // Parse message logs
      const logs: MessageLog[] = selectedLines
        .map(line => this.parseMessageLog(line))
        .filter(log => log !== null) as MessageLog[];

      // Filter by type if specified
      const filteredLogs = type ? logs.filter(log => log.type === type) : logs;

      return {
        logs: filteredLogs,
        total: totalLines,
        hasMore: endIndex < totalLines
      };
    } catch (error) {
      console.error('Error reading message logs:', error);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get message processing statistics
   */
  public async getMessageStats(): Promise<MessageStats> {
    try {
      const { logs } = await this.getMessageLogs(1000); // Get more logs for stats
      
      const stats: MessageStats = {
        totalMessages: logs.length,
        successCount: 0,
        failureCount: 0,
        errorCount: 0,
        processedCount: 0,
        receivedCount: 0,
        byBot: {},
        byType: {},
        byErrorType: {},
        lastHour: 0,
        last24Hours: 0
      };

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      logs.forEach(log => {
        const logTime = new Date(log.timestamp);
        
        // Count by type
        stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
        
        // Count by bot
        if (log.botId) {
          stats.byBot[log.botId] = (stats.byBot[log.botId] || 0) + 1;
        }
        
        // Count by status
        switch (log.type) {
          case 'sent':
            if (log.success !== false) stats.successCount++;
            break;
          case 'failed':
          case 'error':
            stats.failureCount++;
            if (log.errorType) {
              stats.byErrorType[log.errorType] = (stats.byErrorType[log.errorType] || 0) + 1;
            }
            break;
          case 'processing':
            stats.processedCount++;
            break;
          case 'received':
            stats.receivedCount++;
            break;
        }
        
        if (log.level === 'error') {
          stats.errorCount++;
        }
        
        // Time-based counts
        if (logTime >= oneHourAgo) {
          stats.lastHour++;
        }
        if (logTime >= oneDayAgo) {
          stats.last24Hours++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error calculating message stats:', error);
      return {
        totalMessages: 0,
        successCount: 0,
        failureCount: 0,
        errorCount: 0,
        processedCount: 0,
        receivedCount: 0,
        byBot: {},
        byType: {},
        byErrorType: {},
        lastHour: 0,
        last24Hours: 0
      };
    }
  }

  /**
   * Find backend log file
   */
  private async findBackendLogFile(): Promise<string | null> {
    const possibleFiles = [
      'bot-manager-backend-combined.log',
      'bot-manager-backend.log',
      'backend.log',
      'combined.log'
    ];

    for (const logPath of this.logPaths) {
      for (const fileName of possibleFiles) {
        const fullPath = path.join(logPath, fileName);
        try {
          await fs.promises.access(fullPath);
          return fullPath;
        } catch {
          // File doesn't exist, continue
        }
      }
    }

    return null;
  }

  /**
   * Check if a log line is related to message processing
   */
  private isMessageRelatedLog(line: string): boolean {
    const messageKeywords = [
      '📨', // Message received emoji
      '✅', // Success emoji
      '❌', // Error emoji
      '📋', // Processing emoji
      '[BACKEND]',
      'Request',
      'Message request',
      'completed successfully',
      'failed:',
      'send-message',
      'sendMessage',
      'botId',
      'messageType',
      'endpoint',
      'requestId',
      'VALIDATION_ERROR',
      'BOT_ERROR',
      'CONNECTION_ERROR',
      'BACKEND_ERROR'
    ];

    return messageKeywords.some(keyword => line.includes(keyword));
  }

  /**
   * Parse a log line into a structured MessageLog
   */
  private parseMessageLog(line: string): MessageLog | null {
    try {
      // Extract timestamp
      const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[.\d]*[Z]?)/);
      const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();

      // Extract request ID
      const requestIdMatch = line.match(/Request (\d+)/);
      const requestId = requestIdMatch ? requestIdMatch[1] : undefined;

      // Extract bot ID
      const botIdMatch = line.match(/botId['":\s]*([^'"\s,}]+)/);
      const botId = botIdMatch ? botIdMatch[1] : undefined;

      // Extract message type
      const messageTypeMatch = line.match(/messageType['":\s]*([^'"\s,}]+)/);
      const messageType = messageTypeMatch ? messageTypeMatch[1] : undefined;

      // Extract endpoint
      const endpointMatch = line.match(/endpoint['":\s]*([^'"\s,}]+)/);
      const endpoint = endpointMatch ? endpointMatch[1] : undefined;

      // Extract recipient
      const recipientMatch = line.match(/to['":\s]*([^'"\s,}]+)/);
      const recipient = recipientMatch ? recipientMatch[1] : undefined;

      // Determine log type and level
      let type: MessageLog['type'] = 'processing';
      let level: MessageLog['level'] = 'info';
      let success: boolean | undefined;
      let errorType: string | undefined;
      let errorDetails: string | undefined;
      let troubleshooting: string | undefined;

      if (line.includes('📨') && line.includes('received')) {
        type = 'received';
      } else if (line.includes('✅') && line.includes('completed successfully')) {
        type = 'sent';
        success = true;
      } else if (line.includes('❌') || line.includes('failed:')) {
        type = 'failed';
        level = 'error';
        success = false;

        // Extract error type
        const errorTypeMatch = line.match(/errorType['":\s]*([^'"\s,}]+)/);
        errorType = errorTypeMatch ? errorTypeMatch[1] : 'UNKNOWN_ERROR';

        // Extract error details
        const errorDetailsMatch = line.match(/details['":\s]*"([^"]+)"/);
        errorDetails = errorDetailsMatch ? errorDetailsMatch[1] : line.split('failed:')[1]?.trim();

        // Extract troubleshooting
        const troubleshootingMatch = line.match(/troubleshooting['":\s]*"([^"]+)"/);
        troubleshooting = troubleshootingMatch ? troubleshootingMatch[1] : undefined;
      } else if (line.includes('📋') || line.includes('details:')) {
        type = 'processing';
      } else if (line.includes('ERROR') || line.includes('❌')) {
        type = 'error';
        level = 'error';
      }

      // Extract message content (if available)
      const messageMatch = line.match(/message['":\s]*"([^"]+)"/);
      const message = messageMatch ? messageMatch[1] : undefined;

      return {
        id: `${timestamp}-${requestId || Date.now()}`,
        timestamp,
        type,
        level,
        requestId,
        botId,
        recipient,
        message,
        messageType,
        endpoint,
        success,
        errorType,
        errorDetails,
        troubleshooting,
        raw: line
      };
    } catch (error) {
      console.error('Error parsing message log line:', error);
      return null;
    }
  }

  /**
   * Clear message logs (implementation depends on log management strategy)
   */
  public async clearMessageLogs(): Promise<boolean> {
    try {
      const logFile = await this.findBackendLogFile();
      if (!logFile) {
        return false;
      }

      // Instead of clearing the entire file, we'll just add a clear marker
      // This preserves the log file structure while marking a clear point
      const clearMarker = `\n${new Date().toISOString()}: 🧹 [MESSAGE_MONITORING] Logs cleared by user\n`;
      await fs.promises.appendFile(logFile, clearMarker);
      
      return true;
    } catch (error) {
      console.error('Error clearing message logs:', error);
      return false;
    }
  }
}
