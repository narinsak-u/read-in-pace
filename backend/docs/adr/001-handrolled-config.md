# ADR 001: Hand-rolled ConfigService vs @nestjs/config

**Date:** 2026-06-18
**Status:** Accepted

## Context
The backend needs typed, validated configuration from environment variables.
Options: use `@nestjs/config` (the official NestJS package) or a custom provider.

## Decision
We use a hand-rolled `ConfigService` with Zod schema validation.

## Rationale
- Zero external dependency beyond Zod (which we already use)
- Full control over defaults, parsing, and typed config groups
- `@nestjs/config` adds complexity (partial registration, namespace support) we don't need
- The entire config layer is ~80 lines — not worth a framework dependency

## Consequences
- No automatic `.env` loading (we use `dotenv/config` import in `main.ts` instead)
- No hot-reload for config (acceptable — config changes require restart anyway)
- Future plugins that rely on `@nestjs/config`'s `ConfigService` token won't work directly
