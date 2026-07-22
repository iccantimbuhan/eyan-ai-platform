module.exports = {
  apps: [
    {
      name: "eyan-backend",

      cwd: __dirname,

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
