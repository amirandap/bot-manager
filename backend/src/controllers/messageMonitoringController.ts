import { Request, Response } from 'express';
import { MessageMonitoringService, MessageLog } from '../services/messageMonitoringService';

export class MessageMonitoringController {
  private messageMonitoringService: MessageMonitoringService;

  constructor() {
    this.messageMonitoringService = new MessageMonitoringService();
  }

  /**
   * GET /api/monitoring/messages - Get message processing logs
   */
  public async getMessageLogs(req: Request, res: Response): Promise<void> {
    try {
      const lines = parseInt(req.query.lines as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;
      const type = req.query.type as 'received' | 'sent' | 'failed' | 'processing' | 'error' | undefined;

      const result = await this.messageMonitoringService.getMessageLogs(lines, offset, type);

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting message logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve message logs',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/monitoring/messages/stats - Get message processing statistics
   */
  public async getMessageStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.messageMonitoringService.getMessageStats();

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting message stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve message statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * POST /api/monitoring/messages/clear - Clear message logs
   */
  public async clearMessageLogs(req: Request, res: Response): Promise<void> {
    try {
      const success = await this.messageMonitoringService.clearMessageLogs();

      if (success) {
        res.json({
          success: true,
          message: 'Message logs cleared successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to clear message logs',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error clearing message logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear message logs',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /api/monitoring/messages/tail - Get latest message logs (for real-time monitoring)
   */
  public async getTailLogs(req: Request, res: Response): Promise<void> {
    try {
      const lines = parseInt(req.query.lines as string) || 50;
      const type = req.query.type as 'received' | 'sent' | 'failed' | 'processing' | 'error' | undefined;

      // Get the most recent logs (offset = 0, get latest)
      const result = await this.messageMonitoringService.getMessageLogs(lines, 0, type);

      res.json({
        success: true,
        data: {
          logs: result.logs.reverse(), // Reverse to show newest first
          total: result.total,
          hasMore: result.hasMore
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting tail logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tail logs',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }
}
