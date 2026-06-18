# ADR 003: Repository interface boundary

**Date:** 2026-06-18
**Status:** Accepted

## Context
Repository interfaces define the contract between business logic (services) and
data access (Drizzle implementations). What belongs in the interface vs what
should be handled at the service/guard level?

## Decision
Repository interfaces define data access operations only — no business logic.
Ownership verification, authorization, and validation live in services or guards.

## Implications
- `BookRepository.update(id, data)` does NOT accept `userId` — ownership is the
  caller's responsibility
- `decrementStock()` and `incrementStock()` are valid in the repository because
  they are atomic data operations, not business rules
- Cross-table projections (e.g., `BookReadModel`) are separate interfaces to keep
  single-table repositories focused

## Consequences
- Repository interfaces are thinner and focused
- Callers must compose authorization + data access (via guards or service methods)
- Testing: repositories test data logic, guards test authorization, services test orchestration
