import { Request, Response } from "express";
import { exec } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export class DeployController {
  private deploymentInProgress = false;
  private deploymentQueue: Array<{
    id: string;
    timestamp: Date;
    branch: string;
    commit: string;
    trigger: "webhook" | "manual";
    status: "queued" | "running" | "success" | "failed";
  }> = [];

  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Verify webhook signature if configured
      if (process.env.WEBHOOK_SECRET) {
        const signature = req.headers["x-hub-signature-256"] as string;
        if (!this.verifyWebhookSignature(req.body, signature)) {
          res.status(401).json({ error: "Invalid webhook signature" });
          return;
        }
      }

      const payload = req.body;
      const branch = payload.ref?.replace("refs/heads/", "") || "main";
      const commit = payload.head_commit?.id || "unknown";
      const commitMessage = payload.head_commit?.message || "";

      // Only deploy on main/master branch
      if (!["main", "master"].includes(branch)) {
        res.json({ message: `Ignoring deployment for branch: ${branch}` });
        return;
      }

      // Create deployment entry
      const deploymentId = this.generateDeploymentId();
      this.deploymentQueue.push({
        id: deploymentId,
        timestamp: new Date(),
        branch,
        commit,
        trigger: "webhook",
        status: "queued",
      });

      res.json({
        message: "Deployment queued successfully",
        deploymentId,
        branch,
        commit: commit.substring(0, 8),
        commitMessage,
        position: this.deploymentQueue.length,
      });

      // Process deployment queue
      this.processDeploymentQueue();
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Deployment failed" });
    }
  }

  public async getDeploymentStatus(req: Request, res: Response): Promise<void> {
    res.json({
      deploymentInProgress: this.deploymentInProgress,
      queueLength: this.deploymentQueue.length,
      queue: this.deploymentQueue.map((d) => ({
        id: d.id,
        branch: d.branch,
        commit: d.commit.substring(0, 8),
        status: d.status,
        timestamp: d.timestamp,
      })),
      lastDeployment: this.getLastDeploymentInfo(),
    });
  }

  public async getDeploymentHistoryEndpoint(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const history = this.getDeploymentHistory(limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching deployment history:", error);
      res.status(500).json({ error: "Failed to fetch deployment history" });
    }
  }

  public async triggerManualDeploy(req: Request, res: Response): Promise<void> {
    try {
      const { branch = "main", force = false } = req.body;

      // Check if deployment is already in progress (unless forced)
      if (this.deploymentInProgress && !force) {
        res.status(409).json({
          error: "Deployment already in progress",
          suggestion: "Use force=true to override",
        });
        return;
      }

      const deploymentId = this.generateDeploymentId();
      this.deploymentQueue.push({
        id: deploymentId,
        timestamp: new Date(),
        branch,
        commit: "manual-deploy",
        trigger: "manual",
        status: "queued",
      });

      res.json({
        message: "Manual deployment triggered",
        deploymentId,
        branch,
        position: this.deploymentQueue.length,
      });

      this.processDeploymentQueue();
    } catch (error) {
      console.error("Manual deployment error:", error);
      res.status(500).json({ error: "Manual deployment failed" });
    }
  }

  public async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        deployment: {
          inProgress: this.deploymentInProgress,
          queueLength: this.deploymentQueue.length,
        },
        services: await this.checkServices(),
        disk: await this.checkDiskSpace(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      };

      res.json(health);
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ error: "Health check failed" });
    }
  }

  private verifyWebhookSignature(body: any, signature: string): boolean {
    const secret = process.env.WEBHOOK_SECRET!;
    const hash = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(body))
      .digest("hex");

    return `sha256=${hash}` === signature;
  }

  private async processDeploymentQueue(): Promise<void> {
    if (this.deploymentInProgress || this.deploymentQueue.length === 0) {
      return;
    }

    this.deploymentInProgress = true;
    const deployment = this.deploymentQueue.shift()!;

    try {
      console.log(
        `🚀 Starting deployment for commit ${deployment.commit.substring(0, 8)}`
      );
      await this.executeDeployment(deployment);
      console.log(`✅ Deployment completed successfully`);
    } catch (error) {
      console.error(`❌ Deployment failed:`, error);
      await this.logDeploymentError(deployment, error);
    } finally {
      this.deploymentInProgress = false;

      // Process next deployment in queue
      if (this.deploymentQueue.length > 0) {
        setTimeout(() => this.processDeploymentQueue(), 1000);
      }
    }
  }

  private async executeDeployment(deployment: {
    branch: string;
    commit: string;
  }): Promise<void> {
    const deployScript = path.join(process.cwd(), "scripts/deploy.sh");

    return new Promise((resolve, reject) => {
      const deployProcess = exec(`bash ${deployScript} ${deployment.branch}`, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DEPLOY_COMMIT: deployment.commit,
          DEPLOY_TIMESTAMP: new Date().toISOString(),
        },
      });

      let output = "";
      let errorOutput = "";

      deployProcess.stdout?.on("data", (data) => {
        output += data;
        console.log(`[DEPLOY] ${data.toString().trim()}`);
      });

      deployProcess.stderr?.on("data", (data) => {
        errorOutput += data;
        console.error(`[DEPLOY ERROR] ${data.toString().trim()}`);
      });

      deployProcess.on("close", (code) => {
        if (code === 0) {
          this.logDeploymentSuccess(deployment, output);
          resolve();
        } else {
          reject(
            new Error(`Deploy script failed with code ${code}: ${errorOutput}`)
          );
        }
      });

      deployProcess.on("error", (error) => {
        reject(error);
      });
    });
  }

  private logDeploymentSuccess(deployment: any, output: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      status: "success",
      branch: deployment.branch,
      commit: deployment.commit,
      output: output.split("\n").slice(-10), // Last 10 lines
    };

    this.saveDeploymentLog(logEntry);
  }

  private async logDeploymentError(deployment: any, error: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      status: "failed",
      branch: deployment.branch,
      commit: deployment.commit,
      error: error.message || error.toString(),
    };

    this.saveDeploymentLog(logEntry);
  }

  private saveDeploymentLog(logEntry: any): void {
    try {
      const logsDir = path.join(process.cwd(), "logs");
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const logFile = path.join(logsDir, "deployments.json");
      let logs = [];

      if (fs.existsSync(logFile)) {
        logs = JSON.parse(fs.readFileSync(logFile, "utf8"));
      }

      logs.push(logEntry);

      // Keep only last 50 deployments
      if (logs.length > 50) {
        logs = logs.slice(-50);
      }

      fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error("Failed to save deployment log:", error);
    }
  }

  private getLastDeploymentInfo(): any {
    try {
      const logFile = path.join(process.cwd(), "logs/deployments.json");
      if (!fs.existsSync(logFile)) return null;

      const logs = JSON.parse(fs.readFileSync(logFile, "utf8"));
      return logs[logs.length - 1] || null;
    } catch (error) {
      return null;
    }
  }

  private generateDeploymentId(): string {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  private async checkServices(): Promise<any> {
    return new Promise((resolve) => {
      exec("pm2 jlist", (error, stdout) => {
        if (error) {
          resolve({ status: "error", message: error.message });
          return;
        }

        try {
          const processes = JSON.parse(stdout);
          const services = processes.map((proc: any) => ({
            name: proc.name,
            status: proc.pm2_env.status,
            uptime: proc.pm2_env.pm_uptime,
            memory: proc.monit.memory,
            cpu: proc.monit.cpu,
          }));

          resolve({ status: "ok", services });
        } catch (parseError) {
          resolve({ status: "error", message: "Failed to parse PM2 output" });
        }
      });
    });
  }

  private async checkDiskSpace(): Promise<any> {
    return new Promise((resolve) => {
      exec("df -h /", (error, stdout) => {
        if (error) {
          resolve({ status: "error", message: error.message });
          return;
        }

        const lines = stdout.split("\n");
        const rootLine = lines.find((line) => line.includes("/"));
        if (rootLine) {
          const parts = rootLine.split(/\s+/);
          resolve({
            status: "ok",
            total: parts[1],
            used: parts[2],
            available: parts[3],
            usage: parts[4],
          });
        } else {
          resolve({ status: "error", message: "Could not parse disk usage" });
        }
      });
    });
  }

  private getDeploymentHistory(limit: number = 20): any[] {
    try {
      const logFile = path.join(process.cwd(), "logs/deployments.json");
      if (!fs.existsSync(logFile)) return [];

      const logs = JSON.parse(fs.readFileSync(logFile, "utf8"));
      return logs.slice(-limit).reverse(); // Most recent first
    } catch (error) {
      console.error("Error reading deployment history:", error);
      return [];
    }
  }
}
