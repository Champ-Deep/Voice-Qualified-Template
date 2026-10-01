/**
 * Integration test: the full ChampIQ Voice Gateway loop.
 *
 * Seeds a call node into ChampGraph, delivers an ElevenLabs-shaped webhook to the
 * HTTP gateway, and asserts the transcript/status are persisted and readable via
 * the CLI-facing read path.
 *
 * Requires a Redis on REDIS_TEST_URL (default redis://localhost:6399).
 * Run with: npm test
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Redis } from 'ioredis';

import { ChampGraph } from '../src/graph/ChampGraph.js';
import { createApp } from '../src/server/app.js';
import { ConfigSchema } from '../src/config/schema.js';
import type { CallNode } from '../src/graph/types.js';

const REDIS_URL = process.env['REDIS_TEST_URL'] ?? 'redis://localhost:6399';
const PORT = Number(process.env['GATEWAY_TEST_PORT'] ?? 4602);
const CONV_ID = 'conv_test_loop_001';
const CALL_ID = 'call_test_loop_001';
const CONTACT = '+15550001111';

const config = ConfigSchema.parse({
  redis: { url: REDIS_URL, ttl_days: 1 },
  gateway: { port: PORT, default_provider: 'elevenlabs' },
});

describe('gateway webhook loop', () => {
  let graph: ChampGraph;
  let server: ReturnType<ReturnType<typeof createApp>['listen']>;
  let baseUrl: string;

  before(async () => {
    graph = new ChampGraph(REDIS_URL, 1);
    await graph.connect();

    // Clean any residue from a previous run.
    const cleaner = new Redis(REDIS_URL);
    const stale = await cleaner.keys('champgraph:*test_loop_001*');
    if (stale.length > 0) await cleaner.del(...stale);
    await cleaner.quit();

    const node: CallNode = {
      callId: CALL_ID,
      conversationId: CONV_ID,
      contactId: CONTACT,
      flowId: undefined,
      canvasNodeId: undefined,
      prevCallId: undefined,
      provider: 'elevenlabs',
      agentId: 'agent_test',
      toNumber: CONTACT,
      leadName: 'Test Lead',
      company: 'Test Co',
      email: 'lead@test.co',
      script: undefined,
      dynamicVars: { leadId: CALL_ID },
      status: 'initiated',
      timestamps: { created: new Date().toISOString() },
      transcript: [],
      outcome: 'unknown',
      canvasSynced: false,
      canvasEventsSent: [],
    };
    await graph.saveCall(node);

    const app = createApp(config, graph);
    server = app.listen(PORT);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${PORT}`;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await graph.disconnect();
  });

  it('serves a health check', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { status: string };
    assert.equal(body.status, 'ok');
  });

  it('rejects a call with no phone number', async () => {
    const res = await fetch(`${baseUrl}/v1/calls`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });

  it('persists transcript and status from an ElevenLabs webhook', async () => {
    const res = await fetch(`${baseUrl}/v1/webhook?provider=elevenlabs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event: 'call_finished',
        data: {
          conversation_id: CONV_ID,
          status: 'completed',
          metadata: {
            start_time_unix_secs: 1767225600,
            call_duration_secs: 90,
          },
          analysis: {
            data_collection_results: { leadId: { value: CALL_ID } },
          },
          transcript: [
            { role: 'agent', message: 'Hi, calling about your data stack.', time_in_call_secs: 0 },
            { role: 'user', message: 'Send details by email.', time_in_call_secs: 45 },
          ],
        },
      }),
    });
    assert.equal(res.status, 200);

    // Processing is async by design; poll briefly for the write to land.
    let updated: CallNode | null = null;
    for (let i = 0; i < 20; i++) {
      updated = await graph.getCall(CALL_ID);
      if (updated && updated.transcript.length > 0) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    assert.ok(updated, 'call node should exist');
    assert.equal(updated.status, 'completed');
    assert.equal(updated.transcript.length, 2);
    assert.equal(updated.transcript[0]?.speaker, 'agent');
    assert.equal(updated.transcript[1]?.speaker, 'lead');
    assert.equal(updated.durationSeconds, 90);
  });

  it('lists calls by contact', async () => {
    const res = await fetch(`${baseUrl}/v1/calls?contact=${encodeURIComponent(CONTACT)}`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { calls?: CallNode[] };
    assert.ok(Array.isArray(body.calls));
    assert.ok(body.calls.some((c) => c.callId === CALL_ID));
  });

  it('rejects a listing with neither contact nor flow', async () => {
    const res = await fetch(`${baseUrl}/v1/calls`);
    assert.equal(res.status, 400);
  });

  it('rejects a webhook with no data envelope instead of silently acking', async () => {
    // Regression: this used to crash the parser, get swallowed by the route,
    // and still answer 200, so the provider never retried and the transcript
    // was lost permanently.
    const res = await fetch(`${baseUrl}/v1/webhook?provider=elevenlabs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'call_finished' }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, 'Webhook rejected');
  });

  it('rejects a webhook for an unknown provider rather than acking it', async () => {
    const res = await fetch(`${baseUrl}/v1/webhook?provider=not-a-provider`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: { conversation_id: CONV_ID } }),
    });
    assert.equal(res.status, 400);
  });
});
