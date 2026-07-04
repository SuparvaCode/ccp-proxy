// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

import { insertLog } from '../db/store.js';

export function requestLogger(req, _res, next) {
  req.ccpLog = {
    endpoint: req.path.replace(/^\//, ''),
    start: Date.now(),
    request_id: req.headers['x-request-id'] || crypto.randomUUID(),
    stream: !!(req.body && req.body.stream),
  };
  next();
}

export function finalizeLog(req, logData) {
  if (!req.ccpLog) return;
  const entry = {
    ...req.ccpLog,
    ...logData,
    latency_ms: Date.now() - req.ccpLog.start,
  };
  insertLog(entry).catch(e => console.error('[Logger]', e.message));
}
