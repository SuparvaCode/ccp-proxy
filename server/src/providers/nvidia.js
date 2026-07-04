import { OpenAICompatProvider } from './openaicompat.js';

export class NvidiaProvider extends OpenAICompatProvider {
  constructor(config) {
    super({ ...config, base_url: config.base_url || 'https://integrate.api.nvidia.com' });
  }
}
