This is an open-source MCP server for the Lexware Office API, built with the Skybridge
framework. When planning or updating the codebase, use the `skybridge` skill.

Key conventions:
- Keep all Lexware logic (`src/lexware`, `src/config.ts`, `src/tools`) independent of Skybridge.
- Tools are gated by capability tiers in `src/config.ts` and registered conditionally in
  `src/tools/index.ts` (read = always; drafts/finalize = env-gated).
- Finalizing is irreversible: any legally-binding write must be a separate, confirmation-gated
  finalize-tier tool — never a flag on a draft tool.
- `npm run build` typechecks; `npm test` runs vitest. Never log secrets or PII.

## Mandatory Ponytail-full development method (Owner decision 2026-10-11)

For future changes to code, scripts, tests, builds, dependencies, configuration, or refactoring, use [Ponytail full](https://github.com/DietrichGebert/ponytail) as the mandatory simplicity discipline. Inspect the real end-to-end path and affected callers, fixtures, tests and configs first; prefer the **smallest complete and readable** root-cause change using existing project patterns, the standard library/native capabilities, and installed dependencies. Avoid speculative wrappers, services and abstractions. Keep all affected code paths and required checks current.

Ponytail never overrides this repository's specialist instructions or reduces explicit features, security, data integrity, authentication/authorization, validation, error handling, recovery, provider behavior, integration/CI evidence, human approvals, or release gates. No automatic external plugin installation and no unrelated mass refactoring are authorized by this method.
