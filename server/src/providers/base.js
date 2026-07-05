/**
 * Base provider class — all providers extend this.
 */
export class BaseProvider {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type; // 'cloud' | 'local'
    this.baseUrl = config.base_url;
    this.apiKey = config.api_key;
    this.extraConfig = config.extra_config || {};
  }

  /**
   * Makes a JSON-returning HTTP request with a timeout.
   * @param {string} url
   * @param {object} options  node-fetch options
   * @param {number} timeoutMs  default 90 seconds
   */
  async fetchJson(url, options = {}, timeoutMs = 90_000) {
    const { default: fetch } = await import('node-fetch');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
      res = await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      // AbortError → treat as gateway timeout (504)
      if (err.name === 'AbortError') {
        const e = new Error(`Provider ${this.id} timed out after ${timeoutMs / 1000}s`);
        e.status = 504;
        throw e;
      }
      // ECONNRESET / ECONNREFUSED / network errors → 503
      const e = new Error(`Provider ${this.id} connection error: ${err.message}`);
      e.status = 503;
      e.code = err.code;
      throw e;
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text();
      const err = new Error(`Provider ${this.id} returned ${res.status}: ${body.slice(0, 500)}`);
      err.status = res.status;
      err.providerBody = body;
      // Preserve retry-after so callers can propagate it
      err.retryAfter = res.headers.get('retry-after') || res.headers.get('x-ratelimit-reset-requests');
      throw err;
    }
    return res.json();
  }

  /**
   * Makes a streaming HTTP request with a connect timeout.
   * @param {string} url
   * @param {object} options  node-fetch options
   * @param {number} connectTimeoutMs  time to wait for first byte (default 60 seconds)
   */
  async fetchStream(url, options = {}, connectTimeoutMs = 60_000) {
    const { default: fetch } = await import('node-fetch');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), connectTimeoutMs);

    let res;
    try {
      res = await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
      if (err.name === 'AbortError') {
        const e = new Error(`Provider ${this.id} stream connect timed out after ${connectTimeoutMs / 1000}s`);
        e.status = 504;
        throw e;
      }
      const e = new Error(`Provider ${this.id} connection error: ${err.message}`);
      e.status = 503;
      e.code = err.code;
      throw e;
    } finally {
      // Don't clear the timer here — clear it once headers are received
      // (the connection is established; the body stream can take longer)
      clearTimeout(timer);
    }

    if (!res.ok) {
      const body = await res.text();
      const err = new Error(`Provider ${this.id} returned ${res.status}: ${body.slice(0, 500)}`);
      err.status = res.status;
      err.providerBody = body;
      err.retryAfter = res.headers.get('retry-after') || res.headers.get('x-ratelimit-reset-requests');
      throw err;
    }
    return res.body;
  }

  authHeader() {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
  }

  // Subclasses implement these:
  async listModels() { return []; }
  async complete(anthropicBody) { throw new Error(`${this.id}: complete() not implemented`); }
  async completeStream(anthropicBody, res, requestId, onComplete) { throw new Error(`${this.id}: completeStream() not implemented`); }
}
