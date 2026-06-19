# Feature Specification: Event Pin API Endpoints

**Feature Branch**: `030-event-pin-endpoints`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Add event pin PUT/DELETE endpoints with integration tests (SPLR-70)"

**Linear Issue**: [SPLR-70](https://linear.app/audiodex/issue/SPLR-70/add-event-pin-putdelete-endpoints-with-integration-tests)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pin an Event for Quick Access (Priority: P1)

Venue staff who can view financial data on the dashboard want to pin specific events so those shows stay visible in their personal Global Pinned Events zone across sessions and devices. When they choose to pin an event, the system must record that preference for the signed-in user only.

**Why this priority**: Pinning is the core user action that makes server-side persistence valuable. Without a way to create pins, the underlying pin records cannot be used by the dashboard.

**Independent Test**: Can be verified by an authorized user pinning an event they can access and confirming the pin is stored for that user. Delivers personal bookmark persistence even before dashboard UI consumes it.

**Acceptance Scenarios**:

1. **Given** an authenticated user with permission to view financial data and access to a venue event, **When** they pin that event, **Then** the system records a pin association between that user and event with a creation timestamp.
2. **Given** an authenticated user who has already pinned an event, **When** they pin the same event again, **Then** the system completes successfully without creating duplicate pin records.
3. **Given** an authenticated user without permission to view financial data, **When** they attempt to pin an event, **Then** the request is denied.

---

### User Story 2 - Unpin an Event (Priority: P1)

Users who no longer need an event in their pinned zone must be able to remove their personal pin without affecting other users' pins on the same event.

**Why this priority**: Pin and unpin are paired actions; users expect to toggle pins off as easily as they toggle them on.

**Independent Test**: Can be verified by pinning an event, unpinning it, and confirming no pin record remains for that user–event pair while other users' pins on the same event are unchanged.

**Acceptance Scenarios**:

1. **Given** an authenticated user who has pinned an event, **When** they unpin that event, **Then** their pin record for that event is removed.
2. **Given** an authenticated user who has not pinned an event, **When** they attempt to unpin that event, **Then** the system completes successfully without error (no-op).
3. **Given** two users who have both pinned the same event, **When** one user unpins the event, **Then** only that user's pin is removed and the other user's pin remains.

---

### User Story 3 - Organization and Venue Access Enforcement (Priority: P1)

Pin actions must respect the same multi-tenant and venue-scoping rules as all other event data. Users must only pin or unpin events within their current organization and within venues they are allowed to access.

**Why this priority**: Cross-tenant or out-of-scope pin attempts are a security and data-integrity release blocker.

**Independent Test**: Can be verified by attempting pin/unpin against events in another organization or inaccessible venues and confirming every attempt is denied without exposing whether the event exists in another tenant.

**Acceptance Scenarios**:

1. **Given** an authenticated user in Organization A, **When** they attempt to pin an event belonging to Organization B, **Then** the request is denied.
2. **Given** an authenticated user scoped to Venue X only, **When** they attempt to pin an event in Venue Y within the same organization, **Then** the request is denied.
3. **Given** an authenticated user referencing a non-existent event or venue in their organization, **When** they attempt to pin or unpin, **Then** the request is denied without revealing cross-tenant information.

---

### User Story 4 - Pin Cleanup When Events Are Removed (Priority: P2)

When an event is deleted, pin records for that event must not remain as orphaned data. Users and downstream dashboard features should never encounter pins pointing to deleted events.

**Why this priority**: Data integrity supports reliable dashboard aggregation in a follow-on feature, but depends on pin creation being available first.

**Independent Test**: Can be verified by pinning an event, deleting the event, and confirming all pin records for that event are removed automatically.

**Acceptance Scenarios**:

1. **Given** one or more users have pinned an event, **When** that event is deleted, **Then** all pin records for that event are removed.
2. **Given** a user had pinned a deleted event, **When** they later view their pins through downstream dashboard features, **Then** the deleted event does not appear in their pinned list.

---

### Edge Cases

- What happens when a user pins an event and is later removed from the organization? Their pin records remain until explicitly cleaned up or the event is deleted; organization-scoped access checks prevent further pin/unpin actions.
- What happens when a user's venue scope is narrowed after they pinned events in venues they no longer access? Existing pin records may remain in storage, but pin/unpin actions against out-of-scope venues are denied.
- What happens when an event exists but the venue ID in the request does not match the event's actual venue? The request is denied as not found or not accessible.
- What happens when the pin persistence layer is unavailable? The user receives a clear failure response; no partial or ambiguous pin state is reported as success.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a pin action that associates the authenticated user with a specified event within a specified venue.
- **FR-002**: System MUST provide an unpin action that removes the authenticated user's pin for a specified event within a specified venue.
- **FR-003**: Pin and unpin actions MUST apply only to the authenticated user; one user's pins MUST NOT be created, modified, or removed by another user's requests.
- **FR-004**: Pin and unpin actions MUST require the authenticated user to hold permission to view financial data (pin is treated as a personal dashboard preference available to users who can access financial views).
- **FR-005**: System MUST validate that the requested venue and event belong to the authenticated user's current organization before pin or unpin proceeds.
- **FR-006**: System MUST validate that the authenticated user has access to the requested venue (respecting venue scope rules) before pin or unpin proceeds.
- **FR-007**: System MUST enforce at most one pin record per user per event; repeated pin requests for the same user–event pair MUST NOT create duplicates.
- **FR-008**: Unpin requests for events the user has not pinned MUST complete successfully without error.
- **FR-009**: Cross-organization or inaccessible pin/unpin attempts MUST be denied without leaking information about resources in other tenants.
- **FR-010**: When an event is deleted, all pin records referencing that event MUST be removed automatically.
- **FR-011**: Pin records created via the pin action MUST include a creation timestamp.
- **FR-012**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Out of Scope

- **OOS-001**: Dashboard aggregation endpoint and returning pinned events in overview responses (tracked separately as SPLR-72).
- **OOS-002**: Frontend migration from browser-local pin storage to server-side pins (tracked separately as SPLR-71).
- **OOS-003**: Listing all pins for a user via a dedicated read endpoint (expected to be consumed through dashboard aggregation).
- **OOS-004**: Pin ordering, maximum pin count, or UI presentation of pinned events on the dashboard overview page.
- **OOS-005**: UserEventPin entity and database schema (completed in SPLR-69 / spec 029).

### Key Entities

- **User Event Pin**: A per-user bookmark linking a user to an event they chose to pin. Identified by the combination of user and event. Carries a pin timestamp. Scoped to the organization through the event's venue. Removed when the referenced event is deleted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authorized users can complete a pin-then-unpin round trip for an accessible event in under 5 seconds under normal operating conditions.
- **SC-002**: 100% of cross-organization pin/unpin attempts in automated verification are denied without data leakage.
- **SC-003**: 100% of out-of-scope venue pin/unpin attempts in automated verification are denied.
- **SC-004**: After event deletion, zero orphaned pin records remain for that event in automated verification runs.
- **SC-005**: Duplicate pin requests for the same user–event pair produce zero additional pin records in automated verification runs.
- **SC-006**: Users without financial-view permission are denied pin/unpin actions in 100% of automated authorization verification runs.
- **SC-007**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- UserEventPin persistence (SPLR-69) is available before this feature is implemented.
- Pin and unpin are exposed as write-only actions scoped under venue and event identifiers; consumers retrieve pinned events through a separate dashboard aggregation feature.
- Permission to view financial data is the appropriate gate for pin/unpin because pinning is a personal dashboard preference tied to the financial overview experience.
- Idempotent behavior is expected: re-pinning an already pinned event succeeds without duplicates; unpinning a non-pinned event succeeds as a no-op.
- Denied cross-tenant or inaccessible requests may return either a forbidden or not-found response, consistent with existing platform patterns, as long as no cross-tenant data is exposed.
- Automated verification for this feature focuses on backend integration scenarios covering pin lifecycle, authorization, tenant isolation, and cascade cleanup; frontend changes are out of scope for this issue.

## Dependencies

- **Upstream**: UserEventPin entity and schema migration (SPLR-69 / spec 029-user-event-pin-entity), existing organization/venue/event tenant model and RBAC permissions (001-tenant-rbac-foundation).
- **Downstream**: SPLR-71 (wire overview to server-side pin toggle), SPLR-72 (dashboard aggregation including pinned events).
