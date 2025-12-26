# Repository Guidelines

## Project Structure & Module Organization

- `docs/` is the current source of truth for the MVP design and implementation plan (start with `docs/BLUEPRINT.md`).
- Expected monorepo layout (per the docs): `apps/web/` (Next.js dashboard + marketing pages), `apps/api/` (Cloudflare Worker API), and `packages/*` for shared code and the D1 schema/migrations.
- Key reference docs: `docs/ARCHITECTURE.md`, `docs/BACKEND.md`, `docs/FRONTEND.md`, `docs/DATABASE.md`, `docs/DEPLOYMENT.md`.

## Build, Test, and Development Commands

- Prereqs: Node `>=20`, pnpm `>=8`, Wrangler `>=3`.
- `pnpm install`: install workspace dependencies.
- `pnpm dev`: run all apps via Turborepo.
- `pnpm --filter @scraper-api/web dev`: run the dashboard (typically `http://localhost:3000`).
- `pnpm --filter @scraper-api/api dev`: run the Worker locally (`wrangler dev`; web expects `NEXT_PUBLIC_API_URL=http://localhost:8787`).
- `pnpm lint` / `pnpm typecheck` / `pnpm test`: run workspace checks; `pnpm --filter @scraper-api/api test:coverage` runs API coverage.

## Coding Style & Naming Conventions

- TypeScript-first; keep boundary validation explicit (Zod) and avoid `any`.
- Indentation: 2 spaces; favor small modules with clear inputs/outputs.
- Naming: React components `PascalCase`; non-component modules `kebab-case` (e.g., `rate-limit.ts`, `request-id.ts`); Next.js routes follow `app/**/page.tsx`.

## Testing Guidelines

- API tests use Vitest and live under `apps/api/tests/` (e.g., `apps/api/tests/unit/ssrf.test.ts`).
- Add tests for security-critical changes (SSRF, auth, rate limiting) and for any bug fix that could regress.

## Commit & Pull Request Guidelines

- Prefer Conventional Commits: `feat(api): ...`, `fix(web): ...`, `docs: ...`.
- PRs include: a clear description, linked issue (if any), config/migration notes, and screenshots for UI changes.

## Security & Configuration

- Never commit secrets. Keep local config in `apps/web/.env.local` and `apps/api/.dev.vars`; use `wrangler secret put` for deployed secrets.

## Agent-Specific Notes

- If using Codex, read the relevant `docs/*.md` before editing, keep patches minimal, and run the closest applicable checks (e.g., `pnpm --filter @scraper-api/api test`).
