module.exports = {
  apps: [{
    name: 'buildplan-agents',
    script: './src/index.js',
    cwd: 'C:\\Users\\Administrator\\Projects\\buildplan\\buildplan-agents',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_file: '.env',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
};
