# MYBlab — Roadmap Execution Rules

## Purpose

These rules separate strategy, backlog, repository reality and execution so that the team can answer quickly:

- Where are we?
- Where are we going?
- Why is this the next work?
- What comes after it?

## Four distinct sources

### 1. Roadmap — where we are going
Defines levels, capabilities, programs, epics, dependencies, milestones and intended sequencing.

### 2. Backlog — work that may be done
Contains candidate tickets/work packages. Presence in backlog is not authorization and not proof of priority.

### 3. Repository state — what actually exists
Code, tests, ADRs, commits and integrated artifacts are the factual implementation state.

### 4. Historical register — how we got here
Records completed, blocked, abandoned, superseded and regularized work with its decisions and evidence.

These four must never be treated as interchangeable.

## Next Action Gate

Before any work is declared NEXT, the planning record must answer all of the following:

1. Which Level 1 capability does it advance?
2. Which acceptance scenario does it help pass?
3. What exact gap does it close?
4. Why now rather than another candidate?
5. Which dependencies are already satisfied?
6. Which dependencies remain open?
7. Does it introduce or modify an architectural contract?
8. Is a ruling/ADR required before implementation?
9. What existing implementation can be reused?
10. What is the smallest safe scope?
11. What automated evidence is required?
12. What user-visible/reproducible evidence is required?
13. What constitutes STOP/FAIL?
14. What work becomes unblocked after completion?
15. What is the expected successor or successor set?

If these questions cannot be answered, the item is not ready to be the next implementation ticket.

## Candidate ranking model

Phase 2 should rank candidates using at least:

- Level 1 impact;
- scenario impact;
- dependency criticality;
- number/value of capabilities unblocked;
- architectural risk;
- reuse of existing foundations;
- evidence gained;
- governance cost;
- implementation scope;
- safe parallelization potential.

Priority must not be determined by ticket number alone.

## Successor rule

Every implementation ticket should identify before execution:

- expected successor if PASS;
- alternate successor if a dependency remains;
- condition that would force re-planning.

This is a planning forecast, not an irreversible commitment, but it eliminates the recurring blank state after ticket closure.

## Integration closure rule

A ticket is not operationally closed until the record can answer:

```text
Ticket
 → decision/ruling
 → implementation
 → tests
 → commit
 → integration
 → delivery/evidence
 → capability state update
 → roadmap/history update
 → successor decision
```

## Anti-waste rules

- Do not repeat full audits when a bounded verification is sufficient.
- Do not ask an agent to perform an operation known to be unavailable in its environment.
- Do not confuse local commit creation, local Windows transfer and GitHub push; each actor must receive only operations it can perform.
- Do not reopen a settled architectural question without new contradictory evidence.
- Do not create duplicate tickets for historical work merely to make numbering look complete; regularize history explicitly.
- Do not implement visible features around an unresolved shared contract when that would create competing semantics.
- Prefer one authoritative status source per concern.

## Phase 2 output requirement

Phase 2 must produce a sequenced capability plan with dependencies, candidate work packages, evidence gates, parallelizable streams and explicit successors. The result must make the next action discoverable without another global archaeology exercise.