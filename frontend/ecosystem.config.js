module.exports = {
  apps: [
    {
      name: "wadmin-frontend",
      script: "npm",
      args: "start",
      watch: false,
      autorestart: true,
      max_restarts: 5,
      env: {
        NODE_ENV: "production",
        PORT: 7261,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 7261,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 7261,
      },
    },
  ],
};
