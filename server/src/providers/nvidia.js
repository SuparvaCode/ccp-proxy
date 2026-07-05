import { OpenAICompatProvider } from './openaicompat.js';
import { toOpenAI } from '../translators/toProvider.js';
import { fromOpenAI } from '../translators/fromProvider.js';
import { streamOpenAIToAnthropic } from '../translators/streaming.js';

// Errors that are safe to retry (transient network / server issues)
const RETRYABLE_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EPIPE', 'EHOSTUNREACH']);
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

/**
 * NVIDIA NIM provider.
 *
 * Two known issues with NVIDIA NIM's strict API:
 *
 * 1. **top_k rejection**: NVIDIA NIM uses a strict Rust-based JSON schema validator
 *    for the OpenAI spec. `top_k` is non-standard and causes:
 *    "400: invalid type: map, expected variant identifier"
 *    → Fixed by passing `{ stripTopK: true }` to toOpenAI().
 *
 * 2. **ECONNRESET / 429**: NVIDIA's free-tier endpoints drop connections under load
 *    (ECONNRESET after ~37s) and also return 429 when rate-limited.
 *    → Fixed with exponential backoff retry (up to 3 attempts).
 */
export class NvidiaProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'https://integrate.api.nvidia.com' });
  }

  /**
   * Retry wrapper: retries on transient ECONNRESET / 429 / 5xx errors
   * with exponential backoff (1s → 2s → 4s).
   */
  async _withRetry(fn, maxAttempts = 3) {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const isRetryable =
          RETRYABLE_CODES.has(err.code) ||
          RETRYABLE_STATUSES.has(err.status);

        if (!isRetryable || attempt === maxAttempts) break;

        // For 429, honour retry-after if provided (cap at 30s)
        let waitMs;
        if (err.status === 429 && err.retryAfter) {
          const secs = parseFloat(err.retryAfter);
          waitMs = Math.min(isNaN(secs) ? 5000 : secs * 1000, 30_000);
        } else {
          // Exponential backoff: 1s, 2s, 4s …
          waitMs = Math.pow(2, attempt - 1) * 1000;
        }

        console.warn(`[nvidia] Attempt ${attempt} failed (${err.code || err.status || err.message}). Retrying in ${waitMs}ms…`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
    throw lastErr;
  }

  async complete(anthropicBody) {
    return this._withRetry(async () => {
      const model = anthropicBody._resolvedModel;
      // stripTopK: NVIDIA NIM rejects top_k ("invalid type: map, expected variant identifier")
      const body = toOpenAI(anthropicBody, model, { stripTopK: true });
      const data = await this.fetchJson(this.chatEndpoint(), {
        method: 'POST',
        headers: { ...this.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return fromOpenAI(data, model, anthropicBody._requestId);
    });
  }

  async completeStream(anthropicBody, res, requestId, onComplete) {
    return this._withRetry(async () => {
      const model = anthropicBody._resolvedModel;
      // stripTopK: NVIDIA NIM rejects top_k ("invalid type: map, expected variant identifier")
      const body = {
        ...toOpenAI(anthropicBody, model, { stripTopK: true }),
        stream: true,
        stream_options: { include_usage: true },
      };
      const stream = await this.fetchStream(this.chatEndpoint(), {
        method: 'POST',
        headers: { ...this.authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await streamOpenAIToAnthropic(res, stream, model, requestId, onComplete);
    });
  }
}
