module.exports = {
  apps: [
    {
      name: "wadmin-backend",
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
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3001,
      },
      error_file: "/home/linuxuser/bot-manager/logs/wadmin-backend-error.log",
      out_file: "/home/linuxuser/bot-manager/logs/wadmin-backend-out.log",
      log_file: "/home/linuxuser/bot-manager/logs/wadmin-backend-combined.log",
      time: true,
    },
  ],
};
