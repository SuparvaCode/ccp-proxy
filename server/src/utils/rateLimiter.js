/**
 * In-memory rate limiter tracking requests/minute and tokens/minute per provider.
 * Resets each minute window.
 */
const windows = new Map();

function getWindow(providerId) {
  const now = Date.now();
  const minuteKey = Math.floor(now / 60000);

  if (!windows.has(providerId) || windows.get(providerId).minuteKey !== minuteKey) {
    windows.set(providerId, {
      minuteKey,
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
  }
  return windows.get(providerId);
}

export function recordUsage(providerId, { inputTokens = 0, outputTokens = 0 } = {}) {
  const w = getWindow(providerId);
  w.requests++;
  w.inputTokens += inputTokens;
  w.outputTokens += outputTokens;
}

export function getUsageWindow(providerId) {
  const w = getWindow(providerId);
  return {
    requests_per_minute: w.requests,
    input_tokens_per_minute: w.inputTokens,
    output_tokens_per_minute: w.outputTokens,
    total_tokens_per_minute: w.inputTokens + w.outputTokens,
    window_reset_at: new Date((w.minuteKey + 1) * 60000).toISOString(),
  };
}

export function getAllUsageWindows() {
  const result = {};
  for (const [pid] of windows) {
    result[pid] = getUsageWindow(pid);
  }
  return result;
}
