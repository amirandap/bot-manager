/**
 * PM2 Production Configuration for WhatsApp Bot
 * Optimized for production with reduced logging and metrics noise
 */

module.exports = {
  apps: [
    {
      name: "wabot-7201",
      script: "src/index.ts",
      interpreter: "./node_modules/.bin/ts-node",
      interpreter_args: "--files --transpile-only",
      
      // Node.js memory optimization
      node_args: [
        "--max-old-space-size=256",
        "--optimize-for-size",
        "--gc-interval=100",
        "--max-semi-space-size=64"
      ],
      
      // Environment configuration
      env: {
        NODE_ENV: "production",
        BOT_PORT: "7997",
        BOT_ID: "whatsapp-bot-1755312244601",
        CHROME_PATH: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        
        // Disable PM2 metrics logging to reduce log noise
        PM2_ADVANCED_METRICS: "false",
        PM2_DISABLE_LOGGING: "false",
        
        // Disable internal PM2 debug logs
        DEBUG: "",
        PM2_SILENT: "false"
      },
      
      // Working directory
      cwd: "/Users/amiranda/Github/bot-manager-amp/bot",
      
      // Log configuration - using custom paths for better organization
      error_file: "/Users/amiranda/Github/bot-manager-amp/data/logs/whatsapp-bot-1755312244601/error-0.log",
      out_file: "/Users/amiranda/Github/bot-manager-amp/data/logs/whatsapp-bot-1755312244601/out-0.log",
      log_file: "/Users/amiranda/Github/bot-manager-amp/data/logs/whatsapp-bot-1755312244601/combined-0.log",
      
      // PM2 specific settings
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      
      // Disable PM2 internal metrics and monitoring features that generate noise
      pmx: false,
      
      // Reduce restart attempts
      max_restarts: 5,
      min_uptime: "10s",
      
      // Log rotation to prevent log files from growing too large
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      
      // Kill timeout
      kill_timeout: 5000,
      
      // Disable automatic restart on specific exit codes
      stop_exit_codes: [0]
    }
  ]
};
