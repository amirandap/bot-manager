import pm2 from "pm2";
import { exec } from "child_process";
import { promisify } from "util";
import { PM2MetricsClient } from "./PM2MetricsClient";

const execAsync = promisify(exec);

export interface PM2ProcessMetrics {
  // Basic process info
  name: string;
  status: "online" | "stopped" | "errored" | "launching" | "unknown";
  pid?: number;
  uptime?: number;
  restarts?: number;

  // Resource usage
  cpu?: number;
  memory?: number; // in MB

  // Advanced metrics
  activeHandles?: number;
  activeRequests?: number;
  eventLoopLatency?: number;
  heapUsage?: number;
  heapSize?: number;
  usedHeapSize?: number;
  errorCount?: number;

  // HTTP metrics (if available)
  httpRequests?: number;
  httpLatencyMean?: number;
  httpLatencyP95?: number;

  // Bot-specific custom metrics (dynamic)
  [key: string]: any; // Allow any custom metrics

  // PM2 environment
  pm2Id?: number;
  createdAt?: string;
  nodeVersion?: string;
  execPath?: string;
  logPath?: string;
  errorLogPath?: string;
  outLogPath?: string;
}

export interface PM2CustomMetrics {
  // Component status metrics (if bot implements PM2 metrics integration)
  componentStatus?: {
    startup?: ComponentMetrics;
    whatsapp?: ComponentMetrics;
    api?: ComponentMetrics;
    system?: ComponentMetrics;
    qr?: ComponentMetrics;
    [key: string]: ComponentMetrics | undefined;
  };
}

export interface ComponentMetrics {
  status: number; // 0-4 (INITIALIZING, RUNNING, WARNING, ERROR, STOPPED)
  statusName: string;
  totalEvents: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  lastEventTime: string;
  uptimeSeconds: number;
  customMetrics?: Record<string, number>;
}

export class PM2MetricsService {
  private static instance: PM2MetricsService;

  public static getInstance(): PM2MetricsService {
    if (!PM2MetricsService.instance) {
      PM2MetricsService.instance = new PM2MetricsService();
    }
    return PM2MetricsService.instance;
  }

  /**
   * Get comprehensive PM2 metrics for a specific process
   */
  public async getProcessMetrics(
    processName: string
  ): Promise<PM2ProcessMetrics | null> {
    try {
      // Use PM2MetricsClient for all metrics - no more text parsing!
      const metrics = await this.getBasicProcessMetrics(processName);
      return metrics;
    } catch (error) {
      console.error(`❌ Failed to get PM2 metrics for ${processName}:`, error);
      return null;
    }
  }

  /**
   * Get basic process metrics using PM2MetricsClient
   */
  private async getBasicProcessMetrics(
    processName: string
  ): Promise<PM2ProcessMetrics | null> {
    try {
      const client = new PM2MetricsClient();
      const metrics = await client.getProcessMetrics(processName);
      client.disconnect();

      if (!metrics) {
        console.log(`ℹ️ PM2 process ${processName} not found`);
        return null;
      }

      // Map from client format to our interface
      const processMetrics: PM2ProcessMetrics = {
        name: metrics.name,
        status: this.mapPM2Status(metrics.status || "unknown"),
        pid: metrics.pid,
        uptime: metrics.uptime ? Date.now() - metrics.uptime : undefined,
        restarts: metrics.restarts || 0,
        cpu: metrics.cpu || 0,
        memory: metrics.memory || 0,

        // System metrics
        activeHandles: metrics.active_handles,
        activeRequests: metrics.active_requests,
        eventLoopLatency: metrics.event_loop_latency,
        heapUsage: metrics.heap_usage,
        heapSize: metrics.heap_size,
        usedHeapSize: metrics.used_heap_size,

        // Custom bot metrics - these come directly from PM2's axm_monitor (dynamic)
        ...(metrics.customMetrics || {}),

        // PM2 specific fields
        pm2Id: undefined,
        createdAt: undefined,
        nodeVersion: metrics.node_version,
        execPath: undefined,
        logPath: metrics.log_path,
        errorLogPath: metrics.error_log_path,
        outLogPath: metrics.log_path,
      };

      console.log(`📊 PM2 Metrics extracted via API for ${processName}:`, {
        status: processMetrics.status,
        cpu: processMetrics.cpu,
        memory: processMetrics.memory,
        customMetrics: Object.keys(metrics.customMetrics || {}).length > 0 ? metrics.customMetrics : 'none'
      });

      return processMetrics;
    } catch (error) {
      console.error(`❌ Failed to get PM2 metrics for ${processName}:`, error);
      return null;
    }
  }

  /**
   * Try to get custom bot metrics via PM2 triggers (if implemented)
   */
  public async getCustomBotMetrics(
    processName: string
  ): Promise<PM2CustomMetrics> {
    try {
      // Try to get custom metrics via PM2 trigger
      const { stdout } = await execAsync(
        `pm2 trigger ${processName} get_all_status`
      );

      if (stdout && stdout.trim()) {
        // Parse the response if it's JSON
        try {
          const customMetrics = JSON.parse(stdout);
          return { componentStatus: customMetrics };
        } catch (parseError) {
          console.warn(
            `⚠️ Failed to parse custom metrics response:`,
            parseError
          );
        }
      }
    } catch (error) {
      // Custom metrics not implemented or PM2 trigger failed
      console.log(`ℹ️ Custom PM2 metrics not available for ${processName}`);
    }

    return {};
  }

  /**
   * Get all PM2 processes with their metrics
   */
  public async getAllProcessesMetrics(): Promise<PM2ProcessMetrics[]> {
    try {
      const { stdout } = await execAsync("pm2 jlist");
      const processes = JSON.parse(stdout);

      const metrics: PM2ProcessMetrics[] = [];

      for (const proc of processes) {
        const processMetrics = await this.getProcessMetrics(proc.name);
        if (processMetrics) {
          metrics.push(processMetrics);
        }
      }

      return metrics;
    } catch (error) {
      console.error(`❌ Failed to get all PM2 processes metrics:`, error);
      return [];
    }
  }

  /**
   * Check if a PM2 process is healthy based on metrics
   */
  public evaluateProcessHealth(metrics: PM2ProcessMetrics): {
    status: "healthy" | "warning" | "critical" | "unknown";
    issues: string[];
    score: number; // 0-100
  } {
    const issues: string[] = [];
    let score = 100;

    // Check basic status
    if (metrics.status !== "online") {
      issues.push(`Process is ${metrics.status}`);
      score -= 50;
    }

    // Check memory usage (warning if > 500MB, critical if > 1GB)
    if (metrics.memory) {
      if (metrics.memory > 1024) {
        issues.push(`High memory usage: ${metrics.memory}MB`);
        score -= 30;
      } else if (metrics.memory > 512) {
        issues.push(`Elevated memory usage: ${metrics.memory}MB`);
        score -= 15;
      }
    }

    // Check CPU usage (warning if > 80%)
    if (metrics.cpu && metrics.cpu > 80) {
      issues.push(`High CPU usage: ${metrics.cpu}%`);
      score -= 20;
    }

    // Check restarts (warning if > 5, critical if > 10)
    if (metrics.restarts) {
      if (metrics.restarts > 10) {
        issues.push(`Too many restarts: ${metrics.restarts}`);
        score -= 25;
      } else if (metrics.restarts > 5) {
        issues.push(`Multiple restarts: ${metrics.restarts}`);
        score -= 10;
      }
    }

    // Check error count
    if (metrics.errorCount && metrics.errorCount > 0) {
      issues.push(`Errors detected: ${metrics.errorCount}`);
      score -= 15;
    }

    // Check heap usage (warning if > 90%)
    if (metrics.heapUsage && metrics.heapUsage > 90) {
      issues.push(`High heap usage: ${metrics.heapUsage}%`);
      score -= 20;
    }

    // Determine overall status
    let status: "healthy" | "warning" | "critical" | "unknown";
    if (score >= 80) {
      status = "healthy";
    } else if (score >= 60) {
      status = "warning";
    } else if (score >= 0) {
      status = "critical";
    } else {
      status = "unknown";
    }

    return { status, issues, score: Math.max(0, score) };
  }

  /**
   * Map PM2 status strings to our standard status
   */
  private mapPM2Status(
    pm2Status: string
  ): "online" | "stopped" | "errored" | "launching" | "unknown" {
    switch (pm2Status) {
      case "online":
        return "online";
      case "stopped":
        return "stopped";
      case "errored":
        return "errored";
      case "launching":
        return "launching";
      default:
        return "unknown";
    }
  }

  /**
   * Parse metric values from PM2 monitor data
   */
  private parseMetricValue(
    value: any,
    isPercentage: boolean = false
  ): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      // Remove units and parse
      const cleaned = value
        .toString()
        .replace(/[^\d.-]/g, "")
        .trim();

      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? undefined : parsed;
    }

    return undefined;
  }
}

// Export singleton instance
export const pm2MetricsService = PM2MetricsService.getInstance();
