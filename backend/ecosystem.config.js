module.exports = {
  apps: [
    {
      name: "wadmin-backend",
      script: "dist/app.js",
      watch: false,
      autorestart: true,
      max_restarts: 5,
      node_args: "-r ts-node/register -r tsconfig-paths/register",
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
    },
  ],
};
