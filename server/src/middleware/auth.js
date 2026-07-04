// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

import { getAuthToken } from '../db/store.js';

/**
 * Validates the auth token from headers.
 * Env var CCP_AUTH_TOKEN takes precedence if set.
 */
export function authMiddleware(req, res, next) {
  const token = process.env.CCP_AUTH_TOKEN || getAuthToken() || 'super';

  const fromHeader =
    req.headers['x-api-key'] ||
    (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '') ||
    req.headers['anthropic-auth-token'];

  if (!fromHeader || fromHeader !== token) {
    return res.status(401).json({
      type: 'error',
      error: {
        type: 'authentication_error',
        message: `Invalid or missing API key. Set x-api-key, Authorization: Bearer, or anthropic-auth-token header.`,
      },
    });
  }
  next();
}
