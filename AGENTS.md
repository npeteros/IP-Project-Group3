# AGENTS.md

Journaling app: Next.js 16 (App Router) + React 19, Prisma 7 on Postgres, better-auth, TanStack
Query, zod 4, and Mastra for AI.

## Commands

Use the `package.json` scripts, never the underlying CLIs directly.

| Task       | Command                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| Dev server | `npm run dev`                                                           |
| Typecheck  | `npm run typecheck` (runs `next typegen` first, so route types resolve) |
| Lint       | `npm run lint` (oxlint), `npm run lint:fix`                             |
| Tests      | `npm run test:run` (Vitest, single run)                                 |
| Build      | `npm run build`                                                         |

Prisma always needs the config flag: `npx prisma <cmd> --config prisma7.config.ts`. Run
`npx prisma generate --config prisma7.config.ts` after any `schema.prisma` change.

Before saying work is done, run typecheck, lint and tests.

## Layout

```text
app/api/v1/<domain>/   Route handlers: thin, parse -> call service -> respond
src/server/<domain>/   Server-only: <domain>.service.ts, schemas.ts
src/server/api/        withAuth, readJsonBody, AppError subclasses, OpenAPI document
src/lib/api/<domain>/  Client procedures (defineQuery / defineMutation), exposed as api.<domain>
src/lib/               Shared, client-safe helpers (timezone, constants, auth client)
src/generated/prisma/  Generated Prisma client: never edit
src/__tests__/         All tests
src/mastra/            Mastra agents, tools and workflows (see below)
```

Imports use the `@/` alias from the repo root, e.g. `@/src/server/entry/schemas`.

## API conventions

- **Schemas live in `src/server/<domain>/schemas.ts` and are the single source of truth.** Routes,
  client procedures, the OpenAPI spec and forms all import from there. Keep that file free of
  server-only imports (Prisma, `next/headers`, `auth`). Never add a second copy of a schema next to
  a route or service.
- Export both `z.input` types (`EntryCreateInput`, for clients) and `z.infer` types
  (`EntryCreateOutput`, for the service). Services take the parsed `Output` type and don't
  re-validate.
- Route handlers wrap in `withAuth`, parse with the schema, read JSON bodies with `readJsonBody`,
  and contain no business logic. `.parse()` is fine: a `ZodError` becomes a 400 `VALIDATION_ERROR`
  automatically.
- Path params are parsed as an object: `const { id } = EntryIdSchema.parse(await ctx.params)`.
- Throw `AppError` subclasses from `src/server/api/errors.ts` (`NotFoundError`, `ConflictError`,
  etc.) for expected failures. Anything else becomes a 500.
- Services are classes scoped to one user (`new EntryService(user.id)`), and every query filters on
  `userId`. They return the response shape (dates as ISO strings), never raw Prisma rows.
- Responses: `201` with the body for create, `200` for read and update, `204` with no body for
  delete.
- Add new endpoints to the OpenAPI paths in `src/server/api/openapi.ts`.

## Data rules

- **Dates use Manila time.** Every calendar-date decision (an entry's `entryDate`, date filters,
  "today") goes through `src/lib/timezone.ts` (`APP_TIME_ZONE = 'Asia/Manila'`). Never use
  local-time getters, `toDateString()` or a client-supplied time zone. Store instants as
  `timestamptz` and calendar days as `DATE`.
- **Entries are soft-deleted** (`deletedAt`). Every entry read and write filters `deletedAt: null`,
  and a deleted entry or another user's entry is a 404.
- **Tags are hard-deleted.** `Tag` has no `deletedAt`. Deleting a tag cascades to its `EntryTag`
  links, and re-using the name creates a new tag. Tags are unique per user on `normalizedName` (see
  `normalizeTagName`).
- Multi-step writes (an entry and its tags) run in one `$transaction`.
- **Migrations:** you may edit `schema.prisma` and write migration SQL, but don't run
  `prisma migrate` yourself. A developer applies migrations, since they change the shared database.

## Tests

- Vitest. Test files go in `src/__tests__/*.test.ts`. The default environment is `jsdom`, so server
  and route tests start with `// @vitest-environment node`.
- Service tests mock the Prisma client. Route tests mock `getSession` and the service. Use real
  UUIDs for ids, since the id schemas reject anything else.

## Git workflow

- Branches are named with the ticket ID only, `S<sprint>-<ticket>` (e.g. `S2-10`), enforced by a
  pre-push hook. `main` and `develop` are protected, and PRs target `develop`.
- Commit messages are `<type>: <subject>` with no scope, a lowercase subject and no trailing period,
  enforced by a commit-msg hook. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `chore`, `revert`.
- PR titles are `[<ticket ID>] <ticket title>`, e.g.
  `[S2-10] Entry Mutation Service Methods and API Routes`.
- The pre-commit hook runs `oxlint --fix` and `prettier --write` on staged files. Don't bypass
  hooks.

## Mastra

**Load the `mastra` skill before any Mastra work.** Never rely on cached knowledge: APIs change
between versions.

- Register all agents, tools, workflows and scorers in `src/mastra/index.ts`.
- Follow `src/mastra/AGENTS.md` for all work under `src/mastra/`.
- Every agent lists `aiUsageProcessor` in both `inputProcessors` and `outputProcessors`, so the
  per-user rate limit and `AiUsageLog` rows apply however it's called. User-triggered calls pass
  `requestContext: createUserRequestContext(userId)`, including agent calls inside workflow steps.
- Use the `dev` and `build` scripts from `package.json` instead of running `mastra dev` or
  `mastra build` directly.
- Resources: [Mastra Documentation](https://mastra.ai/llms.txt),
  [Skills Discovery](https://mastra.ai/.well-known/skills/index.json)
