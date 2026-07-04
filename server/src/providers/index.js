import { getProviderWithKey } from '../db/store.js';
import { GoogleProvider } from './google.js';
import { DeepSeekProvider } from './deepseek.js';
import { OpenRouterProvider } from './openrouter.js';
import { GroqProvider } from './groq.js';
import { MistralProvider, CodestralProvider } from './mistral.js';
import { CerebrasProvider } from './cerebras.js';
import { FireworksProvider } from './fireworks.js';
import { NvidiaProvider } from './nvidia.js';
import { TogetherProvider } from './together.js';
import { XAIProvider } from './xai.js';
import { CohereProvider } from './cohere.js';
import { OllamaProvider } from './ollama.js';
import { LMStudioProvider } from './lmstudio.js';
import { LlamaCppProvider } from './llamacpp.js';

export const PROVIDER_CLASSES = {
  google: GoogleProvider,
  deepseek: DeepSeekProvider,
  openrouter: OpenRouterProvider,
  groq: GroqProvider,
  mistral: MistralProvider,
  codestral: CodestralProvider,
  cerebras: CerebrasProvider,
  fireworks: FireworksProvider,
  nvidia: NvidiaProvider,
  together: TogetherProvider,
  xai: XAIProvider,
  cohere: CohereProvider,
  ollama: OllamaProvider,
  lmstudio: LMStudioProvider,
  llamacpp: LlamaCppProvider,
};

/**
 * Returns an instantiated provider adapter for the given provider_id.
 * Reads config (including decrypted API key) fresh from DB each call.
 */
export async function getProvider(providerId) {
  const ProviderClass = PROVIDER_CLASSES[providerId];
  if (!ProviderClass) throw Object.assign(new Error(`Unknown provider: ${providerId}`), { status: 400 });

  const config = await getProviderWithKey(providerId);
  if (!config) throw Object.assign(new Error(`Provider not found: ${providerId}`), { status: 404 });
  if (!config.enabled) throw Object.assign(new Error(`Provider disabled: ${providerId}`), { status: 503 });

  return new ProviderClass(config);
}
