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

  async fetchJson(url, options = {}) {
    const { default: fetch } = await import('node-fetch');
    const res = await fetch(url, options);
    if (!res.ok) {
      const body = await res.text();
      const err = new Error(`Provider ${this.id} returned ${res.status}: ${body.slice(0, 500)}`);
      err.status = res.status;
      err.providerBody = body;
      throw err;
    }
    return res.json();
  }

  async fetchStream(url, options = {}) {
    const { default: fetch } = await import('node-fetch');
    const res = await fetch(url, options);
    if (!res.ok) {
      const body = await res.text();
      const err = new Error(`Provider ${this.id} returned ${res.status}: ${body.slice(0, 500)}`);
      err.status = res.status;
      err.providerBody = body;
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
