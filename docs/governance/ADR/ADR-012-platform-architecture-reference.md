# ADR-012 — Adoption de PLATFORM_ARCHITECTURE comme référence d'architecture de niveau 3

**Status:** ACCEPTED  
**Date:** 2026-08-20  
**Decision authority:** Project Lead  
**Related:** ADR-011, Constitution Article 14

## Context

ADR-011 audited the repository's competing architecture documents and recommended `docs/architecture/PLATFORM_ARCHITECTURE.md` as the platform-level reference. The Project Lead explicitly authorized revision of Constitution Article 14 to adopt that hierarchy.

## Decision

`docs/architecture/PLATFORM_ARCHITECTURE.md` is the authoritative Level 3 platform architecture reference, beneath the Constitution and ADRs and above implementation-level architecture documentation.

`docs/architecture/01-ARCHITECTURE.md` is retained as historical/implementation-level documentation and does not override the Level 3 platform architecture.

## Consequences

- Future platform-wide architectural decisions must remain consistent with `PLATFORM_ARCHITECTURE.md` and the Constitution.
- Historical architecture documentation remains preserved for traceability.
- A future architectural change to this hierarchy requires a governed decision and, where applicable, a constitutional amendment.
- This ADR does not authorize implementation changes by itself.

## Evidence

- Project Lead authorization recorded in the project conversation on 2026-08-20.
- ADR-011 audit and recommendation.
- Constitution Article 14 as revised on 2026-08-20.
