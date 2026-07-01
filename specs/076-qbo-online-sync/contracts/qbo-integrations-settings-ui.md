# Contract: Integrations Settings UI

**Feature**: 076-qbo-online-sync  
**Route**: `/settings/integrations`  
**Replaces**: `PlaceholderSettingsPage` for Integrations in `App.tsx`

See [qbo-integration-api.md](./qbo-integration-api.md) for API bindings.

---

## Access control

| Viewer | Integrations nav item | Route access | Integration controls |
|--------|----------------------|--------------|---------------------|
| Admin | Visible | Full page | All actions |
| Non-Admin | Hidden | Redirect to `/settings` + toast | None |

Frontend route guard AND backend Admin gate (defense in depth).

---

## Page layout

```text
SettingsLayout title="Integrations"
├── VenueSelector (if org.venues.length > 1)
├── QboIntegrationCard
│   ├── State: Disconnected | Connected | Expired
│   ├── Connect / Reconnect CTA (btn-primary, Alpine Sunset #E65100)
│   ├── Connected: company name, realm id, last sync
│   ├── Disconnect Account (outlined, Lodgepole Brown #3E2723)
│   ├── Clear Cached QBO Data (secondary; visible when disconnected && canPurgeCache)
│   └── Force Pull Latest QBO Data (Admin; debounced 60s; progress ring)
└── QboMappingConsole (visible when Connected or Expired with cached catalog)
    ├── Tab: Tracking Mappings
    └── Tab: Account Mappings (extract existing inline mapping table pattern)
```

Background: Canvas Cream `#F4F1EA`; cards: Surface White `#FFFFFF` (MHC tokens, spec 058).

---

## QboIntegrationCard states

### Disconnected

- QuickBooks logo + read-only pull explainer copy
- Primary **Connect to QuickBooks**
- No mapping console (or disabled with message)

### Connected

- Green pill badge `Connected`
- Company name, Realm ID, last sync timestamp
- **Disconnect Account** → confirmation modal
- **Force Pull Latest QBO Data**

### Expired

- Amber badge `Connection Expired`
- Explainer: authorization revoked upstream
- **Reconnect** (same as Connect OAuth flow)

---

## Modals

### Disconnect confirmation

- Confirms credential revocation and sync suspension
- Copy: cached variance data retained as snapshots

### Purge confirmation

- Copy: *"Are you sure you want to permanently clear all cached QuickBooks transaction mappings from Split-Rail? This will wipe out all historical variance metrics."*
- Destructive confirm action

---

## QboMappingConsole — Tracking tab

- Filterable table: QBO name, type (Class/Tag), mapped tier, mapped entity name
- Add mapping: pick catalog item → pick tier → pick entity (Region/Venue/Event selector)
- Edit/delete row actions

---

## QboMappingConsole — Account tab

- Reuse account mapping list from accounting overview pattern
- CRUD against existing `/mappings` API

---

## Quick Assign Tracking (in-context)

Component: `QuickAssignTrackingSelect`

| Surface | Tier on save |
|---------|--------------|
| `EventFormPanel` | Event |
| Venue create/edit | Venue |
| `RegionManagementPanel` | Region |

- Typeahead against `tracking-catalog` API
- Hidden/disabled when venue not Connected
- Replaces free-text `qboTagName` input on event form (field deprecated in UI; backend fallback retained)

---

## Hooks & data fetching

| Hook | Purpose | staleTime |
|------|---------|-----------|
| `useIsAdmin()` | Nav + route guard | from profile |
| `useVenueQboIntegration(venueId)` | Card state | 30s |
| `useOrganizationQboSummary()` | Dashboard gating | 30s |
| `useQboTrackingCatalog(venueId)` | Console + Quick Assign | 15m |
| `useQboTrackingMappings(venueId)` | Tracking tab | default |

Types from `generated-api.ts` only (Constitution VI).

---

## Icons (Constitution IX)

Font Awesome Free: connect (`faLink`), sync (`faRotate`), warning/expired (`faTriangleExclamation`), purge (`faTrashCan`).

---

## OAuth return handling

On load with query `?venueId=&qboConnected=true`:
- Select venue in selector
- Invalidate integration + summary queries
- Show success toast
