# Feature Specification: User Event Pin Persistence

**Feature Branch**: `029-user-event-pin-entity`

**Created**: 2026-06-18

**Status**: Draft

**Input**: User description: "Add UserEventPin entity and EF migration — server-side persistence foundation for dashboard event pinning (SPLR-69)"

**Linear Issue**: [SPLR-69](https://linear.app/audiodex/issue/SPLR-69/add-usereventpin-entity-and-ef-migration)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Durable Event Pin Records (Priority: P1)

Venue staff pin events on the dashboard overview to keep high-priority shows visible in the Global Pinned Events zone. Today, pin state lives only in the browser and is lost when switching devices or clearing storage. The platform must introduce a server-side record that associates a user with each event they have pinned, including when the pin was created.

**Why this priority**: Without durable pin records, the dashboard cannot offer consistent pinned-event behavior across sessions and devices. This is the foundational data layer that downstream dashboard and API work depends on.

**Independent Test**: Can be verified by confirming the persistence layer accepts and stores a pin association between a user and an event, and that the association can be retrieved for that user. Delivers the data foundation even before any user-facing API is exposed.

**Acceptance Scenarios**:

1. **Given** a user and an event within their organization, **When** a pin record is created for that user–event pair, **Then** the system stores exactly one record keyed by that user and event with a pin timestamp.
2. **Given** a user who has already pinned an event, **When** a second pin record for the same user–event pair is attempted, **Then** the system enforces uniqueness so only one pin record exists per user per event.
3. **Given** stored pin records for a user, **When** those records are queried, **Then** each record includes the pinned event reference and the time the pin was created.

---

### User Story 2 - Organization-Scoped Pin Data (Priority: P1)

Pin records must respect the same multi-tenant boundaries as all other venue and event data. Users must only ever see or interact with pin records for events belonging to their current organization.

**Why this priority**: Cross-tenant data leakage is a release blocker. Pin data is user-specific but must still be constrained by organization membership through the event's venue.

**Independent Test**: Can be verified by creating pin records under two organizations and confirming that queries scoped to Organization A never return pins for Organization B events.

**Acceptance Scenarios**:

1. **Given** pin records exist for events in Organization A and Organization B, **When** data is accessed in an Organization A context, **Then** only pins for Organization A events are visible.
2. **Given** a user authenticated to Organization A, **When** they attempt to reference a pin for an event belonging to Organization B, **Then** the record is not accessible within the Organization A scope.

---

### User Story 3 - Automatic Cleanup on Event Removal (Priority: P2)

When an event is deleted, any pin records pointing to that event must be removed automatically so the system does not retain orphaned references.

**Why this priority**: Data integrity matters for downstream dashboard aggregation, but this story depends on the core pin record existing first.

**Independent Test**: Can be verified by creating a pin record, deleting the associated event, and confirming the pin record no longer exists.

**Acceptance Scenarios**:

1. **Given** one or more users have pinned an event, **When** that event is deleted, **Then** all pin records for that event are removed automatically.
2. **Given** an event with no pin records, **When** the event is deleted, **Then** deletion completes without error.

---

### User Story 4 - Safe Schema Deployment (Priority: P2)

The new pin persistence must be deployable to both brand-new environments and existing production databases without manual intervention or data loss to existing records.

**Why this priority**: Schema changes must not block releases. This is a prerequisite for any environment to adopt server-side pinning.

**Independent Test**: Can be verified by applying the schema change to a fresh database and an existing database that already contains users, venues, and events, confirming both succeed.

**Acceptance Scenarios**:

1. **Given** a fresh database with no prior pin table, **When** the schema change is applied, **Then** the pin persistence structure is created and the application starts successfully.
2. **Given** an existing database with users, venues, and events, **When** the schema change is applied, **Then** the migration completes without error and all pre-existing data remains intact.

---

### Edge Cases

- What happens when a user pins an event and that event is later deleted? Pin records are removed automatically with the event.
- What happens when the same user attempts to pin the same event twice? Only one pin record exists; duplicate pairs are prevented.
- What happens when a user belongs to multiple organizations? Pin records are scoped through the event's venue organization; pins for events outside the active organization context are not visible.
- What happens when no API exists yet to create pins? The persistence layer is in place but user-facing pin/unpin actions remain handled by existing client-side storage until a follow-on feature delivers API endpoints.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST persist a pin record associating a user with an event they have pinned.
- **FR-002**: Each pin record MUST include the time the pin was created.
- **FR-003**: System MUST enforce at most one pin record per user per event (composite uniqueness on user and event).
- **FR-004**: Pin records MUST be scoped to the organization of the pinned event's venue; cross-organization pin data MUST NOT be accessible.
- **FR-005**: When an event is deleted, all pin records referencing that event MUST be removed automatically.
- **FR-006**: System MUST provide a schema change that applies cleanly on both fresh and existing databases without data loss to existing entities.
- **FR-007**: Pin persistence MUST follow the same data modeling and tenant-isolation conventions established by existing user–entity association patterns in the platform.
- **FR-008**: System MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III).

### Out of Scope

- **OOS-001**: User-facing pin and unpin API endpoints (tracked separately as SPLR-70).
- **OOS-002**: Dashboard aggregation endpoint and event card DTO assembly (tracked separately as SPLR-72).
- **OOS-003**: Migrating the frontend from browser-local pin storage to server-side pins.
- **OOS-004**: Pin ordering, limits, or UI behavior changes on the dashboard overview page.

### Key Entities

- **User Event Pin**: A per-user bookmark linking a user to an event they chose to pin. Identified by the combination of user and event. Carries a pin timestamp. Belongs to an event; inherits organization scope through the event's venue. Removed when the referenced event is deleted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Schema change applies successfully on 100% of test runs against both fresh and pre-populated databases.
- **SC-002**: Pin records for deleted events are fully removed within the same deletion transaction (zero orphaned pin records after event deletion in integration tests).
- **SC-003**: Cross-organization isolation tests confirm zero pin records leak across tenant boundaries.
- **SC-004**: Downstream features (pin API and dashboard aggregation) can depend on the pin persistence layer without additional schema changes for the core user–event–timestamp model.
- **SC-005**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Users and events already exist as first-class entities with established organization scoping through venues.
- Dashboard overview currently stores pin state in browser-local storage; that behavior remains unchanged until API and frontend migration work in later issues.
- Pin records are user-specific (not shared across users in the organization); each user maintains their own pinned events.
- No maximum pin count is enforced in this feature; any limits would be defined in a future UX or API policy.
- Automated verification for this feature focuses on backend integration tests for schema, tenant isolation, and cascade behavior; frontend changes are minimal or absent in this phase.

## Dependencies

- **Upstream**: Existing user, venue, event, and organization tenant model (001-tenant-rbac-foundation).
- **Downstream**: SPLR-70 (pin/unpin API endpoints), SPLR-72 (dashboard service and GET /dashboard aggregates).
