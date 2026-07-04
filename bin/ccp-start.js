#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const serverIndex = path.join(__dirname, '../server/src/index.js');

console.log('⚡ Starting Claude Code Proxy (CCP)...');
const child = spawn('node', [serverIndex], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..')
});

child.on('close', (code) => {
  process.exit(code || 0);
});
