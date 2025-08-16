module.exports = {
  apps: [
    {
      name: "wabot-7997",
      script: "src/index.ts",
      interpreter: "./node_modules/.bin/ts-node",
      interpreter_args: "--files -r tsconfig-paths/register",
      // Environment configuration
      env: {
        NODE_ENV: "development",
        BOT_PORT: "7997",
        BOT_ID: "whatsapp-bot-1",
        CHROME_PATH: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        
        // Disable PM2 metrics logging to reduce log noise
        PM2_ADVANCED_METRICS: "false",
        PM2_DISABLE_LOGGING: "false",
        SILENT_METRICS: "true",
        LOG_LEVEL: "info",
        
        // Disable internal PM2 debug logs
        DEBUG: "",
        PM2_SILENT: "false"
      },
      cwd: "/Users/amiranda/Github/bot-manager-amp/bot",
      error_file: "/Users/amiranda/.pm2/logs/wabot-7997-error.log",
      out_file: "/Users/amiranda/.pm2/logs/wabot-7997-out.log",
      log_file: "/Users/amiranda/.pm2/logs/wabot-7997.log",
    },
  ],
};
