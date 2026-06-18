# ADR 002: Symbol-based DI tokens

**Date:** 2026-06-18
**Status:** Accepted

## Context
NestJS supports both string and Symbol values as injection tokens.
Our codebase originally used string tokens like `'BOOK_REPO'`.

## Decision
Use `Symbol('BOOK_REPO')` instead of `'BOOK_REPO'`.

## Rationale
- Symbols are unique — no risk of collision with other tokens (including third-party packages)
- A typo in a string token (`'BOOK_REPO'` vs `'BOOK_REPO'`) fails at runtime
- A typo in a Symbol import fails at compile time
- `@Inject()` accepts Symbol values identically to strings

## Consequences
- All DI tokens must be imported (not inlined as strings)
- Module boundaries remain explicit
- Test mocks must use the Symbol import rather than hardcoded strings
