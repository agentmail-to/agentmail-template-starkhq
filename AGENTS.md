<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Friday template — agent guidance

This is a Vercel template that scaffolds named AI assistants ("Friday", "Pepper", "Happy", and any the user adds), each backed by their own AgentMail inbox. Assistants act as email participants: principals address them in chat or CC them on threads, and they reach out to other parties via email.

## Versions to verify before writing code

These were post-cutoff at scaffold time. Read the local docs/types instead of relying on training data:

- `next` 16.x — `node_modules/next/dist/docs/01-app/`
- `ai` 6.x — `node_modules/ai/docs/` (note: `parameters` → `inputSchema` on tool defs, `maxSteps` → `stopWhen`)
- `@ai-sdk/anthropic` 3.x
- `agentmail` 0.5.x — `node_modules/agentmail/dist/llms.txt` and `reference.md`
- `zod` 4.x

## Architecture

- `app/page.tsx` — homepage: assistant picker, scenario presets, chat composer.
- `app/api/chat/route.ts` — user-initiated turn. Streams a Claude response with the assistant's tools available (send email, web search, etc.).
- `app/api/webhook/agentmail/route.ts` — inbound mail webhook. Verifies signature, identifies the assistant by inbox, runs the agent loop on the new thread state, sends any reply.
- `lib/agentmail.ts` — SDK client + domain helpers.
- `lib/assistants.ts` — KV-backed registry (with in-memory fallback for local dev). Seeded from `lib/assistants-seed.ts`.
- `lib/agent.ts` — the planner: a `runAgent({ assistant, thread, latestMessage })` function shared by chat and webhook.
- `lib/tools.ts` — AI SDK tool definitions: `send_email`, `reply_to_thread`, `exa_search`, `provision_assistant`.

## Invariants

- The thread is the agent's memory. Don't add a separate per-thread DB; if you need state, use AgentMail labels on the thread.
- Assistants are addressed by their email address, not by inbox ID, when sending. Use `inboxes.messages.send(address, body)`.
- Demo mode: when `AGENTMAIL_API_KEY` is missing, tools should log "[demo]" and not actually send. This keeps `pnpm dev` working without secrets.
