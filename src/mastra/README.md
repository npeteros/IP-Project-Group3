# `src/mastra`: the AI layer

How the AI layer is set up, and how to add agents, tools, workflows, scorers and evals.

## Before you start

- **Load the `mastra` skill** (in Claude Code / agent tools) before any Mastra work.
- **Check the API against the installed version.** Mastra changes often, so look in
  `node_modules/@mastra/core/dist/docs/references/` rather than relying on memory or old examples.
- **Register everything in `index.ts`.** Agents, tools, workflows and scorers are only available
  through the `mastra` instance once registered there.
- **Run the project scripts.** Use `npm run dev` / `npm run build`, not `mastra dev` /
  `mastra build`. Studio at `http://localhost:4111` lets you chat with agents, run workflows and
  inspect traces.

## Layout

```text
src/mastra/
├── index.ts          # The Mastra instance: register everything here
├── observability.ts  # logger + tracing config
├── agents/           # one file per agent: <name>-agent.ts
├── tools/            # one file per tool:  <name>-tool.ts
├── workflows/        # one file per workflow: <name>-workflow.ts
├── scorers/          # scorers, exported from scorers/index.ts
├── evals/            # eval suites: <name>.eval.ts (run with npm run eval)
└── guardrails/       # AiUsageProcessor (rate limit + usage logging), requestContext helpers

src/server/ai-usage/ai-usage.service.ts   # AiUsageLog reads/writes behind the processor
```

## Environment variables

Add these to your `.env` (`.env*` files are git-ignored):

| Variable                       | Default | Purpose                                                                   |
| ------------------------------ | ------- | ------------------------------------------------------------------------- |
| `OPENAI_API_KEY`               |         | Used by the agents and `npm run eval`                                     |
| `AI_LOG_CONTENT`               | `false` | `true` keeps prompts and completions in traces. Keep it off in production |
| `AI_RATE_LIMIT_WINDOW_SECONDS` | `3600`  | Length of the rolling rate-limit window                                   |
| `AI_RATE_LIMIT_MAX_CALLS`      | `50`    | Agent calls each user may make per window                                 |
| `LOG_LEVEL`                    | `info`  | `debug`, `info`, `warn`, `error` or `silent`                              |

## How usage limits and logging work

Every agent lists `aiUsageProcessor` in its `inputProcessors` and `outputProcessors`, so every call
is covered however the agent is invoked (API route, workflow step, eval, Studio):

1. **Before the model is called**, the processor reads the user ID from the call's
   `RequestContext` and reserves an `ai_usage_log` row. Under a per-user Postgres advisory lock it
   counts the user's calls in the window; if they're at the limit, the call is stopped with a
   tripwire instead of reaching the model.
2. **During the run**, it records the model actually used and keeps a running token total.
3. **When the run ends** (finished, errored or aborted), it fills in the row with tokens, latency
   and success. A failed write is logged and never fails the AI call.

Calls with no user ID (system work, evals) are logged with `userId: null` and not rate-limited.

## Observability

Traces go to Mastra storage (DuckDB locally) and, if `MASTRA_PLATFORM_ACCESS_TOKEN` is set, to the
Mastra platform. Before export, `SensitiveDataFilter` redacts secrets, and
`ContentRedactionProcessor` strips prompts and completions unless `AI_LOG_CONTENT=true`. Model,
token usage, timing and the caller's user ID are always kept.

## Agents

Create `agents/<name>-agent.ts`:

```ts
import { Agent } from '@mastra/core/agent'
import { aiUsageProcessor } from '../guardrails/AiUsageProcessor'

export const journalAgent = new Agent({
  id: 'journal-agent', // kebab-case; this is what appears in traces and AiUsageLog.agent
  name: 'Journal Agent',
  instructions: `You help users reflect on their journal entries. ...`,
  model: 'openai/gpt-6.1-sol', // "provider/model" router format
  // Required on every agent: rate limit + AiUsageLog row for every call.
  inputProcessors: [aiUsageProcessor],
  outputProcessors: [aiUsageProcessor],
})
```

Then register it under `agents` in `index.ts`.

- **Always include `aiUsageProcessor` in both arrays.** Processors passed on a single `generate()`
  / `stream()` call _replace_ the agent's arrays for that call, so include it there too.
- **Check model names before using one.** Run
  `node .agents/skills/mastra/scripts/provider-registry.mjs --provider openai`.
- **Keep instructions and the model server-side.** Never take `maxSteps`, `modelSettings`,
  instructions or processors from the client.

### Calling an agent

Call agents from a domain service, passing the signed-in user's ID through the `RequestContext`.
That's how the call is attributed, traced and rate-limited.

```ts
import { mastra } from '@/src/mastra'
import { assertNotRateLimited } from '@/src/mastra/guardrails/AiUsageProcessor'
import { createUserRequestContext } from '@/src/mastra/guardrails/requestContext'

const result = await mastra.getAgentById('journal-agent').generate(prompt, {
  requestContext: createUserRequestContext(this.userId),
})
// Over-limit calls return a tripwire, not an error. This throws TooManyRequestsError,
// which withAuth turns into a 429.
assertNotRateLimited(result)
return result.text
```

## Tools

Create `tools/<name>-tool.ts` with `createTool` from `@mastra/core/tools`. The second argument to
`execute` carries the caller's `requestContext`.

- **Reuse existing services** from `src/server/<domain>/` instead of querying Prisma directly.
- **Scope data to the user** read from `requestContext.get(USER_ID_KEY)`. Never trust an ID the
  model passes for authorization.
- **Write clear descriptions.** `description` and `.describe()` text is what the model sees.

## Workflows

Build workflows with `createStep` / `createWorkflow`, chain steps with `.then()`, and call
`.commit()`. `workflows/weather-workflow.ts` is the reference.

- **Forward `requestContext` into every agent call inside a step**
  (`agent.stream(messages, { requestContext })`), otherwise the call is logged as a system call.
  Using the agent itself as a step (`createStep(agent)`) forwards it automatically.
- **Check `tripwire` after agent calls** and throw, so a rate-limited step fails instead of
  returning empty output.
- Start runs with `run.start({ inputData, requestContext: createUserRequestContext(userId) })`.

## Scorers and evals

- **Scorers** grade agent output. Add prebuilt ones from `@mastra/evals/scorers/prebuilt` (or
  custom ones from `createScorer` in `@mastra/core/evals`) to `scorers/index.ts` and register them
  in `index.ts`. Judge calls cost tokens but aren't agent calls, so they write no `AiUsageLog` rows.
- **Evals** (`evals/<name>.eval.ts`) run real agents against a small dataset and assert score
  thresholds. They **cost tokens**, so they run only with `npm run eval`, never in `npm test`. They
  need `OPENAI_API_KEY` and `DATABASE_URL`.

## Unit tests

Tests live in `src/__tests__/` and run with `npm run test:run`. Mock Prisma and observability so
they need no database or exporters, and inject fakes through constructors:

```ts
vi.mock('@/src/lib/prisma', () => ({ default: {} }))
vi.mock('@/src/mastra/observability', () => ({ logger: {} }))
```

## Checklist

| Adding a… | Checklist                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Agent     | `aiUsageProcessor` in both arrays · registered in `index.ts` · callers pass `createUserRequestContext` and handle the tripwire |
| Tool      | Clear `description` · user-scoped via `requestContext` · reuses existing services · added to an agent                          |
| Workflow  | `.commit()` · registered · forwards `requestContext` to agent calls · checks `tripwire`                                        |
| Scorer    | Exported from `scorers/index.ts` · registered in `index.ts`                                                                    |
| Eval      | `*.eval.ts` in `evals/` · small dataset · threshold assertions                                                                 |
