ChampIQ Voice Gateway: branch consolidation report
=================================================
Date: 2026-10-01
Branch delivered: v2-consolidation (tip 5fa4e2e)
CI: 5/5 jobs green on GitHub runners (run 36894589091)


1. WHAT WAS WRONG
-----------------
CI had been red since 2026-04-24. Cause: the ChampIQ Voice Gateway
(~1700 lines: CLI, Express app, ChampGraph, Canvas emitter, provider
registry) lived in src/ alongside the React app, while root package.json
declared only frontend dependencies.

Consequences:
  - npx tsc --noEmit failed with 88 errors on a repo whose frontend built
    perfectly. All 88 were in code the browser never loads.
  - The gateway could not be typechecked, built, or run at all.
  - The Docker image could not build either: the frontend stage ran
    "tsc && vite build", and that tsc covered the gateway files.
  - Nothing in the logs pointed at the cause, because the failure was in a
    package that did not exist.


2. WHAT WAS DELIVERED
---------------------
a) gateway/ is now its own package
   28 files moved out of src/, with the dependencies they actually import
   (express, cors, helmet, morgan, zod, commander, ioredis, uuid) and a
   strict tsconfig: strict, noUncheckedIndexedAccess, noUnusedLocals,
   noUnusedParameters, noImplicitOverride, noFallthroughCasesInSwitch.

b) Three real bugs fixed to make it compile
   - commander resolved to a transitive v4, which has no `program` export.
     Pinned v12.
   - ioredis must be a named import under module: NodeNext. The default
     export resolves to a namespace and is not constructable.
   - Config key-path and table-width indexing narrowed properly under
     noUncheckedIndexedAccess rather than cast away.

c) One real data-loss bug fixed
   The webhook route acknowledged 200 before parsing, then swallowed every
   error. A payload missing the `data` envelope crashed the parser, the
   provider was told 200, never retried, and the transcript was lost with no
   trace. The TypeScript interface claimed `data` was required, but express
   types req.body as any, so nothing enforced it.
   Now: zod validates at the boundary, parse and authenticate happen before
   the ack, malformed or unknown-provider payloads get a 400. Seven
   integration tests cover the loop and the three rejection paths.

d) Governance
   AGENTS.md (map, commands, type discipline, sharp edges), MIT LICENSE,
   expanded .env.example, and CI split into web / gateway / backend / docker
   with a Redis service so the integration tests actually run.


3. VERIFICATION (all executed, not asserted)
--------------------------------------------
From a clean clone of the pushed branch:
  web      tsc --noEmit 0 errors, vite build OK
  gateway  typecheck 0 errors, build OK, 7/7 tests pass
  backend  tsc --noEmit 0 errors, build OK
  docker   image builds, container serves /health 200 and the SPA
  CLI      champiq-voice --help / config set / config get / config list,
           secrets masked, alias resolution correct
On GitHub runners: 5/5 jobs green (run 36894589091).


4. BRANCH MERITS
----------------
main       FULLY CONTAINED in v2-consolidation. Safe to delete once merged.
           All of main's history is reachable from the V2 tip.

format-v2  FULLY CONTAINED in v2-consolidation. 0 unique commits. It is an
           ancestor of main. Safe to delete.

format     NOT a branch of this project. Different root commit (c6d6710 vs
           64f3cef), Python 3.11 + SQLite + FastAPI, no gateway/CLI/graph
           code whatsoever. It is an earlier "Lead Management System"
           prototype that was abandoned for the Node/TypeScript rewrite.
           7 unique commits, 27 files not present anywhere on V2.

           Its content is NOT superseded by accident, it was a different
           design. But it is not salvageable work either: the current
           architecture replaced it deliberately. Recommendation: keep the
           branch (7 commits is cheap) rather than delete, until you confirm
           nothing in the Python prototype is worth porting. Do NOT merge it.


5. WHAT I DID NOT DO
--------------------
  - Did not merge anything to main. v2-consolidation is ready for your review.
  - Did not delete any branch.
  - Did not wire gateway/ into the Dockerfile. It ships as a CLI or separate
    service for now; the runtime image still serves only the React app plus
    the legacy backend. That is a deliberate scope call, not an oversight.
  - Did not touch backend/. It is legacy but live on Railway, and it
    duplicates gateway responsibilities. Replacing it is separate work.

Suggested merge order once reviewed: v2-consolidation -> main, then delete
main and format-v2. Decide separately on format.
