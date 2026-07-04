// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

import { getSettings } from './db/store.js';

export async function getConfig() {
  const cfg = await getSettings();
  return {
    authToken: process.env.CCP_AUTH_TOKEN || cfg.auth_token || 'super',
    encryptionSecret: process.env.CCP_ENCRYPTION_SECRET || 'ccp_default_secret_change_me_32c',
    logLevel: process.env.LOG_LEVEL || cfg.log_level || 'info',
    ...cfg,
  };
}

let _syncConfig = { authToken: process.env.CCP_AUTH_TOKEN || 'super' };

export function getConfigSync() {
  return _syncConfig;
}

export async function refreshConfigCache() {
  _syncConfig = await getConfig();
}

export { getConfigSync as getConfig_SYNC };
