import { getModelRoutes } from '../db/store.js';

/**
 * Routes a model string in form "{PROVIDER_ID}/{MODEL_ID}" or plain model ID
 * to a { provider_id, model_id } pair by checking model_routes.
 */
export function resolveModel(modelStr) {
  // Direct provider/model format
  if (modelStr && modelStr.includes('/')) {
    const slashIdx = modelStr.indexOf('/');
    return {
      provider_id: modelStr.slice(0, slashIdx),
      model_id: modelStr.slice(slashIdx + 1),
      claude_variant: null,
    };
  }

  const routes = getModelRoutes(); // uses in-memory cache
  const variant = getClaudeVariant(modelStr);

  // Find best matching route
  const sorted = routes
    .filter(r => r.enabled && (r.claude_variant === variant || r.claude_variant === 'default'))
    .sort((a, b) => {
      if (a.claude_variant === variant && b.claude_variant !== variant) return -1;
      if (b.claude_variant === variant && a.claude_variant !== variant) return 1;
      return (b.priority || 0) - (a.priority || 0);
    });

  if (sorted.length > 0) {
    return { provider_id: sorted[0].provider_id, model_id: sorted[0].model_id, claude_variant: variant };
  }

  return { provider_id: null, model_id: modelStr, claude_variant: variant };
}

function getClaudeVariant(model) {
  if (!model) return null;
  const m = model.toLowerCase();
  if (m.includes('opus')) return 'opus';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('haiku')) return 'haiku';
  return 'default';
}
