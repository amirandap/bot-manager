const pm2 = require("pm2");

export class PM2MetricsClient {
  private connected: boolean = false;

  /**
   * Conectar a PM2
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      pm2.connect((err: any) => {
        if (err) {
          reject(err);
          return;
        }
        this.connected = true;
        resolve();
      });
    });
  }

  /**
   * Desconectar de PM2
   */
  disconnect(): void {
    if (this.connected) {
      pm2.disconnect();
      this.connected = false;
    }
  }

  /**
   * Obtener métricas de un proceso específico
   */
  async getProcessMetrics(
    processName: string,
    metrics: string[] = []
  ): Promise<any> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      pm2.describe(processName, (err: any, processDescription: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        if (processDescription.length === 0) {
          reject(new Error(`Process ${processName} not found`));
          return;
        }

        try {
          const process = processDescription[0];
          const env = process.pm2_env || {};
          const monit = process.monit || {};

          // Safely extract metrics with fallbacks for transitional states
          const allMetrics = {
            // Información del proceso (siempre disponible)
            name: process.name,
            pid: process.pid || undefined,
            status: env.status || "unknown",
            uptime: env.pm_uptime || undefined,
            restarts: env.restart_time || 0,

            // Métricas de rendimiento (pueden no estar disponibles en estados transitorios)
            cpu: this.safeGetNumber(monit?.cpu),
            memory: this.safeGetNumber(monit?.memory) ? Math.round((monit.memory || 0) / 1024 / 1024) : undefined,

            // Métricas de la aplicación (opcionales, pueden fallar en estados como QR_READY)
            heap_size: this.safeGetMetricValue(env.axm_monitor, "Heap Size"),
            heap_usage: this.safeGetMetricValue(env.axm_monitor, "Heap Usage"),
            event_loop_latency: this.safeGetMetricValue(env.axm_monitor, "Event Loop Latency"),
            active_handles: this.safeGetMetricValue(env.axm_monitor, "Active handles"),
            active_requests: this.safeGetMetricValue(env.axm_monitor, "Active requests"),

            // Métricas customizadas del bot - dinámicamente extraídas (con manejo de errores)
            customMetrics: this.safeExtractCustomMetrics(env.axm_monitor),

            // Logs (pueden no estar disponibles)
            log_path: env.pm_out_log_path || undefined,
            error_log_path: env.pm_err_log_path || undefined,

            // Variables de entorno (filtradas)
            node_version: env.node_version || undefined,

            // Métricas customizadas completas (si existen)
            custom_metrics: env.axm_monitor || {},
          };

          // Si se especifican métricas específicas, filtrar
          if (metrics.length > 0) {
            const filteredMetrics: any = {};
            metrics.forEach((metric) => {
              if (allMetrics.hasOwnProperty(metric)) {
                filteredMetrics[metric] = (allMetrics as any)[metric];
              }
            });
            resolve(filteredMetrics);
          } else {
            resolve(allMetrics);
          }
        } catch (extractionError) {
          // Si hay error extrayendo métricas, devolver métricas básicas
          console.warn(`⚠️ Error extracting metrics for ${processName}, returning basic info:`, extractionError);
          const basicMetrics = {
            name: processName,
            status: "unknown",
            customMetrics: {},
            custom_metrics: {},
          };
          resolve(basicMetrics);
        }
      });
    });
  }

  /**
   * Obtener métricas customizadas específicas del bot-manager
   */
  async getCustomMetrics(
    processName: string,
    customMetrics: string[] = []
  ): Promise<any> {
    const metrics = await this.getProcessMetrics(processName);

    if (!metrics.custom_metrics) {
      return {};
    }

    const customData: any = {};

    // Si no se especifican métricas, devolver todas las customizadas
    if (customMetrics.length === 0) {
      return metrics.custom_metrics;
    }

    // Filtrar métricas específicas
    customMetrics.forEach((metricName) => {
      if (metrics.custom_metrics[metricName]) {
        customData[metricName] = metrics.custom_metrics[metricName];
      }
    });

    return customData;
  }

  /**
   * Obtener métricas de todos los procesos
   */
  async getAllProcessMetrics(metrics: string[] = []): Promise<any[]> {
    if (!this.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      pm2.list((err: any, processList: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const allMetrics = processList.map((process) => {
          const env = process.pm2_env;
          const monit = process.monit;

          const processMetrics = {
            name: process.name,
            pid: process.pid,
            status: env.status,
            uptime: env.pm_uptime,
            restarts: env.restart_time,
            cpu: monit?.cpu || 0,
            memory: Math.round((monit?.memory || 0) / 1024 / 1024),
            heap_size: env.axm_monitor?.["Heap Size"]?.value || 0,
            heap_usage: env.axm_monitor?.["Heap Usage"]?.value || 0,
            event_loop_latency:
              env.axm_monitor?.["Event Loop Latency"]?.value || 0,
            custom_metrics: env.axm_monitor || {},
          };

          // Filtrar métricas si se especifican
          if (metrics.length > 0) {
            const filtered: any = {};
            metrics.forEach((metric) => {
              if (processMetrics.hasOwnProperty(metric)) {
                filtered[metric] = (processMetrics as any)[metric];
              }
            });
            return filtered;
          }

          return processMetrics;
        });

        resolve(allMetrics);
      });
    });
  }

  /**
   * Extrae métricas customizadas dinámicamente de axm_monitor
   */
  private extractCustomMetrics(axmMonitor: any): Record<string, any> {
    if (!axmMonitor) {
      return {};
    }

    const customMetrics: Record<string, any> = {};

    // Convertir nombres de métricas a camelCase y extraer valores
    Object.keys(axmMonitor).forEach((metricName) => {
      const metric = axmMonitor[metricName];
      const value = metric?.value;

      if (value !== undefined) {
        // Convertir nombre de métrica a camelCase
        const camelCaseName = this.convertToCamelCase(metricName);
        customMetrics[camelCaseName] = value;
      }
    });

    return customMetrics;
  }

  /**
   * Extrae métricas customizadas de forma segura (maneja errores en estados transitorios)
   */
  private safeExtractCustomMetrics(axmMonitor: any): Record<string, any> {
    try {
      return this.extractCustomMetrics(axmMonitor);
    } catch (error) {
      console.warn(`⚠️ Error extracting custom metrics:`, error);
      return {};
    }
  }

  /**
   * Obtiene un valor numérico de forma segura
   */
  private safeGetNumber(value: any): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }

  /**
   * Obtiene el valor de una métrica de axm_monitor de forma segura
   */
  private safeGetMetricValue(axmMonitor: any, metricName: string): any {
    try {
      if (!axmMonitor || !axmMonitor[metricName]) {
        return undefined;
      }
      return axmMonitor[metricName]?.value;
    } catch (error) {
      console.warn(`⚠️ Error getting metric ${metricName}:`, error);
      return undefined;
    }
  }

  /**
   * Convierte nombre de métrica a camelCase
   */
  private convertToCamelCase(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, "") // Remover caracteres especiales
      .split(/\s+/) // Dividir por espacios
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join("");
  }
}
