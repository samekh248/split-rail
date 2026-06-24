# Feature Specification: Complete Organization & Venue CRUD

**Feature Branch**: `011-complete-organization-and`

**Created**: 2026-06-16

**Status**: Draft

**Input**: User description: "Complete Organization & Venue CRUD endpoints" (Linear SPLR-26)

## Clarifications

### Session 2026-06-16

- Q: Should this feature deliver only the update endpoints, or full organization CRUD (including list and delete)? → A: Full organization CRUD — add organization list and delete alongside the organization update and venue update endpoints, plus the error-contract/permission-gating consistency pass.
- Q: How should concurrent updates to the same organization or venue be handled? → A: Last-write-wins; the latest successful update overwrites, with no version-conflict error (no version/ETag column introduced).
- Q: What name validation should the endpoints enforce? → A: Required + trimmed whitespace, plus a standard maximum length (200 characters) applied consistently to both create and update for organizations and venues.
- Q: How should deleting an organization that still owns venues/financial data behave? → A: Soft-delete (mark archived/inactive, retain records) AND block deletion when the organization still has venues or financial data unless it is explicitly empty.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Organization admin renames their organization (Priority: P1)

An administrator of an organization updates their organization's details (primarily its display name) so the workspace reflects the correct, current organization identity.

**Why this priority**: Renaming the organization is the headline acceptance criterion of the issue and the most visible gap (organizations currently can only be created and read). It is the smallest standalone slice that delivers user-visible value and can be demonstrated on its own.

**Independent Test**: Authenticate as an org admin, submit an update to the organization's name, and confirm the change is persisted and returned; confirm a non-admin member receives an authorization rejection and the name is unchanged.

**Acceptance Scenarios**:

1. **Given** an authenticated organization administrator, **When** they submit a new valid name for their own organization, **Then** the organization name is updated and the updated organization details are returned.
2. **Given** an authenticated member who is not an administrator, **When** they attempt to update the organization, **Then** the request is rejected as unauthorized and the organization is unchanged.
3. **Given** an administrator, **When** they submit an empty or whitespace-only name, **Then** the request is rejected with a validation error and the organization is unchanged.
4. **Given** an administrator of organization A, **When** they attempt to update a different organization B, **Then** the request is rejected (not found or unauthorized) and organization B is unchanged.

---

### User Story 2 - Authorized user updates venue details (Priority: P2)

A user with the appropriate permission updates a venue's details (primarily its name) for a venue that is within their access scope, so venue information stays accurate.

**Why this priority**: Venue update is the second missing endpoint and completes the venue CRUD surface. It depends on the same gating/validation patterns proven in Story 1 but adds venue-scope enforcement, so it is sequenced second.

**Independent Test**: Authenticate as a user with venue-management permission whose scope includes the target venue, update the venue name, and confirm persistence; confirm that a user lacking the permission, and a permitted user whose scope excludes the venue, are both rejected.

**Acceptance Scenarios**:

1. **Given** an authorized user whose scope includes the target venue, **When** they submit a new valid venue name, **Then** the venue is updated and the updated venue details are returned.
2. **Given** a user who lacks the venue-management permission, **When** they attempt to update a venue, **Then** the request is rejected as unauthorized and the venue is unchanged.
3. **Given** an authorized user whose scope does NOT include the target venue, **When** they attempt to update that venue, **Then** the request is rejected as out-of-scope and the venue is unchanged.
4. **Given** an authorized user, **When** they attempt to update a venue that does not exist within their organization, **Then** the request is rejected as not found.
5. **Given** an authorized user, **When** they submit an empty or whitespace-only venue name, **Then** the request is rejected with a validation error and the venue is unchanged.

---

### User Story 3 - View the organizations a user belongs to (list) (Priority: P3)

An authenticated user retrieves the list of organizations they are a member of, so client applications can present and select among the user's organizations.

**Why this priority**: Listing completes the organization read surface and is low-risk (read-only), but it is not part of the issue's core acceptance criteria, so it sits below the update operations.

**Independent Test**: Authenticate as a user who belongs to one or more organizations, request the organization list, and confirm only the user's member organizations are returned; confirm organizations the user does not belong to never appear.

**Acceptance Scenarios**:

1. **Given** an authenticated user who is a member of one or more organizations, **When** they request their organizations, **Then** the list of organizations they belong to is returned.
2. **Given** an authenticated user, **When** they request the organization list, **Then** organizations they are not a member of are never included (tenant isolation preserved).
3. **Given** an authenticated user with no active (non-archived) organization membership, **When** they request the list, **Then** an empty list is returned rather than an error.

---

### User Story 4 - Organization admin deletes (archives) an organization (Priority: P4)

An administrator removes an organization that is no longer needed. To protect financial integrity, deletion archives the organization (soft delete) and is blocked while the organization still owns venues or financial data unless it is explicitly empty.

**Why this priority**: Delete completes organization CRUD but is the most destructive operation and the least central to the issue's acceptance criteria, so it is sequenced last among the resource operations.

**Independent Test**: Authenticate as an org admin; attempt to delete an organization that still has venues/financial data and confirm it is blocked with a conflict error; empty the organization (or use an empty one), delete it, and confirm it is archived and no longer returned by reads while underlying records are retained; confirm a non-admin is rejected.

**Acceptance Scenarios**:

1. **Given** an org administrator and an organization with no venues or financial data, **When** they delete it, **Then** the organization is archived (soft-deleted), a success response is returned, and it no longer appears in reads.
2. **Given** an org administrator and an organization that still has venues or financial data, **When** they attempt to delete it, **Then** the request is rejected with a conflict error and the organization remains active.
3. **Given** a non-administrator member, **When** they attempt to delete the organization, **Then** the request is rejected as unauthorized and the organization is unchanged.
4. **Given** an administrator of organization A, **When** they attempt to delete a different organization B, **Then** the request is rejected (not found or unauthorized) and organization B is unchanged.
5. **Given** an already-archived or non-existent organization, **When** a delete is attempted, **Then** the standard not-found contract is returned.

---

### User Story 5 - Consistent error contracts and permission gating across tenant CRUD (Priority: P5)

A consumer of the tenant management API receives consistent, predictable error responses and authorization behavior across the organization and venue endpoints, so client integrations can handle outcomes uniformly.

**Why this priority**: Consistency is explicitly required by the issue ("confirm consistent error contracts and permission gating") but is a cross-cutting hardening concern that builds on the resource operations. It is valuable yet lowest priority because the individual endpoints deliver value before the consistency pass.

**Independent Test**: Exercise the new and adjacent tenant endpoints with unauthorized, out-of-scope, not-found, and invalid-input cases and confirm each returns the standard error shape and status used elsewhere in the tenant API.

**Acceptance Scenarios**:

1. **Given** the tenant management endpoints, **When** an unauthorized request is made, **Then** the response uses the same authorization-failure contract (status and body shape) used across the tenant API.
2. **Given** the tenant management endpoints, **When** a validation failure occurs, **Then** the response uses the same validation-error contract used across the tenant API.
3. **Given** a request for a resource that does not exist or is outside the caller's tenant/scope, **When** it is evaluated, **Then** the response uses the standard not-found/forbidden contract without leaking cross-tenant existence details.

---

### Edge Cases

- **Idempotent no-op update**: Submitting the same name the resource already has succeeds and returns the unchanged-but-current details (no error).
- **Overly long name**: A name exceeding the maximum length (200 characters) is rejected with a validation error, for both organizations and venues, on create and update.
- **Name with surrounding whitespace**: Leading/trailing whitespace is trimmed before persistence, consistent with create behavior.
- **Cross-tenant attempt**: Any attempt to read, update, or delete an organization or venue belonging to another organization is rejected and reveals no cross-tenant information.
- **Concurrent updates**: Under last-write-wins, two near-simultaneous updates to the same resource both succeed and the most recent write determines the final stored value; no version-conflict error is raised.
- **Missing/invalid identifier**: A malformed or unknown resource identifier yields the standard not-found/validation response.
- **Delete a non-empty organization**: Deleting an organization that still owns venues or financial data is blocked with a conflict error; the organization stays active.
- **Read excludes archived organizations**: A soft-deleted (archived) organization no longer appears in list/read results, while its underlying records are retained.
- **Empty organization list**: A user with no active organization membership receives an empty list rather than an error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow an organization administrator to update their own organization's name via an update operation on the organization resource.
- **FR-002**: The system MUST reject organization update attempts from members who lack administrator permission, leaving the organization unchanged.
- **FR-003**: The system MUST allow a user holding the venue-management permission to update a venue that is within their access scope.
- **FR-004**: The system MUST reject venue update attempts from users lacking the required permission, leaving the venue unchanged.
- **FR-005**: The system MUST reject venue update attempts for venues outside the requesting user's venue scope, leaving the venue unchanged.
- **FR-006**: The system MUST allow an authenticated user to retrieve the list of organizations they are a member of, excluding archived organizations and any organization the user does not belong to.
- **FR-007**: The system MUST allow an organization administrator to delete their own organization, performing a soft delete (archive) that retains underlying records while excluding the organization from subsequent reads.
- **FR-008**: The system MUST block organization deletion when the organization still owns venues or financial data, returning a conflict error and leaving the organization active; deletion is permitted only when the organization is empty.
- **FR-009**: The system MUST reject organization deletion attempts from members who lack administrator permission, leaving the organization unchanged.
- **FR-010**: The system MUST validate name input for create and update of both organizations and venues, rejecting empty or whitespace-only names and names exceeding a maximum length of 200 characters; this limit applies consistently to create and update.
- **FR-011**: The system MUST trim surrounding whitespace from submitted names before persistence, consistent across create and update for organizations and venues.
- **FR-012**: The system MUST resolve concurrent updates to the same resource using last-write-wins semantics; it MUST NOT require a client-supplied version/ETag and MUST NOT raise a version-conflict error for concurrent updates.
- **FR-013**: The system MUST scope all organization and venue read, update, and delete operations to the authenticated user's organization/membership, preventing any cross-tenant access or modification.
- **FR-014**: The system MUST return the updated resource details upon a successful update.
- **FR-015**: The system MUST return consistent, standardized error responses (authorization failure, validation failure, conflict, not found) matching the contracts used elsewhere in the tenant management API, without leaking cross-tenant existence details.
- **FR-016**: The system MUST record an audit-appropriate log entry for successful organization and venue updates and deletions, without writing sensitive personal or secret data to logs.
- **FR-017**: The system MUST achieve ≥80% line/branch coverage across backend and frontend for this feature (CI-enforced; Constitution III), including integration tests covering the new organization list, update, and delete endpoints and the venue update endpoint (authorized, unauthorized, out-of-scope, not-found, conflict, and invalid-input paths).

### Key Entities *(include if feature involves data)*

- **Organization**: The top-level tenant. Relevant attributes for this feature: a unique identifier, a human-readable name (updatable, ≤200 chars), a creation timestamp, and an archived/active state (set by soft delete). An organization has members with roles that determine administrative permission, and may own venues and financial data.
- **Venue**: A location belonging to an organization. Relevant attributes: a unique identifier, the owning organization, a human-readable name (updatable, ≤200 chars), and a creation timestamp. Access to a venue may be restricted by a user's venue scope.
- **Organization Membership**: The relationship linking a user to an organization with a role; it determines which organizations appear in a user's organization list and whether the user holds administrative permission.
- **User Permission / Venue Scope**: The role-derived permission that authorizes management actions, and the set of venues a user may act on. Together they determine whether an update or delete is allowed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of organization update attempts by non-administrators are rejected, and 100% of valid updates by administrators succeed and persist.
- **SC-002**: 100% of venue update attempts by users lacking permission OR acting outside their venue scope are rejected, and 100% of valid in-scope updates by permitted users succeed and persist.
- **SC-003**: 100% of organization list requests return only the requesting user's member, non-archived organizations (no cross-tenant leakage), including an empty list when there are none.
- **SC-004**: 100% of organization delete attempts on non-empty organizations are blocked with a conflict response; 100% of deletes on empty organizations by administrators archive the organization and remove it from subsequent reads while retaining records; 100% of delete attempts by non-administrators are rejected.
- **SC-005**: 0 cross-tenant operations are possible; every attempt to read, update, or delete a resource in another organization is rejected without revealing the resource's existence.
- **SC-006**: All five error categories (unauthorized, forbidden/out-of-scope, conflict, not-found, validation) return the standardized contract consistent with the rest of the tenant API, verified across the organization (list/update/delete) and venue (update) endpoints.
- **SC-007**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- **Scope is full organization CRUD plus the venue update endpoint.** This feature delivers organization update, organization list, and organization delete (completing organization CRUD on top of the existing create and get-current), the missing venue update, and a consistency pass on error contracts and permission gating. (Venue list/create/get/delete already exist.)
- The "administrator" capability for organization update and delete maps to the existing organization administrator role / manage-permissions capability already used for other tenant-management actions (e.g., venue create/delete, invitations, roles); no new permission type is introduced.
- Venue update authorization uses the same permission used for venue create/delete, combined with the existing venue-scope accessibility rule.
- Organization "list" means the organizations the authenticated user is a member of (tenant-safe), not a global listing of all organizations in the system.
- Organization delete is a **soft delete (archive)**: the record and its dependents are retained, the organization is excluded from reads, and deletion is blocked while the organization still owns venues or financial data (only empty organizations may be archived). This protects financial-record integrity.
- Concurrent updates use **last-write-wins**; no optimistic-concurrency version/ETag field is introduced and no conflict error is raised for concurrent updates (a conflict error IS used for the non-empty organization delete case).
- Name validation applies a maximum length of **200 characters** plus required/trim rules, consistently across create and update for both organizations and venues; existing create operations are aligned to this limit.
- "Organization settings" updates are limited to the organization's name for this slice; no additional organization settings fields exist yet, and adding new fields is out of scope.
- Frontend data contracts for any updated payloads are consumed from the generated API types rather than hand-written interfaces, per contract-governance rules; if request/response shapes change, the backend contract is the source of truth and the generated types cascade to the frontend.
- Standard authentication is already in place; this feature concerns authorization and resource behavior, not the login mechanism.
- Existing error-handling middleware and exception types (validation, authorization, conflict, not-found) are reused to keep error contracts consistent.
