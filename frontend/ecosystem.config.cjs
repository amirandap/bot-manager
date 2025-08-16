module.exports = {
  apps: [
    {
      name: "bot-manager-frontend",
      script: "npm",
      args: "start",
      cwd: "/home/linuxuser/bot-manager/frontend",
      watch: false,
      autorestart: true,
      max_restarts: 5,
      env: {
        NODE_ENV: "production",
        PORT: 7260,
        FRONTEND_PORT: 7260,
        FRONTEND_HOST: "0.0.0.0",
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001",
        BACKEND_PORT: 3001,
        BOT_PORT_START: 7261
      },
      error_file: "/home/linuxuser/bot-manager/logs/bot-manager-frontend-error.log",
      out_file: "/home/linuxuser/bot-manager/logs/bot-manager-frontend-out.log",
      log_file: "/home/linuxuser/bot-manager/logs/bot-manager-frontend-combined.log",
      time: true,
    },
  ],
};
