import { OpenAICompatProvider } from './openaicompat.js';
import { toOpenAI } from '../translators/toProvider.js';
import { fromOpenAI } from '../translators/fromProvider.js';
import { streamOpenAIToAnthropic } from '../translators/streaming.js';

/**
 * NVIDIA NIM provider.
 * Uses a strict OpenAI-compatible API that rejects non-standard parameters
 * like `top_k` (not in the OpenAI spec) with a 400 JSON schema validation error.
 * We override complete/completeStream to strip those params.
 */
export class NvidiaProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'https://integrate.api.nvidia.com' });
  }

  async complete(anthropicBody) {
    const model = anthropicBody._resolvedModel;
    // stripTopK: true — NVIDIA NIM rejects top_k ("invalid type: map, expected variant identifier")
    const body = toOpenAI(anthropicBody, model, { stripTopK: true });
    const data = await this.fetchJson(this.chatEndpoint(), {
      method: 'POST',
      headers: { ...this.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return fromOpenAI(data, model, anthropicBody._requestId);
  }

  async completeStream(anthropicBody, res, requestId, onComplete) {
    const model = anthropicBody._resolvedModel;
    // stripTopK: true — NVIDIA NIM rejects top_k ("invalid type: map, expected variant identifier")
    const body = { ...toOpenAI(anthropicBody, model, { stripTopK: true }), stream: true, stream_options: { include_usage: true } };
    const stream = await this.fetchStream(this.chatEndpoint(), {
      method: 'POST',
      headers: { ...this.authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await streamOpenAIToAnthropic(res, stream, model, requestId, onComplete);
  }
}
