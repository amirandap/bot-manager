module.exports = {
  apps: [
    {
      name: "wadmin-backend",
      script: "dist/app.js",
      cwd: "backend",
      watch: false,
      autorestart: true,
      max_restarts: 5,
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
    {
      name: "wadmin-frontend",
      script: "npm",
      args: "start",
      cwd: "frontend",
      watch: false,
      autorestart: true,
      max_restarts: 5,
      env: {
        NODE_ENV: "production",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
