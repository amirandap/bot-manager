module.exports = {
  apps: [
    {
      name: "bot-manager-backend",
      script: "./backend/dist/app.js",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      log_file: "./logs/backend-combined.log",
      out_file: "./logs/backend-out.log",
      error_file: "./logs/backend-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
    {
      name: "bot-manager-frontend",
      script: "npm",
      args: "start",
      cwd: "./frontend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 7261,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 7261,
      },
      log_file: "./logs/frontend-combined.log",
      out_file: "./logs/frontend-out.log",
      error_file: "./logs/frontend-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],

  deploy: {
    production: {
      user: "deployer",
      host: ["your-server.com"],
      ref: "origin/main",
      repo: "git@github.com:yourusername/bot-manager.git",
      path: "/var/www/bot-manager",
      "pre-deploy-local": "",
      "post-deploy":
        "npm install && npm run build && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "",
    },
  },
};
