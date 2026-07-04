// ═══════════════════════════════════════════════════════════════
//   ██████╗ ██████╗██████╗ 
//  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
//  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
//  ██║     ██║     ██╔═══╝ 
//  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
//   ╚═════╝ ╚═════╝╚═╝ 
// ═══════════════════════════════════════════════════════════════

import { OpenAICompatProvider } from './openaicompat.js';

export class OpenRouterProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'https://openrouter.ai/api' });
  }
  chatEndpoint() { return `${this.baseUrl}/v1/chat/completions`; }
  modelsEndpoint() { return `${this.baseUrl}/v1/models`; }

  authHeader() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://github.com/suparva/ccp-proxy',
      'X-Title': 'Claude Code Proxy',
    };
  }

  async listModels() {
    const data = await this.fetchJson(this.modelsEndpoint(), { headers: this.authHeader() });
    return (data.data || []).map(m => ({
      id: m.id,
      name: m.name || m.id,
      description: m.description || '',
      context_length: m.context_length || null,
      capabilities: ['chat'],
    }));
  }
}
