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
        NODE_ENV: "development",
        PORT: 7260,
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:3001",
      },
      error_file: "/home/linuxuser/bot-manager/logs/bot-manager-frontend-error.log",
      out_file: "/home/linuxuser/bot-manager/logs/bot-manager-frontend-out.log",
      log_file: "/home/linuxuser/bot-manager/logs/bot-manager-frontend-combined.log",
      time: true,
    },
  ],
};
