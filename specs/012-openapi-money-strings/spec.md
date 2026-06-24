# Feature Specification: Emit Money Decimals as OpenAPI Strings + Regenerate TS Types

**Feature Branch**: `012-openapi-money-strings`

**Created**: 2026-06-16

**Status**: Draft

**Input**: User description: "Emit money decimals as OpenAPI strings + regenerate TS types (SPLR-27)"

## Overview

The API's runtime JSON already serializes monetary values as fixed-precision decimal strings (e.g. `"1250.00"`), but the published API contract (OpenAPI/Swagger schema) still describes those same monetary fields as floating-point numbers. Because the frontend's data contracts are generated directly from the published API contract, the generated type definitions classify money as numeric while the actual payloads carry strings. This contradiction (type drift) causes the frontend type-checker to report errors and undermines the project's prohibition on using floating-point types for money.

This feature aligns the published contract with runtime behavior so that money is described as a string everywhere, the generated frontend contracts type money as strings, and the codebase type-checks cleanly.

## Clarifications

### Session 2026-06-16

- Q: How should monetary fields be identified for conversion to string in the contract? → A: Convert ALL `decimal`-typed properties to OpenAPI `string` (blanket rule by underlying type), consistent with Constitution I (all money uses the `decimal` primitive; floats prohibited).
- Q: Is the `contract-type-drift` CI check already in place, or must this feature build it? → A: It already exists; this feature only needs to make it pass (no new CI authoring in scope).
- Q: Should money fields carry extra precision hints (format/pattern/example) beyond `type: string`? → A: No — plain `string` only; minimal change to resolve the drift without over-specifying the contract.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Published contract describes money as strings (Priority: P1)

A consumer of the API contract (the frontend type generator, an external integrator, or a developer reading the schema) inspects the published API description and sees every monetary field declared as a string type, matching the values actually returned at runtime.

**Why this priority**: This is the root-cause fix. Without it, every downstream consumer of the contract receives an incorrect description of money fields, and the type drift cannot be resolved at its source.

**Independent Test**: Generate/inspect the published API schema and confirm that all monetary fields are declared as string-typed; deliver value by giving every contract consumer an accurate money representation.

**Acceptance Scenarios**:

1. **Given** the API contract is published, **When** a consumer inspects any monetary field (e.g. proforma value, QBO actual value, variance amount), **Then** that field is declared with a string type rather than a numeric/floating-point type.
2. **Given** a monetary field is optional or nullable at runtime, **When** the contract is inspected, **Then** the field remains optional/nullable while still being typed as a string.
3. **Given** a non-monetary numeric field exists (e.g. sort order, counts, expiry seconds), **When** the contract is inspected, **Then** that field is still declared as a numeric type (the change is scoped to money only).

---

### User Story 2 - Frontend contracts type money as strings (Priority: P1)

A frontend developer relies on the auto-generated data contracts. After regeneration from the corrected published contract, every monetary property is typed as a string, matching how the values are consumed and tested in the UI.

**Why this priority**: The frontend already treats money as strings in code and tests; the generated types must agree, otherwise the type-checker fails and the contract-fidelity guarantee is broken.

**Independent Test**: Regenerate the frontend data contracts from the corrected published contract and confirm money properties are string-typed; deliver value by eliminating the mismatch between code and types.

**Acceptance Scenarios**:

1. **Given** the corrected published contract, **When** the frontend data contracts are regenerated, **Then** every monetary property in the generated contracts is typed as a string.
2. **Given** the regenerated contracts, **When** the frontend project is type-checked and built, **Then** the build completes with no money-related type errors.
3. **Given** the regenerated contracts, **When** the existing frontend code and tests that use string money literals are compiled, **Then** they remain valid without manual type-mirroring workarounds.

---

### User Story 3 - Contract/type drift guard passes in CI (Priority: P2)

A maintainer opens a pull request. The continuous-integration drift check that compares the published contract against the committed frontend contracts passes, confirming the two stay synchronized over time.

**Why this priority**: Prevents regression. Once the drift is fixed, an automated gate keeps the contract and generated types in agreement on every change.

**Independent Test**: Run the contract-type-drift check against the branch and confirm it reports no drift; deliver value by guaranteeing ongoing synchronization.

**Acceptance Scenarios**:

1. **Given** the corrected contract and regenerated types are committed, **When** the contract-type-drift check runs, **Then** it passes with no detected differences.
2. **Given** a future change re-introduces a numeric money type, **When** the drift check runs, **Then** it fails, surfacing the regression.

---

### Edge Cases

- **Nullable money fields**: A monetary field that can be absent must be typed as an optional string, never reverting to a numeric type.
- **Newly added money fields**: When a new monetary field is added to a data model later, it must automatically be described as a string in the contract without per-field manual configuration.
- **Mixed DTOs**: A data model containing both monetary and non-monetary numeric fields must have only the monetary fields converted to strings, leaving genuine numeric fields numeric.
- **Zero and negative values**: Money values of zero and negative amounts must still be represented as fixed-precision strings consistently with runtime serialization.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The published API contract MUST declare every monetary field as a plain string type (no added format, pattern, or example annotation), consistent with the fixed-precision string values returned by the API at runtime.
- **FR-002**: The contract description of monetary fields MUST preserve each field's optional/nullable status while changing only its type to string.
- **FR-003**: The conversion MUST apply automatically to every `decimal`-typed property (the canonical money primitive) so all current and future money fields become strings without per-field manual annotation.
- **FR-004**: Non-monetary numeric fields (such as ordering indices, counts, and durations) MUST remain numeric in the published contract.
- **FR-005**: The frontend's generated data contracts MUST be regenerated from the corrected published contract so that all monetary properties are typed as strings.
- **FR-006**: After regeneration, the frontend project MUST type-check and build successfully with no money-related type errors, and existing money-handling code/tests MUST remain valid without manual type-mirroring.
- **FR-007**: The existing contract-type-drift verification MUST pass, confirming the published contract and the committed generated contracts are synchronized. Authoring a new drift-check job is out of scope.
- **FR-008**: The feature MUST achieve ≥80% line/branch coverage across backend and frontend for any code introduced or modified by this feature (CI-enforced; Constitution III).

### Key Entities *(include if feature involves data)*

- **Monetary field**: Any data-model property representing currency (e.g. proforma value, actual value, variance amount). Represented at runtime and in the contract as a fixed-precision decimal string; may be required or optional.
- **Published API contract**: The machine-readable description of the API consumed by the frontend type generator and external integrators; the single source of truth from which frontend data contracts are generated.
- **Generated frontend data contracts**: The auto-generated type definitions imported by the frontend; must be derived solely from the published contract, never hand-authored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of monetary fields in the published API contract are declared as string types (0 monetary fields typed as numbers/floating-point).
- **SC-002**: 100% of monetary properties in the regenerated frontend data contracts are typed as strings.
- **SC-003**: The frontend type-check and build complete with 0 money-related type errors.
- **SC-004**: The contract-type-drift check passes (0 detected differences between the published contract and committed generated contracts).
- **SC-005**: 0 non-monetary numeric fields are incorrectly converted to string types (no regressions to genuine numeric fields).
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- The runtime serialization of money as fixed-precision strings is already correct and is the intended canonical representation; this feature changes only the contract description and downstream generated types, not runtime serialization behavior.
- Every monetary value uses the `decimal` primitive (Constitution I) and no non-monetary `decimal`-typed fields exist in the API surface, so a blanket "`decimal` → string" rule converts exactly the money fields with no false positives.
- The frontend continues to consume data contracts exclusively from the auto-generated contract file; no hand-authored type mirrors are introduced (Constitution VI).
- A contract-type-drift CI check already exists and enforces ongoing synchronization between the published contract and the generated frontend contracts; this feature makes it pass rather than creating it.
- Regenerating the frontend contracts is performed through the existing generation workflow that reads the published contract.
