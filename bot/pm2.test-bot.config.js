module.exports = {
  apps: [{
    name: 'wabot-7997',
    script: 'src/index.ts',
    interpreter: './node_modules/.bin/ts-node',
    interpreter_args: '--files -r tsconfig-paths/register',
    env: {
      NODE_ENV: 'production',
      BOT_PORT: '7997',
      BOT_ID: 'whatsapp-bot-1749931370885',
      CHROME_PATH: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    },
    cwd: '/Users/amiranda/Github/bot-manager-amp/bot',
    error_file: '/Users/amiranda/.pm2/logs/wabot-7997-error.log',
    out_file: '/Users/amiranda/.pm2/logs/wabot-7997-out.log',
    log_file: '/Users/amiranda/.pm2/logs/wabot-7997.log'
  }]
};
