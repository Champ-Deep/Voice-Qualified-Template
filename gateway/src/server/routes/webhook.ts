import { Router, Request, Response } from 'express';
import { Config } from '../../config/schema.js';
import { ProviderRegistry } from '../../providers/registry.js';
import { CallOrchestrator } from '../../orchestrator/CallOrchestrator.js';
import type { IVoiceProvider } from '../../providers/types.js';
import type { WebhookPayload } from '../../providers/types.js';

export function webhookRouter(
  config: Config,
  registry: ProviderRegistry,
  orchestrator: CallOrchestrator,
): Router {
  const router = Router();

  // POST /v1/webhook — receives post-call data from voice providers
  // Query param ?provider=elevenlabs selects the parser (defaults to configured default)
  router.post('/', async (req: Request, res: Response) => {
    const providerName =
      (req.query['provider'] as string) ?? config.gateway.default_provider;
    const signature =
      (req.headers['x-webhook-signature'] as string) ??
      (req.headers['x-elevenlabs-signature'] as string) ??
      '';

    let provider: IVoiceProvider;
    let payload: WebhookPayload;
    try {
      // Parse and authenticate BEFORE acknowledging. A malformed or unsigned
      // payload must not get a 200, otherwise the provider treats it as
      // delivered and the transcript is lost with no retry.
      provider = registry.get(providerName);
      payload = provider.parseWebhook(req.body, signature);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[webhook] rejected (${providerName}):`, message);
      res.status(400).json({ error: 'Webhook rejected', detail: message });
      return;
    }

    // Acknowledge only once the payload is known good. ChampGraph writes are
    // fast but still async, so failures below are logged rather than retried.
    res.status(200).json({ received: true });

    try {
      await orchestrator.processWebhook(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[webhook] processing error:', message);
    }
  });

  return router;
}
