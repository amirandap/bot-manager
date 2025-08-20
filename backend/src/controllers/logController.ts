import { Request, Response } from "express";
import { LogService } from "../services/logService";

export class LogController {
  private logService: LogService;

  constructor() {
    this.logService = new LogService();
  }

  /**
   * Get logs for a specific bot with pagination
   */
  public async getBotLogs(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      const { 
        lines = "100", 
        offset = "0", 
        type = "combined" 
      } = req.query;

      console.log(`📋 Getting logs for bot ${botId} (lines: ${lines}, offset: ${offset}, type: ${type})`);

      const logsResponse = await this.logService.getBotLogs(botId, {
        lines: parseInt(lines as string),
        offset: parseInt(offset as string),
        type: type as "combined" | "error" | "out",
      });

      res.json(logsResponse);
    } catch (error) {
      console.error("LogController: Error getting bot logs:", error);
      
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ 
          error: "Bot not found",
          details: error.message 
        });
        return;
      }

      res.status(500).json({
        error: "Failed to retrieve logs",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get recent logs for a bot (tail equivalent)
   */
  public async getTailLogs(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      const { 
        lines = "50", 
        type = "combined" 
      } = req.query;

      console.log(`📋 Getting tail logs for bot ${botId} (lines: ${lines}, type: ${type})`);

      const logs = await this.logService.getTailLogs(
        botId,
        parseInt(lines as string),
        type as "combined" | "error" | "out"
      );

      res.json(logs);
    } catch (error) {
      console.error("LogController: Error getting tail logs:", error);
      
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ 
          error: "Bot not found",
          details: error.message 
        });
        return;
      }

      res.status(500).json({
        error: "Failed to retrieve tail logs",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get available log files for a bot
   */
  public async getLogFiles(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;

      console.log(`📋 Getting log files for bot ${botId}`);

      const files = this.logService.getAvailableLogFiles(botId);

      res.json(files);
    } catch (error) {
      console.error("LogController: Error getting log files:", error);
      
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ 
          error: "Bot not found",
          details: error.message 
        });
        return;
      }

      res.status(500).json({
        error: "Failed to retrieve log files",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get log statistics for a bot
   */
  public async getLogStats(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;

      console.log(`📊 Getting log stats for bot ${botId}`);

      const stats = await this.logService.getLogStats(botId);

      res.json(stats);
    } catch (error) {
      console.error("LogController: Error getting log stats:", error);
      
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ 
          error: "Bot not found",
          details: error.message 
        });
        return;
      }

      res.status(500).json({
        error: "Failed to retrieve log stats",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Clear logs for a specific bot
   */
  public async clearBotLogs(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;
      const { type } = req.query;

      console.log(`🧹 Clearing logs for bot ${botId} (type: ${type || "all"})`);

      const success = await this.logService.clearBotLogs(
        botId,
        type as "combined" | "error" | "out" | undefined
      );

      if (success) {
        res.json({
          success: true,
          message: `Logs cleared successfully for bot ${botId}`,
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to clear logs",
        });
      }
    } catch (error) {
      console.error("LogController: Error clearing logs:", error);
      
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ 
          error: "Bot not found",
          details: error.message 
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: "Failed to clear logs",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
