module.exports = {
  apps: [{
    name: 'riichi-atelier',
    cwd: __dirname,
    script: 'hypnotoad',
    args: ['-f', 'app.pl'],
    interpreter: 'none',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    kill_timeout: 10000,
    time: true,
    env: {
      PORT: process.env.PORT || '8080',
      MOJO_MODE: 'production'
    }
  }]
};
