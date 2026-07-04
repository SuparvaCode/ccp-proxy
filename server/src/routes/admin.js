import { Router } from 'express';
import {
  getProviders, getProviderWithKey, upsertProvider, deleteProvider,
  getModelRoutes, upsertModelRoute, deleteModelRoute,
  getLogs, getUsageStats, getModelStats, cacheModels, getCachedModels,
  updateConfig, getSettings, getSummaryStat, clearLogs, getDb,
} from '../db/store.js';
import { getProvider, PROVIDER_CLASSES } from '../providers/index.js';
import { getAllUsageWindows } from '../utils/rateLimiter.js';

const router = Router();

// ─── Providers ────────────────────────────────────────────────────────────────
router.get('/providers', (_req, res) => {
  res.json(getProviders());
});

router.get('/providers/:id', async (req, res) => {
  const p = await getProviderWithKey(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json({ ...p, api_key: p.api_key ? '•'.repeat(20) : null, api_key_set: !!p.api_key });
});

router.put('/providers/:id', async (req, res) => {
  try {
    const result = await upsertProvider({ ...req.body, id: req.params.id });
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/providers/:id', async (req, res) => {
  await deleteProvider(req.params.id);
  res.json({ success: true });
});

router.post('/providers/:id/test', async (req, res) => {
  try {
    const provider = await getProvider(req.params.id);
    const models = await provider.listModels();
    res.json({ success: true, model_count: models.length, sample: models.slice(0, 3) });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.post('/providers/:id/fetch-models', async (req, res) => {
  try {
    const provider = await getProvider(req.params.id);
    const models = await provider.listModels();
    await cacheModels(req.params.id, models);
    res.json({ success: true, models });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.get('/providers/:id/models', async (req, res) => {
  res.json(await getCachedModels(req.params.id));
});

// ─── Model Routes ─────────────────────────────────────────────────────────────
router.get('/model-routes', (_req, res) => {
  res.json(getModelRoutes());
});

router.put('/model-routes/:id?', async (req, res) => {
  try {
    const id = await upsertModelRoute({ ...req.body, id: req.params.id || req.body.id });
    res.json({ id, success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete('/model-routes/:id', async (req, res) => {
  await deleteModelRoute(req.params.id);
  res.json({ success: true });
});

// ─── Logs ──────────────────────────────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  const { provider_id, limit, offset, from, to } = req.query;
  res.json(await getLogs({ provider_id, limit: parseInt(limit || 200), offset: parseInt(offset || 0), from, to }));
});

router.delete('/logs', async (_req, res) => {
  await clearLogs();
  res.json({ success: true });
});

// ─── Analytics ────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  const { provider_id, days } = req.query;
  res.json(await getUsageStats({ provider_id, days: parseInt(days || 7) }));
});

router.get('/stats/realtime', (_req, res) => {
  res.json(getAllUsageWindows());
});

router.get('/stats/summary', async (_req, res) => {
  const summary = await getSummaryStat();
  res.json({ ...summary, realtime: getAllUsageWindows() });
});

router.get('/stats/models', async (_req, res) => {
  try {
    res.json(await getModelStats());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Settings ──────────────────────────────────────────────────────────────────
router.get('/settings', async (_req, res) => {
  res.json(await getSettings());
});

router.put('/settings', async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    await updateConfig(key, value);
  }
  res.json({ success: true });
});

router.post('/server/restart', (_req, res) => {
  res.json({ success: true, message: 'Server is restarting...' });
  setTimeout(() => {
    process.exit(42);
  }, 1000);
});

// ─── Playground ───────────────────────────────────────────────────────────────
router.post('/playground', async (req, res) => {
  const { provider_id, model_id, messages, system, max_tokens, temperature, stream } = req.body;
  try {
    const provider = await getProvider(provider_id);

    const anthropicBody = {
      model: `${provider_id}/${model_id}`,
      messages, system,
      max_tokens: max_tokens || 2048,
      temperature,
      stream: !!stream,
      _resolvedModel: model_id,
      _requestId: `playground_${Date.now()}`,
    };

    if (stream) {
      await provider.completeStream(anthropicBody, res, anthropicBody._requestId, () => {});
    } else {
      const result = await provider.complete(anthropicBody);
      res.json(result);
    }
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

export default router;
