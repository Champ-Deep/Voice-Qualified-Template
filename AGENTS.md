# AGENTS.md : Voice-Qualified-Template (ChampQualifier)

> Read this before touching the repo. It maps the code and records the traps.
> Do not add operating rules here. Conventions belong in this file only if an
> agent would otherwise get them wrong.

## What this is

An outbound AI calling product with two deployable halves:

| Half | Path | What it is | Ships to |
|------|------|------------|----------|
| Web app | `src/` (repo root) | React + Vite lead UI. Browser only. | bundled into the Docker image, served by the backend as static files |
| Voice gateway | `gateway/` | Node CLI + Express API. ChampGraph memory layer, Canvas connector. | CLI (`champiq-voice`), optionally its own service |
| Legacy API | `backend/` | Single-file Express server. Serves the built React app. | this is what Railway runs today |

`plan.md` is the original architecture brief for the gateway. It is a historical
document, not a spec to implement against. The code in `gateway/` is the truth.

## The trap that cost five months

Until the `v2-consolidation` branch, the gateway's ~1700 lines lived in `src/`
alongside the React app, while root `package.json` declared only frontend
dependencies. So:

- `npx tsc --noEmit` failed with 88 errors on a repo whose frontend built fine.
- CI had been red since 2026-04-24 and nobody could tell why, because the
  failure was in code the browser never loads.
- The gateway could not be run, built, or typechecked at all.

**If you add server-side code, it goes in `gateway/`, not `src/`.** The two
packages have separate tsconfigs and separate `node_modules`. Do not merge them.

## Commands

```bash
# Web app
npm ci && npm run build          # tsc --noEmit then vite build

# Gateway
cd gateway
npm ci
npm run typecheck                # strict, includes noUncheckedIndexedAccess
npm run build                    # -> gateway/dist
npm test                         # integration tests, needs Redis (see below)
node dist/cli/index.js --help

# Legacy API
cd backend && npm ci && npm run build
```

### Running the tests

The gateway tests are real integration tests against Redis, not mocks.

```bash
docker run -d --name champiq-redis-test -p 6399:6379 redis:7-alpine
cd gateway && REDIS_TEST_URL=redis://localhost:6399 npm test
```

`REDIS_TEST_URL` defaults to `redis://localhost:6399`. Never point it at a
production Redis: the suite writes and deletes `champgraph:*` keys.

## Type discipline

`gateway/tsconfig.json` runs with `strict`, `noUncheckedIndexedAccess`,
`noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`, and
`noFallthroughCasesInSwitch`. It compiles clean. Keep it that way.

- Fix type errors by narrowing or modelling the real shape. Do not reach for
  `any`, `!`, or `@ts-ignore` to make the compiler quiet.
- Array and record access under `noUncheckedIndexedAccess` yields `T | undefined`.
  Narrow it. `as string` on a key you have just length-checked is acceptable;
  a blanket cast is not.
- Anything crossing a trust boundary (HTTP body, webhook, config file, env) is
  validated with zod. A TypeScript interface is erased at runtime and proves
  nothing about what actually arrives. `ELWebhookSchema` exists because the
  interface said `data` was required and the provider sometimes omitted it.

## Known sharp edges

- **Webhook acks are load-bearing.** `/v1/webhook` parses and authenticates
  before sending 200. If you move the `res.status(200)` earlier, a malformed
  payload returns 200, the provider never retries, and the transcript is lost
  with no trace. There is a regression test for this; do not delete it.
- **`ioredis` must be imported as a named export.** Under `module: NodeNext`,
  `import Redis from 'ioredis'` resolves to a namespace and is not
  constructable. Use `import { Redis } from 'ioredis'`.
- **Commander needs v12+.** v4 has no `program` export. The gateway pins
  `commander: ^12`; the old root-level v4 came in transitively.
- **Config precedence** is `~/.champiq/config.json` overlaid with env vars, then
  validated by `ConfigSchema`. `CHAMPIQ_CONFIG` relocates the file.
  `config list` and `config get` mask secret values.
- **`backend/` is legacy but live.** Railway deploys it. It duplicates gateway
  responsibilities. Do not delete it until a replacement is deployed, and do not
  add features to it.

## Deployment

`Dockerfile` is a three-stage build: Vite build, gateway-independent backend
build, then a slim runtime that serves `dist/` and the static frontend. The
Dockerfile does not yet build the `gateway/` package; the gateway currently
ships as a CLI or a separate service. If you wire it into the image, keep the
stage boundaries intact so the runtime stage stays free of build tooling.
