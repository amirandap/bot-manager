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
        NODE_ENV: "production",
        PORT: 3001,
        SERVER_HOST: "0.0.0.0",
        FRONTEND_URL: "https://wapi.softgrouprd.com",
        BOT_CONFIG_PATH: "../config/bots.json",
        DEFAULT_BOT_HOST: "0.0.0.0",
        CHROME_PATH: "/usr/bin/google-chrome",
        LOG_LEVEL: "info"
      },
      error_file: "/home/linuxuser/bot-manager/logs/bot-manager-backend-error.log",
      out_file: "/home/linuxuser/bot-manager/logs/bot-manager-backend-out.log",
      log_file: "/home/linuxuser/bot-manager/logs/bot-manager-backend-combined.log",
      time: true,
    },
  ],
};
