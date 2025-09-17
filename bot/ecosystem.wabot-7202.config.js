module.exports = {
  apps: [{
    name: 'wabot-7202',
    script: 'dist/index.js',
    args: '7202',
    cwd: '/home/linuxuser/bot-manager/bot',
    
    // Node.js memory optimization - optimized for WhatsApp bot
    node_args: [
      "--max-old-space-size=512",  // Increase heap limit to 512MB
      "--optimize-for-size",       // Optimize for memory usage
      // Remove aggressive GC that was causing high heap pressure
    ],
    
    env: {
      BOT_ID: 'whatsapp-bot-1755381969910',
      ENABLE_METRICS: 'true',
      BOT_PORT: '7202',
      NODE_ENV: 'production',
      TZ: 'America/Santo_Domingo'
    },
    error_file: '/home/linuxuser/.pm2/logs/wabot-7202-error.log',
    out_file: '/home/linuxuser/.pm2/logs/wabot-7202-out.log',
    log_file: '/home/linuxuser/.pm2/logs/wabot-7202.log',
    pid_file: '/home/linuxuser/.pm2/pids/wabot-7202.pid',
    max_memory_restart: '512M',  // Align with heap limit
    restart_delay: 4000
  }]
};
