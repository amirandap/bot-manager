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

        const process = processDescription[0];
        const env = process.pm2_env;
        const monit = process.monit;

        // Métricas básicas disponibles
        const allMetrics = {
          // Información del proceso
          name: process.name,
          pid: process.pid,
          status: env.status,
          uptime: env.pm_uptime,
          restarts: env.restart_time,

          // Métricas de rendimiento
          cpu: monit?.cpu || 0,
          memory: Math.round((monit?.memory || 0) / 1024 / 1024), // Convert to MB

          // Métricas de la aplicación (si están disponibles)
          heap_size: env.axm_monitor?.["Heap Size"]?.value || 0,
          heap_usage: env.axm_monitor?.["Heap Usage"]?.value || 0,
          event_loop_latency:
            env.axm_monitor?.["Event Loop Latency"]?.value || 0,
          active_handles: env.axm_monitor?.["Active handles"]?.value || 0,
          active_requests: env.axm_monitor?.["Active requests"]?.value || 0,

          // Métricas customizadas del bot - dinámicamente extraídas
          customMetrics: this.extractCustomMetrics(env.axm_monitor),

          // Logs
          log_path: env.pm_out_log_path,
          error_log_path: env.pm_err_log_path,

          // Variables de entorno (filtradas)
          node_version: env.node_version,

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
    Object.keys(axmMonitor).forEach(metricName => {
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
   * Convierte nombre de métrica a camelCase
   */
  private convertToCamelCase(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remover caracteres especiales
      .split(/\s+/) // Dividir por espacios
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }
}
