# AGENTS.md: `src/mastra`

Instructions for AI coding agents working in the Mastra AI layer. For humans: `README.md` in this
directory.

## Before writing code

1. Load the `mastra` skill.
2. Look up every Mastra API you use in `node_modules/@mastra/core/dist/docs/references/`, then in
   the `.d.ts` files under `node_modules/@mastra/*/dist`. Your training data for Mastra is out of
   date. Installed: `@mastra/core` 1.80, `@mastra/evals` 1.10.
3. Read the closest existing file of the same kind and copy its pattern. `agents/weather-agent.ts`,
   `tools/weather-tool.ts`, `workflows/weather-workflow.ts` and `evals/weather-agent.eval.ts` are
   the references.
4. Check for an existing service or helper before adding one. AI usage and rate limiting already
   live in `guardrails/` and `src/server/ai-usage/`; don't duplicate them.
5. For anything beyond a small change, propose a plan before writing code.

## Invariants (do not break)

- **Every agent lists `aiUsageProcessor`** in both `inputProcessors` and `outputProcessors`.
  Without it, calls bypass the rate limit and write no `AiUsageLog` row. Mastra has no global hook,
  so this is the only enforcement.
- **Per-call processor arrays replace the agent's.** If a `generate()`/`stream()` call passes
  `inputProcessors` or `outputProcessors`, it must include `aiUsageProcessor`.
- **User-triggered calls pass `requestContext: createUserRequestContext(user.id)`**
  (`guardrails/requestContext.ts`). The ID must come from the better-auth session (the `user` that
  `withAuth` hands the route), never from client input.
- **Workflow steps forward `requestContext`** into any `agent.generate()`/`agent.stream()` they
  call. It is not propagated automatically. The exception is `createStep(agent)`, which forwards it.
- **Register** every agent, tool, workflow and scorer in `index.ts`.
- **No route-level guard.** Enforcement belongs in the processor, not in route handlers.
- **`AiUsageService.finalize()` must never throw.** `reserve()` must run before the model call.
- **The user ID key is `USER_ID_KEY`.** Use the constant; don't write `'userId'` as a literal.

## Over-limit calls are tripwires, not exceptions

`AiUsageProcessor` calls `abort()` with `processorId: 'ai-usage'` and
`metadata: { code: 'TOO_MANY_REQUESTS' }`. Nothing throws. Handle it at each caller:

| Call site                      | Detect                                                      | Required handling                                                                                             |
| ------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `agent.generate()` in services | `result.tripwire`                                           | `assertNotRateLimited(result)` right after the call. It throws `TooManyRequestsError`, a 429 under `withAuth` |
| `agent.stream()`               | `response.tripwire` (set only after the stream is consumed) | Check after reading the stream; throw in workflow steps                                                       |

Use `isAiRateLimited(tripwire)`. Don't match on the reason string.

There is no streaming chat route yet. If you add one with `handleChatStream` from `@mastra/ai-sdk`,
an over-limit call arrives as a `data-tripwire` chunk inside a 200 stream: read ahead to the first
content chunk and answer 429 instead. Pass `abortSignal: request.signal` so a client disconnect
stops the run.

## Mastra behaviour this layer relies on

Checked by hand on 1.79 and against the 1.80 types and runtime. Recheck if the version changes.

- **Processor `state`.** One object per request, keyed by `processor.id`, shared across all hooks
  _including_ `processInput`. The docs leave that hook out. Use a unique `id`.
- **`processOutputResult`** runs on finish, on provider error (`finishReason: 'error'`) and on
  `abortSignal` abort (`'aborted'`). It does not run after an input-phase tripwire, or after a
  tripwire raised in `processOutputStream`.
- **`processOutputStep`** runs after every model step in both `generate()` and `stream()`.
- **The `agent` arg** is only populated in `processInput`. **`model`** is only passed to
  `processInputStep`, `processLLMRequest` and `processLLMResponse`.
- **No `requestContext`** means an empty `RequestContext`, not `undefined`. That gives
  `userId: null`, a system call with no limit.
- **Instance-level processors:** `new Mastra({ processors })` is a registry only. It does not attach
  to agents.
- **`TokenCostControl`** (built in) limits estimated cost from observability metrics, which are
  written asynchronously. It doesn't replace the call-count limit or the `AiUsageLog` rows.

## File map

```text
index.ts                          Mastra instance (storage, logger, observability, registrations)
observability.ts                  logger (Pino), tracing, ContentRedactionProcessor (AI_LOG_CONTENT)
guardrails/AiUsageProcessor.ts    processor + isAiRateLimited + assertNotRateLimited
guardrails/requestContext.ts      USER_ID_KEY, createUserRequestContext
scorers/index.ts                  LLM-judge scorers
evals/*.eval.ts                   eval suites (npm run eval only)
src/server/ai-usage/ai-usage.service.ts   reserve()/finalize(): DB rate limit + AiUsageLog rows
src/server/api/errors.ts          TooManyRequestsError (429)
```

## Recipes (minimum required shape)

- **Agent:**
  - Create `agents/<name>-agent.ts` with `id` in kebab-case and `model` in `'provider/model'` form,
    verified with `node .agents/skills/mastra/scripts/provider-registry.mjs`.
  - Add `inputProcessors: [aiUsageProcessor]` and `outputProcessors: [aiUsageProcessor]`.
  - Register it in `index.ts`.
- **Calling an agent from the API:** keep the route thin. The domain service calls the agent with
  `createUserRequestContext(userId)` and then `assertNotRateLimited(result)`.
- **Tool:**
  - Create `tools/<name>-tool.ts` with
    `createTool({ id, description, inputSchema, outputSchema, execute: async (input, { requestContext }) => ... })`.
  - Scope data access to `requestContext.get(USER_ID_KEY)`, never to IDs supplied by the model.
    Reuse the user-scoped services in `src/server/<domain>/` (e.g. `new EntryService(userId)`).
- **Workflow:**
  - Build it with `createStep`/`createWorkflow`, chain the steps with `.then()`, and call
    `.commit()`.
  - Forward `requestContext` to agent calls and throw on `tripwire`.
  - Callers use `createRun()` then `run.start({ inputData, requestContext })`.
- **Scorer:**
  - Use a prebuilt from `@mastra/evals/scorers/prebuilt`, or `createScorer` from
    `@mastra/core/evals`.
  - Export it from `scorers/index.ts` and register it in `index.ts`.
- **Eval:**
  - Create `evals/<name>.eval.ts` using
    `runEvals({ target: mastra.getAgentById(...), data, scorers })`.
  - Assert thresholds, not exact scores.

## Testing and verification

- **Unit tests** go in `src/__tests__/` and start with `// @vitest-environment node`.
  - Mock `@/src/lib/prisma` and `@/src/mastra/observability` (see
    `src/__tests__/ai-usage-processor.test.ts`).
  - Inject fakes through constructors.
  - Never call a real model in unit tests.
- **Before reporting work done:** run `npm run typecheck`, `npm run lint` and `npm run test:run`.
- **`npm run eval`** calls real models (it costs tokens and needs `OPENAI_API_KEY` and
  `DATABASE_URL`). Run it only when asked, or when you changed agent behaviour and the user agrees.
- **Manual checks:**
  - Studio is at `http://localhost:4111` after `npm run dev`.
  - For rate-limit checks, set `AI_RATE_LIMIT_MAX_CALLS=1` and confirm the second call is rejected
    (429 on routes).
- **Report honestly.** If you couldn't run a check (no DB, no API key), say so.
