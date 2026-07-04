#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

const { spawn } = require('child_process');
const path = require('path');

const serverIndex = path.join(__dirname, '../server/src/index.js');

function start() {
  console.log('\n⚡ CCP — Starting Claude Code Proxy...');
  const child = spawn('node', [serverIndex], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });

  child.on('close', (code) => {
    if (code === 42) {
      console.log('\n🔄 CCP — Restarting server (requested by admin)...');
      // Small delay to allow port to free up
      setTimeout(start, 500);
    } else {
      process.exit(code ?? 0);
    }
  });

  child.on('error', (err) => {
    console.error('[ccp-start] Failed to launch server process:', err.message);
    process.exit(1);
  });
}

start();
