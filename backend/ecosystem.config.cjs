module.exports = {
  apps: [
    {
      name: "eyan-backend",

      cwd: "/home/eyancantimbuhan/eyan-ai-platform/backend",

      script: "dist/index.js",

      interpreter: "node",

      instances: 1,

      exec_mode: "fork",

      watch: false,

      autorestart: true,

      max_memory_restart: "500M",

      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
