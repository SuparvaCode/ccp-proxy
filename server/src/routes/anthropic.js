import { Router } from 'express';
import crypto from 'crypto';
import { resolveModel } from '../utils/modelRouter.js';
import { getProvider } from '../providers/index.js';
import { getProviders, getCachedModels, getSettings } from '../db/store.js';
import { recordUsage } from '../utils/rateLimiter.js';
import { finalizeLog } from '../middleware/logger.js';
import { estimateInputTokens } from '../utils/tokenEstimator.js';

const router = Router();

// ─── GET /v1/models ──────────────────────────────────────────────────────────
router.get('/models', async (_req, res) => {
  try {
    const providers = getProviders().filter(p => p.enabled);
    const allModels = [];

    for (const p of providers) {
      const cached = await getCachedModels(p.id);
      for (const m of cached) {
        allModels.push({
          id: `${p.id}/${m.model_id}`,
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: p.id,
          display_name: `${p.name} / ${m.model_name || m.model_id}`,
          context_length: m.context_length,
        });
      }
    }

    // Also add Claude aliases for model routing
    const variants = ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'];
    for (const v of variants) {
      allModels.push({ id: v, object: 'model', created: Math.floor(Date.now() / 1000), owned_by: 'ccp', display_name: v });
    }

    res.json({ object: 'list', data: allModels });
  } catch (e) {
    res.status(500).json({ error: { type: 'server_error', message: e.message } });
  }
});

// ─── POST /v1/messages ───────────────────────────────────────────────────────
router.post('/messages', async (req, res) => {
  const requestId = req.ccpLog?.request_id || `msg_${crypto.randomUUID().slice(0, 24)}`;
  const body = req.body;
  const modelStr = body.model || 'default';
  const isStream = !!body.stream;

  let resolved;
  try {
    resolved = resolveModel(modelStr);
    if (!resolved.provider_id) {
      return res.status(400).json({
        type: 'error',
        error: { type: 'invalid_request_error', message: `No provider route found for model: "${modelStr}". Add a model route in the admin panel or use "{PROVIDER_ID}/{MODEL_ID}" format.` },
      });
    }
  } catch (e) {
    return res.status(400).json({ type: 'error', error: { type: 'invalid_request_error', message: e.message } });
  }

  const provider = await getProvider(resolved.provider_id);

  // Attach resolved info to body for provider adapters
  body._resolvedModel = resolved.model_id;
  body._requestId = requestId;

  // ── Apply global model parameters (from Admin → Settings) ────────────────
  try {
    const cfg = await getSettings();
    const maxTokensLimit = cfg.model_max_tokens ? Number(cfg.model_max_tokens) : 4096;

    // max_tokens: if override is on OR request didn't set it, use global value.
    // Otherwise, cap the request's max_tokens to the limit to prevent API rate limits (TPM).
    if (cfg.model_max_tokens_override || body.max_tokens == null) {
      body.max_tokens = maxTokensLimit;
    } else {
      body.max_tokens = Math.min(Number(body.max_tokens), maxTokensLimit);
    }

    // temperature: only inject if enabled in settings
    if (cfg.model_temperature_enabled) {
      body.temperature = Number(cfg.model_temperature ?? 1);
    }

    // top_p: only inject if enabled in settings
    if (cfg.model_top_p_enabled) {
      body.top_p = Number(cfg.model_top_p ?? 1);
    }

    // top_k: only inject if enabled in settings (passed as extra for providers that support it)
    if (cfg.model_top_k_enabled) {
      body.top_k = Number(cfg.model_top_k ?? 40);
    }
  } catch { /* non-fatal — proceed with client-provided values */ }

  const estimatedInputTokens = estimateInputTokens(body);

  const onComplete = ({ inputTokens = 0, outputTokens = 0 } = {}) => {
    const finalInput = inputTokens > 0 ? inputTokens : estimatedInputTokens;
    recordUsage(resolved.provider_id, { inputTokens: finalInput, outputTokens });
    finalizeLog(req, {
      provider_id: resolved.provider_id,
      model_id: resolved.model_id,
      claude_variant: resolved.claude_variant,
      input_tokens: finalInput,
      output_tokens: outputTokens,
      status: 200,
    });
  };

  try {
    if (isStream) {
      await provider.completeStream(body, res, requestId, onComplete);
    } else {
      const result = await provider.complete(body);
      onComplete({ inputTokens: result.usage?.input_tokens, outputTokens: result.usage?.output_tokens });
      res.json(result);
    }
  } catch (e) {
    console.error(`[${resolved.provider_id}]`, e.message);

    // Map provider error codes to appropriate HTTP status
    let httpStatus = e.status || 500;
    let errorType = 'api_error';
    if (e.status === 429) errorType = 'rate_limit_error';
    else if (e.status === 503 || e.code === 'ECONNRESET') { httpStatus = 503; errorType = 'overloaded_error'; }
    else if (e.status === 504) errorType = 'api_error';

    finalizeLog(req, { provider_id: resolved.provider_id, model_id: resolved.model_id, status: httpStatus, error_message: e.message });

    if (!res.headersSent) {
      // Propagate retry-after for rate-limit errors so clients can back off
      if (e.status === 429 && e.retryAfter) {
        res.setHeader('retry-after', e.retryAfter);
      }
      res.status(httpStatus).json({
        type: 'error',
        error: { type: errorType, message: e.message, provider: resolved.provider_id },
      });
    }
  }
});

// ─── POST /v1/messages/count_tokens ──────────────────────────────────────────
router.post('/messages/count_tokens', (req, res) => {
  // Rough estimation: 4 chars per token
  const body = req.body;
  const messages = body.messages || [];
  let charCount = 0;
  for (const m of messages) {
    const c = m.content;
    if (typeof c === 'string') charCount += c.length;
    else if (Array.isArray(c)) charCount += c.filter(b => b.type === 'text').reduce((s, b) => s + (b.text?.length || 0), 0);
  }
  if (body.system) charCount += (typeof body.system === 'string' ? body.system : JSON.stringify(body.system)).length;
  res.json({ input_tokens: Math.ceil(charCount / 4) });
});

export default router;
