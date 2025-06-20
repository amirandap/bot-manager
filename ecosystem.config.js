module.exports = {
  apps: [
    {
      name: "wadmin-backend",
      script: "dist/app.js",
      cwd: "backend",
      watch: false,
      autorestart: true,
      max_restarts: 5,
      node_args: "-r ts-node/register -r tsconfig-paths/register",
      env: {
        NODE_ENV: "production",
      },
      env_production: {
        NODE_ENV: "production",
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
