# Contract: QBO Scheduler Timezone Dispatch

**Feature**: 076-qbo-online-sync  
**Extends**: spec 057 (`deploy/lib/qbo-scheduler-names.sh/.ps1`, internal sync trigger)

---

## Scheduler job configuration

| Setting | Previous (057) | New (076) |
|---------|----------------|-----------|
| Cron | `0 */6 * * *` | `*/15 * * * *` |
| Time zone | UTC | UTC (unchanged) |
| HTTP method | POST | POST |
| Target path | `/api/internal/qbo-sync-trigger?mode=nightly` | same + dispatch logic |
| Auth | OIDC (scheduler SA) | OIDC (unchanged) |

**Behavior**: Each trigger invocation evaluates all organizations; syncs those where local time (via `Organization.TimeZoneId`) is hour `3` and minute `< 15`.

---

## Internal trigger query parameters

| Param | Required | Description |
|-------|----------|-------------|
| `mode` | No | `nightly` enables timezone dispatch + 48h lookback; omit for legacy all-org sync (dev tests only) |
| `organizationId` | No | Restrict to single org (operator override) |

---

## Deploy script changes

Update paired scripts:

- `deploy/lib/qbo-scheduler-names.sh`
- `deploy/lib/qbo-scheduler-names.ps1`

Export `SCHEDULER_CRON="*/15 * * * *"`.

Update `deploy/infra/provision-qbo-scheduler.sh/.ps1` to use new cron on create/update.

Update Vitest deploy contract tests in `apps/web/tests/deploy/deployQboScheduler.test.ts` to assert new cron.

---

## In-process timer

- **Development**: in-process timer MAY remain for local convenience; SHOULD align interval or document manual Force Pull preference.
- **Production**: in-process timer disabled (unchanged from 057); Cloud Scheduler only.

---

## Dual-platform requirement (Constitution X)

All scheduler script changes MUST ship paired `.sh` and `.ps1` variants with equivalent behavior and exit codes.

---

## Validation

1. Unit test: org in `America/Denver` eligible at UTC time corresponding to local 03:05; not eligible at local 04:00.
2. Unit test: org in `Europe/London` independent eligibility.
3. Integration test: internal trigger with `mode=nightly` syncs only window-eligible orgs.
4. Deploy contract test: cron string updated in names lib both platforms.
