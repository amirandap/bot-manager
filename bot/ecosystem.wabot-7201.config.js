module.exports = {
  apps: [{
    name: 'wabot-7201',
    script: 'dist/index.js',
    args: '7201',
    cwd: '/home/linuxuser/bot-manager/bot',
    node_args: '--max-old-space-size=384 --gc-interval=100',
    env: {
      BOT_ID: 'whatsapp-bot-1755381964484',
      ENABLE_METRICS: 'true',
      BOT_PORT: '7201',
      NODE_ENV: 'production',
      TZ: 'America/Santo_Domingo'
    },
    error_file: '/home/linuxuser/.pm2/logs/wabot-7201-error.log',
    out_file: '/home/linuxuser/.pm2/logs/wabot-7201-out.log',
    log_file: '/home/linuxuser/.pm2/logs/wabot-7201.log',
    pid_file: '/home/linuxuser/.pm2/pids/wabot-7201.pid',
    max_memory_restart: '450M',
    restart_delay: 4000
  }]
};
