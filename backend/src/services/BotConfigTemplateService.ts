import fs from 'fs';
import path from 'path';

export interface PM2TemplateConfig {
  pm2Config: {
    nodeArgs: string[];
    memory: {
      maxMemoryRestart: string;
      maxRestarts: number;
      minUptime: number;
    };
    timeouts: {
      listenTimeout: number;
      killTimeout: number;
      restartDelay: number;
    };
    environment: {
      nodeEnv: string;
      pm2AdvancedMetrics: string;
      pm2DisableLogging: string;
      pm2Silent: string;
      debug: string;
      silentMetrics: string;
      logLevel: string;
    };
  };
  puppeteerOptimizations: {
    chromeArgs: {
      memoryPressureOff: boolean;
      maxOldSpaceSize: number;
      aggressiveCacheDiscard: boolean;
      purgeMemoryButton: boolean;
    };
    diskCache: {
      diskCacheSize: number;
      mediaCacheSize: number;
    };
  };
  monitoringConfig: {
    zombieDetectionInterval: number;
    cacheMaintenanceInterval: number;
    heapMonitoringInterval: number;
    browserMetricsInterval: number;
  };
  debugConfig: {
    enableDebugLogs: boolean;
    enableMetricsLogging: boolean;
    enablePerformanceTracking: boolean;
  };
}

export class BotConfigTemplateService {
  private static instance: BotConfigTemplateService;
  private templateConfig: PM2TemplateConfig | null = null;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(__dirname, '../../../config/bot-pm2-template.json');
  }

  public static getInstance(): BotConfigTemplateService {
    if (!BotConfigTemplateService.instance) {
      BotConfigTemplateService.instance = new BotConfigTemplateService();
    }
    return BotConfigTemplateService.instance;
  }

  /**
   * Load the template configuration from JSON file
   */
  public loadTemplate(): PM2TemplateConfig {
    try {
      if (!this.templateConfig) {
        console.log(`📋 Loading bot PM2 template from: ${this.configPath}`);
        
        if (!fs.existsSync(this.configPath)) {
          throw new Error(`Template config file not found: ${this.configPath}`);
        }

        const templateData = fs.readFileSync(this.configPath, 'utf8');
        this.templateConfig = JSON.parse(templateData);
        
        console.log(`✅ Bot PM2 template loaded successfully`);
        console.log(`   - Memory limit: ${this.templateConfig!.pm2Config.memory.maxMemoryRestart}`);
        console.log(`   - Node args: ${this.templateConfig!.pm2Config.nodeArgs.join(' ')}`);
        console.log(`   - Max restarts: ${this.templateConfig!.pm2Config.memory.maxRestarts}`);
      }

      return this.templateConfig!;
    } catch (error) {
      console.error(`❌ Failed to load bot PM2 template:`, error);
      
      // Return default fallback configuration
      return this.getDefaultTemplate();
    }
  }

  /**
   * Reload the template configuration from file (useful for hot-reloading)
   */
  public reloadTemplate(): PM2TemplateConfig {
    console.log(`🔄 Reloading bot PM2 template...`);
    this.templateConfig = null;
    return this.loadTemplate();
  }

  /**
   * Get PM2 configuration object for bot spawning
   */
  public getPM2Config(botId: string, botConfig: any): any {
    const template = this.loadTemplate();
    const pm2Config = template.pm2Config;

    return {
      name: `wabot-${botConfig.apiPort}`,
      script: path.join(__dirname, '../../../bot/dist/index.js'),
      args: [String(botConfig.apiPort)],
      node_args: pm2Config.nodeArgs,
      cwd: path.join(__dirname, '../../../bot'),
      env: this.getBotEnvironment(botId, botConfig, template),
      error_file: path.join(__dirname, '../../../data/logs', botId, 'error.log'),
      out_file: path.join(__dirname, '../../../data/logs', botId, 'out.log'),
      log_file: path.join(__dirname, '../../../data/logs', botId, 'combined.log'),
      autorestart: true,
      max_restarts: pm2Config.memory.maxRestarts,
      min_uptime: pm2Config.memory.minUptime,
      max_memory_restart: pm2Config.memory.maxMemoryRestart,
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      wait_ready: true,
      listen_timeout: pm2Config.timeouts.listenTimeout,
      kill_timeout: pm2Config.timeouts.killTimeout,
      restart_delay: pm2Config.timeouts.restartDelay,
    };
  }

  /**
   * Get bot environment variables
   */
  private getBotEnvironment(botId: string, botConfig: any, template: PM2TemplateConfig): Record<string, string> {
    const envConfig = template.pm2Config.environment;
    
    return {
      BOT_ID: botId,
      BOT_NAME: String(botConfig.name),
      BOT_PORT: String(botConfig.apiPort),
      PORT: String(botConfig.apiPort),
      BOT_TYPE: String(botConfig.type || 'whatsapp'),
      BASE_URL: `${botConfig.apiHost}:${botConfig.apiPort}`,
      NODE_ENV: envConfig.nodeEnv,
      PM2_HOME: path.join(__dirname, '../../../data/pm2'),
      TS_NODE_PROJECT: path.join(__dirname, '../../../bot/tsconfig.json'),
      
      // PM2 Metrics Configuration
      PM2_ADVANCED_METRICS: envConfig.pm2AdvancedMetrics,
      PM2_DISABLE_LOGGING: envConfig.pm2DisableLogging,
      PM2_SILENT: envConfig.pm2Silent,
      DEBUG: envConfig.debug,
      
      // Bot-specific metrics configuration
      SILENT_METRICS: envConfig.silentMetrics,
      LOG_LEVEL: envConfig.logLevel,
      
      // Include PATH if it exists
      ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
    };
  }

  /**
   * Get default fallback configuration
   */
  private getDefaultTemplate(): PM2TemplateConfig {
    console.log(`⚠️ Using default fallback bot PM2 template`);
    
    return {
      pm2Config: {
        nodeArgs: ['--max-old-space-size=384', '--gc-interval=100'],
        memory: {
          maxMemoryRestart: '450M',
          maxRestarts: 10,
          minUptime: 60000,
        },
        timeouts: {
          listenTimeout: 30000,
          killTimeout: 15000,
          restartDelay: 4000,
        },
        environment: {
          nodeEnv: 'production',
          pm2AdvancedMetrics: 'false',
          pm2DisableLogging: 'false',
          pm2Silent: 'false',
          debug: '',
          silentMetrics: 'true',
          logLevel: 'info',
        },
      },
      puppeteerOptimizations: {
        chromeArgs: {
          memoryPressureOff: true,
          maxOldSpaceSize: 128,
          aggressiveCacheDiscard: true,
          purgeMemoryButton: true,
        },
        diskCache: {
          diskCacheSize: 268435456,
          mediaCacheSize: 67108864,
        },
      },
      monitoringConfig: {
        zombieDetectionInterval: 300000,
        cacheMaintenanceInterval: 300000,
        heapMonitoringInterval: 30000,
        browserMetricsInterval: 30000,
      },
      debugConfig: {
        enableDebugLogs: false,
        enableMetricsLogging: true,
        enablePerformanceTracking: true,
      },
    };
  }

  /**
   * Update a specific configuration value and save to file
   */
  public updateConfig(path: string, value: any): boolean {
    try {
      const template = this.loadTemplate();
      const pathParts = path.split('.');
      
      let current: any = template;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }
      
      current[pathParts[pathParts.length - 1]] = value;
      
      // Save back to file
      fs.writeFileSync(this.configPath, JSON.stringify(template, null, 2));
      
      // Reload template
      this.templateConfig = template;
      
      console.log(`✅ Updated bot template config: ${path} = ${value}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to update bot template config:`, error);
      return false;
    }
  }

  /**
   * Get monitoring configuration
   */
  public getMonitoringConfig() {
    const template = this.loadTemplate();
    return template.monitoringConfig;
  }

  /**
   * Get Puppeteer optimization configuration
   */
  public getPuppeteerConfig() {
    const template = this.loadTemplate();
    return template.puppeteerOptimizations;
  }

  /**
   * Get debug configuration
   */
  public getDebugConfig() {
    const template = this.loadTemplate();
    return template.debugConfig;
  }
}
