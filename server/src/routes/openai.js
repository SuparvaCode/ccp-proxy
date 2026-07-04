import { Router } from 'express';
import crypto from 'crypto';
import { resolveModel } from '../utils/modelRouter.js';
import { getProvider } from '../providers/index.js';
import { recordUsage } from '../utils/rateLimiter.js';
import { finalizeLog } from '../middleware/logger.js';
import { getSettings } from '../db/store.js';
import { toOpenAI } from '../translators/toProvider.js';
import { fromOpenAI } from '../translators/fromProvider.js';
import { streamOpenAIToAnthropic } from '../translators/streaming.js';

const router = Router();

/**
 * POST /v1/responses — OpenAI Responses API (used by Codex CLI)
 * Translates to our provider system the same way as /v1/messages.
 */
router.post('/responses', async (req, res) => {
  const requestId = req.ccpLog?.request_id || crypto.randomUUID();
  const body = req.body;

  // Convert OpenAI Responses format → Anthropic-like for our translator pipeline
  const modelStr = body.model || 'default';
  const isStream = !!body.stream;

  // Build an anthropic-compatible body from the OAI responses format
  const anthropicBody = {
    model: modelStr,
    messages: (body.input || []).map(m => ({
      role: m.role,
      content: m.content,
    })),
    max_tokens: body.max_output_tokens || 8192,
    stream: isStream,
    _requestId: requestId,
  };

  // ── Apply global model parameters (from Admin → Settings) ────────────────
  try {
    const cfg = await getSettings();
    const maxTokensLimit = cfg.model_max_tokens ? Number(cfg.model_max_tokens) : 4096;

    if (cfg.model_max_tokens_override || anthropicBody.max_tokens == null) {
      anthropicBody.max_tokens = maxTokensLimit;
    } else {
      anthropicBody.max_tokens = Math.min(Number(anthropicBody.max_tokens), maxTokensLimit);
    }

    if (cfg.model_temperature_enabled) {
      anthropicBody.temperature = Number(cfg.model_temperature ?? 1);
    }
    if (cfg.model_top_p_enabled) {
      anthropicBody.top_p = Number(cfg.model_top_p ?? 1);
    }
    if (cfg.model_top_k_enabled) {
      anthropicBody.top_k = Number(cfg.model_top_k ?? 40);
    }
  } catch { /* non-fatal */ }

  let resolved;
  try {
    resolved = resolveModel(modelStr);
    if (!resolved.provider_id) {
      return res.status(400).json({ error: { message: `No provider route for model: "${modelStr}"` } });
    }
  } catch (e) {
    return res.status(400).json({ error: { message: e.message } });
  }

  const provider = await getProvider(resolved.provider_id);
  anthropicBody._resolvedModel = resolved.model_id;

  const onComplete = ({ inputTokens = 0, outputTokens = 0 } = {}) => {
    recordUsage(resolved.provider_id, { inputTokens, outputTokens });
    finalizeLog(req, { provider_id: resolved.provider_id, model_id: resolved.model_id, endpoint: 'responses', input_tokens: inputTokens, output_tokens: outputTokens, status: 200 });
  };

  try {
    if (isStream) {
      await provider.completeStream(anthropicBody, res, requestId, onComplete);
    } else {
      const result = await provider.complete(anthropicBody);
      onComplete({ inputTokens: result.usage?.input_tokens, outputTokens: result.usage?.output_tokens });
      // Return in OpenAI Responses format
      res.json({
        id: result.id, object: 'response', model: modelStr,
        output: result.content.map(c => ({ type: c.type === 'text' ? 'message' : c.type, content: [{ type: 'output_text', text: c.text || '' }] })),
        usage: { input_tokens: result.usage?.input_tokens || 0, output_tokens: result.usage?.output_tokens || 0 },
      });
    }
  } catch (e) {
    console.error(`[openai-responses][${resolved.provider_id}]`, e.message);
    if (!res.headersSent) res.status(e.status || 500).json({ error: { message: e.message } });
  }
});

export default router;
