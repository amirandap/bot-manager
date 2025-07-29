module.exports = {
  apps: [
    {
      name: "bot-manager-backend",
      script: "dist/app.js",
      cwd: "/home/linuxuser/bot-manager/backend",
      watch: false,
      autorestart: true,
      max_restarts: 5,
      min_uptime: "10s",
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 3001,
        SERVER_HOST: "0.0.0.0",
        FRONTEND_URL: "http://localhost:7260",
        BOT_CONFIG_PATH: "../config/bots.json",
        DEFAULT_BOT_HOST: "localhost",
        CHROME_PATH: "/snap/bin/chromium",
        LOG_LEVEL: "debug"
      },
      error_file: "/home/linuxuser/bot-manager/logs/bot-manager-backend-error.log",
      out_file: "/home/linuxuser/bot-manager/logs/bot-manager-backend-out.log",
      log_file: "/home/linuxuser/bot-manager/logs/bot-manager-backend-combined.log",
      time: true,
    },
  ],
};
