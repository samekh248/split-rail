# Phase 0 Research: Full-Scale E2E Lifecycle & Cross-Tenant Leak Testing

All spec `NEEDS CLARIFICATION` items were resolved during the 2026-06-15 clarification session (see `spec.md` → Clarifications). This document records the resulting technology and approach decisions, the rationale for each, and the alternatives rejected.

---

## D1. E2E framework & workspace location

**Decision**: Use **Playwright** (`@playwright/test`) in a new standalone TypeScript workspace at `tests/e2e/`.

**Rationale**:
- Constitution III explicitly mandates Playwright E2E specs "tracking real login interception states" for multi-user and tenant-isolation validation. Playwright's `page.route` / `request` APIs make request capture and replay (needed for the cross-tenant replay attack) first-class.
- Native multi-browser engines (Chromium, Firefox, WebKit) and device emulation in one runner satisfy FR-001a without bolting on extra tooling.
- Built-in `trace`, `screenshot`, and `video` capture with `*-on-first-retry` / `retain-on-failure` modes directly satisfy FR-016a (artifacts only after retries exhausted).
- Built-in `--shard` support satisfies the ≈30-minute parallelization budget (FR-015a).
- A separate workspace (not `apps/web`) keeps Playwright's browser binaries and config out of the Vite/Vitest build and coverage scope.

**Alternatives rejected**: Cypress (weaker multi-browser/WebKit story, no native sharding, less ergonomic request replay); reusing Vitest + jsdom (cannot drive real browser engines or touch input).

---

## D2. Cross-browser & mobile matrix

**Decision**: Playwright `projects` = `chromium`, `firefox`, `webkit`, plus one touch-enabled mobile/tablet project (e.g. `Pixel 7`/`iPad` device descriptor with `hasTouch: true`). The lifecycle signature scenario runs under the touch-enabled project.

**Rationale**: FR-001a requires all three desktop engines plus ≥1 touch viewport, and the touchscreen signature/finalize flow exercised under touch. Playwright device descriptors set `hasTouch`, enabling `page.touchscreen` / pointer-drag simulation of the signature stroke.

**Alternatives rejected**: Desktop-only matrix (fails FR-001a and leaves the signature flow unverified under touch).

---

## D3. Flaky-test / retry policy

**Decision**: `retries: 2` in `playwright.config.ts` (bounded automatic per-test retry budget). A test green within the budget passes; persistent failure blocks the merge.

**Rationale**: Directly encodes the clarification answer (FR-014a). Absorbs transient infra flakiness in the ephemeral preview without masking real failures.

**Alternatives rejected**: Zero retries (brittle against preview cold-starts); unbounded retries (would hide genuine regressions and blow the time budget).

---

## D4. Failure diagnostics

**Decision**: Configure `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`; upload the Playwright report + `test-results/` as a GitHub Actions artifact only when the E2E job fails.

**Rationale**: FR-016a / SC-010 require trace+screenshot+video per failed scenario, retained as downloadable CI artifacts, and *not* retained for passing runs (cost + signal).

**Alternatives rejected**: Always-on tracing/video (storage cost, slows passing runs); logs-only (insufficient for diagnosing UI failures).

---

## D5. Hermetic QBO connector for the preview

**Decision**: Extract an `IQboTransactionClient` interface from the existing concrete `QboTransactionClient`, and add a `FakeQboTransactionClient` seeded with deterministic actuals. In the preview environment a `Preview:UseFakeQboConnector=true` flag swaps the real client for the fake at DI registration. Additionally register a `QboEgressRecordingHandler` (`DelegatingHandler`) on the `QboApi` named `HttpClient` that records outbound calls and forbids any mutating verb (POST/PUT/DELETE) toward the Intuit base URL.

**Rationale**:
- Clarification mandates a stubbed/faked connector seeded with deterministic actuals so the preview is hermetic (no Intuit dependency), variance assertions are reproducible, and Zero Write Infiltration is provable (FR-011a).
- The seam mirrors the proven `ISettlementArchiveStore` pattern already in the codebase, minimizing risk.
- The fake is read-only by construction (it only returns seeded `QboFetchedTransaction` records), so the integrity proof is structural; the egress recorder provides a runtime assertion surface the integrity suite can query to confirm zero mutating calls were attempted.
- Existing `QboReadOnlyTests` / `QboAppendOnlyTests` already prove no mutating code paths exist; this milestone adds the *runtime* hermetic proof in the assembled environment.

**Alternatives rejected**: Live Intuit sandbox (non-hermetic, flaky, external dependency, risks real writes); a separate stub HTTP server sidecar (more moving parts than an in-process fake; the named-client handler override already exists in test infra via `CreateFactoryWithQboHandler`).

---

## D6. Ephemeral preview environment

**Decision**: Per-PR-run deploy of the assembled stack to **Google Cloud Run** (API container + static web), with an ephemeral PostgreSQL (containerized Postgres in the deploy or a short-lived Cloud SQL instance) and a disposable settlement-archive bucket. `deploy/preview/deploy-preview.sh` builds & pushes images to Artifact Registry, deploys a uniquely-named Cloud Run service, runs migrations + seeding, and emits the preview base URL. `deploy/preview/teardown-preview.sh` deletes the service, DB, and bucket and always runs (CI `if: always()`).

**Rationale**: FR-002/016 require an isolated, ephemeral, production-style environment created per run and destroyed afterward regardless of outcome; the project's deployment target is already GCP Cloud Run (feature 004 plan). Unique service naming per run guarantees isolation between concurrent PR pipelines (edge case: stale environment).

**Alternatives rejected**: Long-lived shared staging (violates per-run isolation/teardown, risks cross-run contamination); local docker-compose only (not "production-style assembled stack" on the deployment target). A containerized Postgres inside the preview is acceptable for the ephemeral DB since no real 7-year WORM retention is needed for verification.

---

## D7. Pipeline wall-clock & sharding

**Decision**: Target ≈30 min. Run backend and frontend build+coverage jobs in parallel; after the preview is up, fan out the E2E matrix as a GitHub Actions **matrix of `{project} × {shard}`** using Playwright `--shard=i/n`. Each shard is an independent runner job.

**Rationale**: FR-015a / SC-009 require ≈30-minute completion via sharding/parallelization of the full cross-browser/mobile matrix.

**Alternatives rejected**: Single serial E2E job (would far exceed 30 min across 4 projects); per-spec-file jobs (harder to balance than Playwright's built-in shard balancing).

---

## D8. Coverage measurement & gating

**Decision**: Backend coverage via existing `coverlet.collector` emitting **cobertura**; frontend coverage via **`@vitest/coverage-v8`** emitting **lcov** (new dev dependency + `coverage` config in `vite.config.ts` with per-metric thresholds at 80). A CI gate parses both reports and fails the build if either side is `< 80.0%` **or** if a report is missing/unparseable.

**Rationale**: FR-013/017 + SC-005 require an 80.0% gate applied independently to backend and frontend as required merge blockers; the spec's edge case mandates that missing/unparseable coverage is treated as failing (not passing). The frontend coverage provider is currently absent and must be added.

**Alternatives rejected**: Codecov/third-party only (adds external dependency for a hard gate; native thresholds + a parse step are sufficient and self-contained); treating missing coverage as 0%-but-pass (explicitly rejected by the spec edge case).

---

## D9. Cross-tenant leak detection method

**Decision**: Two concurrent Playwright browser contexts (Org A, Org B) authenticated independently. Attacks: (a) direct navigation to B's resource URLs while authenticated as A; (b) replay of A-captured API requests with path/body identifiers swapped to B's IDs. Assertion model: the response must be a deny (`403`/`404`) **and** a deep-scan of the response body must contain none of B's known seeded identifiers/amounts/names/document refs. A "legitimate not-found" is distinguished from a "leak masked as empty success" by requiring deny status codes for cross-org attempts and by asserting the negative (no foreign tokens present) rather than asserting emptiness.

**Rationale**: FR-003/004/005 and the edge case about distinguishing `404` from empty-but-successful leakage. Deep negative-assertion on known foreign sentinels (seeded deterministically) is the robust signal.

**Alternatives rejected**: Status-code-only checks (could pass on an empty-200 leak); backend-only assertions (the spec requires real UI + intercepted-network proof per Constitution III).

---

## D10. Audit-file immutability proof

**Decision**: After the lifecycle suite finalizes a settlement, the integrity suite retrieves and hashes the stored settlement document, mutates underlying financial DB values for that event (via the seeding/admin surface or a direct DB poke in the preview), re-retrieves the document, and asserts the bytes/hash are identical and no re-render occurred.

**Rationale**: FR-012 / SC-003 require byte-for-byte unchanged after later data edits, never re-rendered, leveraging the existing WORM archive + `AssertNotSettledOrReconciled` guard.

**Alternatives rejected**: Comparing rendered values visually (not byte-exact); skipping the DB mutation step (would not prove immutability under change).

---

## D11. Branch protection / required checks

**Decision**: Configure the coverage gate job and the E2E gate job as **required status checks** on the protected `main` branch (via repo settings / `gh api`), so neither can be bypassed.

**Rationale**: FR-017 / SC-008 require both gates to be enforced merge blockers on `main`; proof is only durable if enforced.

**Alternatives rejected**: Advisory (non-required) checks (allow silent regression, violating SC-005/SC-008).

---

## D12. Type-drift verification

**Decision**: A CI step builds the API, exports `swagger.json`, regenerates `generated-api.ts` via the existing `gen:api` script, and runs `git diff --exit-code` on the generated file; any drift fails the build. The frontend build (`tsc --noEmit && vite build`) must then succeed.

**Rationale**: FR-019 / SC-007 require regenerated contract types with no manual drift and a succeeding frontend build; Constitution VI forbids hand-authored payload types.

**Alternatives rejected**: Manual review of types (not enforceable, drifts silently).
