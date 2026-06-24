# Feature Specification: Root Task Runner Orchestrating Both Stacks

**Feature Branch**: `056-root-taskfile-orchestration`

**Created**: 2026-06-22

**Status**: Draft

**Input**: User description: "Root Taskfile.yml orchestrating both stacks (SPLR-50) — unify the polyglot monorepo under a root-level task runner so developers can build, test, run API and web stacks, regenerate API types, and execute end-to-end tests from the repository root; document usage in README."

**Linear**: [SPLR-50](https://linear.app/audiodex/issue/SPLR-50/root-taskfileyml-orchestrating-both-stacks)

## Overview

The repository contains two primary application stacks — a backend API and a frontend web application — plus shared workflows such as API type generation and browser-based end-to-end testing. Today, the root-level task runner is a placeholder and does not orchestrate any real developer workflows. Contributors must discover and run commands inside individual project folders, which slows onboarding and creates inconsistent local habits compared to continuous integration.

This feature delivers a single, documented entry point at the repository root so any developer can build, test, run, and verify both stacks — plus cross-cutting workflows — without memorizing per-folder commands.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build and Test Both Stacks from the Root (Priority: P1)

As a developer working on the monorepo, I want to build and run automated tests for the API and web application from the repository root, so that I can verify my changes quickly without changing directories or hunting for the correct commands.

**Why this priority**: Build and test are the most frequent daily actions. Unifying them at the root removes the largest friction point and aligns local workflows with how CI already exercises the project.

**Independent Test**: From a clean clone at the repository root, run the documented root commands for API build, API test, web build, and web test. Each command completes successfully and produces the same outcomes as running the equivalent workflow inside the respective project folder.

**Acceptance Scenarios**:

1. **Given** a developer at the repository root with prerequisites installed, **When** they run the root command to build the API, **Then** the API compiles successfully.
2. **Given** a developer at the repository root, **When** they run the root command to test the API, **Then** the API test suite executes and reports pass/fail results.
3. **Given** a developer at the repository root, **When** they run the root command to build the web application, **Then** the web application build completes successfully.
4. **Given** a developer at the repository root, **When** they run the root command to test the web application, **Then** the web unit test suite executes and reports pass/fail results.

---

### User Story 2 - Run Both Stacks for Local Development (Priority: P2)

As a developer starting local work, I want a single root command that brings up both the API and web application for development, so that I can exercise the full product locally with minimal setup steps.

**Why this priority**: Combined local development is essential for feature work that spans backend and frontend, but it is secondary to the ability to build and test individual stacks in isolation.

**Independent Test**: From the repository root, run the documented combined development command. Both the API and web development servers become reachable, and the developer can load the web UI in a browser while the API serves requests.

**Acceptance Scenarios**:

1. **Given** a developer at the repository root with required local services available (e.g., database), **When** they run the combined development command, **Then** both the API and web development processes start without requiring manual navigation into subfolders.
2. **Given** the combined development command is running, **When** the developer opens the web application in a browser, **Then** the UI loads and can communicate with the locally running API.
3. **Given** the combined development command is running, **When** the developer stops it, **Then** both development processes terminate cleanly.

---

### User Story 3 - Regenerate API Types from the Root (Priority: P2)

As a developer who changed an API contract, I want to regenerate frontend API types from the repository root, so that frontend types stay synchronized with backend changes without running a multi-step manual sequence.

**Why this priority**: Contract synchronization is a recurring cross-stack workflow mandated by project governance. Making it a first-class root command prevents type drift and reduces errors during API changes.

**Independent Test**: From the repository root, run the documented type-generation command while the API is available. The generated frontend API types update to reflect the current API contract.

**Acceptance Scenarios**:

1. **Given** the API is buildable and reachable for contract export, **When** the developer runs the root type-generation command, **Then** frontend API types are regenerated from the live API contract.
2. **Given** the API contract has changed since the last generation, **When** type generation completes, **Then** the regenerated types reflect those changes.
3. **Given** the API is not reachable when type generation is attempted, **When** the command runs, **Then** the developer receives a clear failure message explaining what prerequisite is missing.

---

### User Story 4 - Run End-to-End Tests from the Root (Priority: P3)

As a developer or reviewer validating integration behavior, I want to launch the browser-based end-to-end test suite from the repository root, so that full-stack verification is as accessible as unit tests.

**Why this priority**: End-to-end tests are run less frequently than unit tests but are required for release confidence (related milestone SPLR-20). Exposing them at the root completes the orchestration picture.

**Independent Test**: From the repository root, run the documented end-to-end test command against a suitable target environment. The browser test suite executes and reports results equivalent to running it from the dedicated test package folder.

**Acceptance Scenarios**:

1. **Given** a configured end-to-end target environment, **When** the developer runs the root end-to-end command, **Then** the browser test suite executes and reports pass/fail results.
2. **Given** required environment variables or URLs for end-to-end testing are missing, **When** the command runs, **Then** the developer receives a clear failure message indicating what configuration is needed.

---

### User Story 5 - Discover Commands via README (Priority: P1)

As a new contributor, I want the repository README to document all root-level developer commands, so that I can onboard without asking teammates or reading CI configuration.

**Why this priority**: Documentation is part of the deliverable per SPLR-50 acceptance criteria and is required for the orchestration to deliver real value.

**Independent Test**: A developer unfamiliar with the repo reads only the README section for root commands and successfully runs build, test, combined dev, type generation, and end-to-end workflows.

**Acceptance Scenarios**:

1. **Given** a new contributor reading the README, **When** they look for local development instructions, **Then** they find a dedicated section listing all root-level commands with a short description of each.
2. **Given** the README documents a root command, **When** the contributor runs that command as documented, **Then** it performs the described workflow successfully (assuming prerequisites are met).

---

### Edge Cases

- What happens when the task runner tool itself is not installed on the developer's machine?
- How does the system behave when only one stack's prerequisites are met (e.g., Node installed but not the .NET SDK)?
- What happens when combined development is started but the database or other required local service is unavailable?
- How does type generation behave when the API is running on an unexpected port or not yet started?
- What happens when end-to-end tests are invoked without a reachable preview or local target URL?
- How are concurrent runs handled if a developer starts combined dev while a test command is already running?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST provide root-level commands to build the API stack.
- **FR-002**: The repository MUST provide root-level commands to run the API automated test suite.
- **FR-003**: The repository MUST provide root-level commands to start the web application in development mode.
- **FR-004**: The repository MUST provide root-level commands to build the web application.
- **FR-005**: The repository MUST provide root-level commands to run the web automated test suite.
- **FR-006**: The repository MUST provide a root-level command to regenerate frontend API types from the current API contract.
- **FR-007**: The repository MUST provide a root-level command to run the browser-based end-to-end test suite.
- **FR-008**: The repository MUST provide a root-level command that starts both the API and web application for combined local development.
- **FR-009**: Root-level commands MUST delegate to existing per-package workflows rather than duplicating build or test logic inline, so behavior stays consistent with CI and individual package scripts.
- **FR-010**: Root-level commands MUST emit clear, actionable error output when prerequisites (missing tooling, unreachable API, missing environment configuration) are not satisfied.
- **FR-011**: The repository README MUST document every root-level command with a name, brief purpose, and any notable prerequisites.
- **FR-012**: The placeholder root task runner content MUST be replaced; the root task runner MUST orchestrate real developer workflows upon completion of this feature.
- **FR-013**: Root-level command behavior MUST be verifiable through automated contract tests that confirm each documented command exists and invokes the expected underlying workflow (Constitution III).
- **FR-014**: This feature MUST achieve ≥80% line/branch coverage across backend and frontend for all new or modified code paths introduced by the feature (CI-enforced; Constitution III).

### Key Entities

- **Root command**: A named developer workflow exposed at the repository root (e.g., build API, test web, combined dev). Identified by a short command name and described in the README.
- **Stack workflow**: An existing build, test, or run procedure belonging to either the API or web application package.
- **Cross-stack workflow**: A procedure spanning both stacks, such as API type generation or end-to-end browser testing.
- **Command catalog**: The README section enumerating all root commands, their purposes, and prerequisites.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can build and test both the API and web application using only root-level commands, without changing into subdirectories, in four or fewer distinct commands.
- **SC-002**: A new contributor can locate and understand all root-level commands by reading the README alone, without consulting CI configuration or teammate guidance.
- **SC-003**: 100% of workflows listed in SPLR-50 scope (API build/test, web dev/build/test, type generation, end-to-end tests, combined dev) are runnable from the repository root via documented commands.
- **SC-004**: Root-level command outcomes match the outcomes of the equivalent per-package commands (no behavioral drift between root and package-level entry points).
- **SC-005**: When prerequisites are missing, developers receive an error within one command invocation that identifies the failure category (missing tool, unreachable service, or missing configuration) without silent no-ops.
- **SC-006**: ≥80% line/branch coverage achieved across backend and frontend code for this feature (CI-enforced; Constitution III).

## Assumptions

- Developers install the [Task](https://taskfile.dev/) task runner locally; prerequisite installation is documented in the README but not automated by this feature.
- The API and web application retain their existing per-package scripts as the authoritative implementation; root commands are thin orchestration wrappers.
- Combined local development assumes standard local prerequisites (database, environment variables) already documented elsewhere in the project; this feature documents any additional prerequisites specific to root commands.
- Type generation requires a reachable API instance exporting its contract; the root command may start the API or assume it is already running, provided the README states the expectation clearly.
- End-to-end tests require a configured target environment (local or preview); the root command documents required environment variables but does not provision cloud infrastructure.
- This feature does not change CI workflow definitions; it aligns local developer experience with workflows CI already performs.
- Related milestone SPLR-20 (full-scale E2E lifecycle testing) defines E2E quality gates; this feature only exposes E2E execution from the root, not new test scenarios.

## Dependencies

- Existing API project build and test infrastructure (`apps/api`, `apps/api.tests`).
- Existing web application scripts (`apps/web`).
- Existing API type generation script (`gen:api` workflow in web package).
- Existing Playwright end-to-end test package (`tests/e2e`).
- SPLR-20 E2E platform (related; root E2E command depends on the E2E package existing but does not require SPLR-20 to be complete for basic command exposure).
