# MYBlab Constitution

**Version:** 1.0.0  
**Status:** ACTIVE  
**Authority:** Project Lead  

## Article 1 — Mission

MYBlab is an open educational laboratory and simulation platform. Its purpose is to provide a reliable, extensible and pedagogically useful environment for experimentation, learning and development.

## Article 2 — Authority

The Project Lead is the final authority for project direction and for decisions that modify this Constitution.

## Article 3 — Architectural Governance

Architectural decisions must be documented, reviewable and traceable. Significant architectural changes require an explicit Architecture Decision Record (ADR) or equivalent governed decision.

## Article 4 — Separation of Concerns

Core/domain models, execution/simulation, presentation and platform services must remain separated by explicit contracts. A visual or UI concern must not silently become a domain or simulation concern.

## Article 5 — Source of Truth

The Document/Core model is the source of truth for circuit topology and persisted domain state. Presentation layers consume domain and execution state through defined interfaces and must not redefine domain truth.

## Article 6 — Change Discipline

Changes must be scoped, reviewable, testable and traceable to a roadmap item or governed ticket. No implementation may silently expand its authorized scope.

## Article 7 — Agent Governance

Agents operate only within their assigned roles and scopes. No agent may unilaterally alter project governance, architecture authority or another agent's mandated responsibility.

## Article 8 — Validation

Architectural and implementation work must be validated against explicit acceptance criteria and available evidence. Validation status must not be inferred from intention alone.

## Article 9 — Documentation

Important project decisions, architectural constraints and delivery outcomes must be documented in the repository so that project continuity does not depend on private memory or conversational context.

## Article 10 — Roadmap Authority

The roadmap is the strategic coordination layer between project vision, architecture and executable work. Tickets must be traceable to an applicable roadmap programme and epic.

## Article 11 — Historical Artifacts

Historical architecture documents and superseded decisions must be preserved when they provide useful context. Supersession must be explicit; historical artifacts must not silently become current authority.

## Article 12 — No Implicit Architecture

A code implementation, commit message or agent recommendation does not by itself constitute an architectural decision. Architectural authority comes from the governed documentation and decision process.

## Article 13 — Project Lead Override

The Project Lead may explicitly approve a strategic or constitutional change after reviewing the relevant evidence. Such approval must be recorded in the repository.

## Article 14 — Architecture Reference Hierarchy

The project's architecture reference hierarchy is:

1. **Level 1 — Constitution:** `docs/governance/CONSTITUTION.md`
2. **Level 2 — Architecture Decision Records:** `docs/governance/ADR/`
3. **Level 3 — Platform Architecture:** `docs/architecture/PLATFORM_ARCHITECTURE.md`
4. **Level 4 — Implementation architecture and subsystem documentation:** repository architecture documents, blueprints and governed technical specifications

`docs/architecture/PLATFORM_ARCHITECTURE.md` is the authoritative Level 3 architectural reference for the platform. It defines the platform-wide architectural boundaries and invariants beneath this Constitution and above implementation-level documentation.

`docs/architecture/01-ARCHITECTURE.md` is retained as a historical/implementation-level architecture document and must not be treated as the authoritative Level 3 platform architecture unless a future governed decision explicitly changes the hierarchy.

Any conflict between levels is resolved upward: a lower-level document cannot override a higher-level authority. ADRs record and explain architectural decisions and must remain consistent with this hierarchy.

## Article 15 — Strategic Product Vision

MYBlab's visual and product evolution follows a staged trajectory: first reach the usability and visual benchmark represented by Tinkercad; then exceed that benchmark; then evolve toward an advanced, realistic and immersive virtual electronics laboratory. This strategic direction is recorded in `docs/roadmaps/ROADMAP_PLATFORM.md` and guides future roadmap and architectural decisions.

## Article 16 — Amendment of the Constitution

Any amendment to this Constitution requires an explicit decision of the Project Lead and must be recorded through the governed documentation process.
