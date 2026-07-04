import { OpenAICompatProvider } from './openaicompat.js';

export class MistralProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'https://api.mistral.ai' });
  }
}

export class CodestralProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'https://codestral.mistral.ai' });
  }
}
