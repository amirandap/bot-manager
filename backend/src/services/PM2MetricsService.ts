import pm2 from "pm2";
import { exec } from "child_process";
import { promisify } from "util";

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

  // Bot-specific custom metrics
  botStatus?: string;
  browserCpuUsage?: number;
  browserMemoryUsage?: number;
  messageProcessingTime?: number;
  qrCodeStatus?: string;
  qrCodesGenerated?: number;
  apiServerStatus?: number;
  whatsappStatus?: string;

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
      const basicMetrics = await this.getBasicProcessMetrics(processName);
      if (!basicMetrics) {
        return null;
      }

      const codeMetrics = await this.getCodeMetrics(processName);

      return {
        ...basicMetrics,
        ...codeMetrics,
      };
    } catch (error) {
      console.error(`❌ Failed to get PM2 metrics for ${processName}:`, error);
      return null;
    }
  }

  /**
   * Get basic process metrics using pm2.describe()
   */
  private async getBasicProcessMetrics(
    processName: string
  ): Promise<PM2ProcessMetrics | null> {
    return new Promise((resolve) => {
      pm2.connect((err) => {
        if (err) {
          console.error(`❌ Failed to connect to PM2:`, err);
          resolve(null);
          return;
        }

        pm2.describe(processName, (describeErr, processDescription) => {
          pm2.disconnect();

          if (
            describeErr ||
            !processDescription ||
            processDescription.length === 0
          ) {
            console.log(`ℹ️ PM2 process ${processName} not found`);
            resolve(null);
            return;
          }

          const proc = processDescription[0] as any;
          const pm2Env = proc?.pm2_env;
          const monit = proc?.monit;

          const metrics: PM2ProcessMetrics = {
            name: pm2Env?.name || processName,
            status: this.mapPM2Status(pm2Env?.status || "unknown"),
            pid: proc?.pid,
            uptime: pm2Env?.pm_uptime
              ? Date.now() - pm2Env.pm_uptime
              : undefined,
            restarts: pm2Env?.restart_time || 0,
            cpu: monit?.cpu,
            memory: monit?.memory
              ? Math.round(monit.memory / 1024 / 1024)
              : undefined,
            pm2Id: pm2Env?.pm_id,
            createdAt: pm2Env?.created_at
              ? new Date(pm2Env.created_at).toISOString()
              : undefined,
            nodeVersion: pm2Env?.node_version,
            execPath: pm2Env?.pm_exec_path,
            logPath: pm2Env?.pm_out_log_path,
            errorLogPath: pm2Env?.pm_err_log_path,
            outLogPath: pm2Env?.pm_out_log_path,
          };

          resolve(metrics);
        });
      });
    });
  }

  /**
   * Get code metrics (heap, event loop, etc.) using pm2 describe for better metric access
   */
  private async getCodeMetrics(
    processName: string
  ): Promise<Partial<PM2ProcessMetrics>> {
    try {
      // First try the original method (pm2 jlist)
      const { stdout: jlistOutput } = await execAsync("pm2 jlist");
      const processes = JSON.parse(jlistOutput);

      const process = processes.find((p: any) => p.name === processName);
      if (!process) {
        return {};
      }

      const axm = process.axm_monitor || {};

      // If axm_monitor has data, use it
      if (Object.keys(axm).length > 0) {
        return {
          activeHandles: this.parseMetricValue(axm["Active handles"]),
          activeRequests: this.parseMetricValue(axm["Active requests"]),
          eventLoopLatency: this.parseMetricValue(axm["Event Loop Latency"]),
          heapUsage: this.parseMetricValue(axm["Heap Usage"], true), // percentage
          heapSize: this.parseMetricValue(axm["Heap Size"]),
          usedHeapSize: this.parseMetricValue(axm["Used Heap Size"]),
          errorCount: this.parseMetricValue(axm["Error Count"]),
          httpRequests: this.parseMetricValue(axm["HTTP"]),
          httpLatencyMean: this.parseMetricValue(axm["HTTP Mean Latency"]),
          httpLatencyP95: this.parseMetricValue(axm["HTTP P95 Latency"]),
        };
      }

      // If axm_monitor is empty, try pm2 describe for custom metrics
      try {
        const { stdout: describeOutput } = await execAsync(
          `pm2 describe ${processName}`
        );

        // Parse the describe output to extract metrics
        const metrics = this.parseDescribeOutput(describeOutput);

        console.log(`📊 Extracted custom metrics for ${processName}:`, metrics);

        return metrics;
      } catch (describeError) {
        console.warn(
          `⚠️ Failed to get describe metrics for ${processName}:`,
          describeError
        );
        return {};
      }
    } catch (error) {
      console.warn(`⚠️ Failed to get code metrics for ${processName}:`, error);
      return {};
    }
  }

  /**
   * Parse PM2 describe output to extract custom bot metrics
   */
  private parseDescribeOutput(
    describeOutput: string
  ): Partial<PM2ProcessMetrics> {
    const metrics: Partial<PM2ProcessMetrics> = {};

    try {
      // Look for the "Code metrics value" section
      const lines = describeOutput.split("\n");
      let inMetricsSection = false;

      for (const line of lines) {
        if (line.includes("Code metrics value")) {
          inMetricsSection = true;
          continue;
        }

        if (inMetricsSection && line.includes("│")) {
          // Parse metric lines like "│ Bot Status              │ Launching Chrome status │"
          const match = line.match(/│\s*([^│]+?)\s*│\s*([^│]+?)\s*│/);
          if (match) {
            const metricName = match[1].trim();
            const metricValue = match[2].trim();

            // Map the specific bot metrics we're interested in
            switch (metricName) {
              case "Bot Status":
                // Store as string for bot status
                (metrics as any).botStatus = metricValue;
                break;
              case "Browser CPU Usage":
                (metrics as any).browserCpuUsage =
                  this.parseMetricValue(metricValue);
                break;
              case "Browser Memory Usage":
                (metrics as any).browserMemoryUsage =
                  this.parseMetricValue(metricValue);
                break;
              case "Message Processing Time":
                (metrics as any).messageProcessingTime =
                  this.parseMetricValue(metricValue);
                break;
              case "Error Count":
                metrics.errorCount = this.parseMetricValue(metricValue);
                break;
              case "Messages Processed":
                metrics.httpRequests = this.parseMetricValue(metricValue);
                break;
              case "QR Code Status":
                (metrics as any).qrCodeStatus = metricValue;
                break;
              case "QR Codes Generated":
                (metrics as any).qrCodesGenerated =
                  this.parseMetricValue(metricValue);
                break;
              case "API Server Status":
                (metrics as any).apiServerStatus =
                  this.parseMetricValue(metricValue);
                break;
              case "WhatsApp Status":
                (metrics as any).whatsappStatus = metricValue;
                break;
              // Keep the original system metrics too
              case "Active handles":
                metrics.activeHandles = this.parseMetricValue(metricValue);
                break;
              case "Active requests":
                metrics.activeRequests = this.parseMetricValue(metricValue);
                break;
              case "Event Loop Latency":
                metrics.eventLoopLatency = this.parseMetricValue(metricValue);
                break;
              case "Heap Usage":
                metrics.heapUsage = this.parseMetricValue(metricValue, true);
                break;
              case "Heap Size":
                metrics.heapSize = this.parseMetricValue(metricValue);
                break;
              case "Used Heap Size":
                metrics.usedHeapSize = this.parseMetricValue(metricValue);
                break;
            }
          }
        }

        // Stop parsing when we reach another section
        if (inMetricsSection && line.includes("Divergent env variables")) {
          break;
        }
      }
    } catch (error) {
      console.warn("⚠️ Failed to parse describe output:", error);
    }

    return metrics;
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
