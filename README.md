# Stark Industries HQ - Agentic Email Assistants

A Vercel template for spinning up **named AI assistants that each have their own email address**. They coordinate over email with real people, read their own inbox, and execute end-to-end - Friday plans a dinner with three friends and books the restaurant; Pepper sources quotes from vendors and confirms the booking; Happy triages your inbound mail and only escalates what's worth your attention.

Powered by [AgentMail](https://agentmail.to), the [AI SDK](https://ai-sdk.dev), and [Exa](https://exa.ai). Provider-agnostic - works with Anthropic or OpenAI, your pick.

## TL;DR

```bash
pnpm install
cp .env.example .env.local           # then fill in the keys
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Click an example scenario. Watch the assistant call tools, send real email, and stream replies back as participants respond - all visible in the inbox panel in real time.

The template ships with three Tony-Stark-flavored assistants:

| Assistant  | Specialty                      | Direction | Tool surface |
|------------|--------------------------------|-----------|--------------|
| **Friday** | Multi-party scheduling & coordination | Outbound  | send / reply / read / search / escalate |
| **Pepper** | Vendors & operations           | Outbound  | send / reply / read / search / escalate |
| **Happy**  | Inbound triage & security      | Inbound   | + block / allow / list filters |

## What this template demonstrates

- **Agent identity over email.** Each assistant has a real, addressable inbox. People can CC them, reply to them, and treat them as participants - not as a chatbot widget.
- **Real-time inbox UI.** Threads, messages, and live updates streamed from AgentMail's WebSocket and rendered Gmail-style.
- **Streaming agent loop with tool calls.** The chat panel renders text and tool calls (`reading inbox…`, `sending email…`) as the assistant works through a multi-step plan.
- **Idempotent provisioning.** Restarting the dev server doesn't create duplicate inboxes - each assistant's `id` is passed as AgentMail's `clientId`.
- **Role-gated tools.** Friday and Pepper share the outbound toolset; Happy additionally gets `block_sender`, `allow_sender`, `list_filters` as the gatekeeper.
- **Modal thread viewer** with quoted-reply collapse (anything after `On … wrote:` is hidden behind a `···` pill).
- **No database.** Assistants live in `lib/assistants-seed.ts` as code. AgentMail is the persistence layer for everything email-shaped.

## How it works

```
          ┌────────────────────────────────────────────────────────────┐
          │                       Browser (Vercel)                     │
          │                                                            │
          │  ┌─────────┐  ┌─────────┐  ┌─────────┐                     │
          │  │ Friday  │  │ Pepper  │  │  Happy  │  ← all 3 mounted,   │
          │  │  panel  │  │  panel  │  │  panel  │    CSS toggles      │
          │  └─────────┘  └─────────┘  └─────────┘    which is shown   │
          │       │  ▲          │ ▲          │ ▲                       │
          │       │  │ EventSource(SSE) per inbox (auto-reconnect)     │
          │       │  │  + useChat (Vercel AI SDK)                      │
          └───────┼──┼──────────┼─┼──────────┼─┼──────────────────────┘
                  ▼  │          ▼ │          ▼ │
          ┌────────────────────────────────────────────────────────────┐
          │           Next.js route handlers (Vercel functions)        │
          │                                                            │
          │  /api/chat       ←  streamText + tools, UI Message Stream  │
          │  /api/threads    ←  client.inboxes.threads.list            │
          │  /api/thread/X   ←  client.threads.get                     │
          │  /api/events     ←  SSE relay around                       │
          │                     client.websockets.connect              │
          └────────────────────────────────────────────────────────────┘
                                       │
                                       ▼  AgentMail WS + REST
          ┌────────────────────────────────────────────────────────────┐
          │                       AgentMail                            │
          │   inboxes, threads, messages, lists, real-time events      │
          └────────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Node.js 22.x** (or whatever your Next 16 deployment target requires).
- **pnpm** (the template uses `pnpm` lockfile, but `npm` / `yarn` / `bun` work fine - just regenerate the lock).
- **An AgentMail account** with at least one **verified domain** ([dashboard](https://agentmail.to/dashboard)). Without a verified domain, assistants provision under the shared `agentmail.to` subdomain, where common usernames like `friday` are already globally claimed (the template's suffix-retry logic handles that, but you'll get `friday-3oac@agentmail.to` instead of `friday@yourdomain.com`).
- **An AI provider API key** - either Anthropic ([console.anthropic.com](https://console.anthropic.com)) or OpenAI ([platform.openai.com](https://platform.openai.com)). Pick whichever you already have; toggle via `AI_PROVIDER` env.
- **An Exa API key** ([dashboard.exa.ai](https://dashboard.exa.ai)).

## Quick start

```bash
git clone https://github.com/agentmail-to/agentmail-template-starkhq
cd agentmail-template-starkhq
pnpm install
cp .env.example .env.local
# fill in AGENTMAIL_API_KEY, AGENTMAIL_DOMAIN, your AI provider key
# (ANTHROPIC_API_KEY or OPENAI_API_KEY), EXA_API_KEY, and PRINCIPAL_EMAIL
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

[Deploy](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fagentmail-to%2Fagentmail-template-starkhq&project-name=agentmail-template-starkhq&repository-name=agentmail-template-starkhq&env=AGENTMAIL_API_KEY,AGENTMAIL_DOMAIN,ANTHROPIC_API_KEY,OPENAI_API_KEY,AI_PROVIDER,EXA_API_KEY,PRINCIPAL_EMAIL&envDescription=AgentMail%20gives%20each%20assistant%20an%20inbox.%20Pick%20Anthropic%20or%20OpenAI%20to%20power%20the%20agent%20loop.%20Exa%20enables%20web%20search.&envLink=https%3A%2F%2Fgithub.com%2Fagentmail-to%2Fagentmail-template-starkhq%23environment-variables)

No database to provision. Just paste the five environment variables when prompted.

## Environment variables

| Variable                       | Required | What it's for                                                           |
|--------------------------------|----------|-------------------------------------------------------------------------|
| `AGENTMAIL_API_KEY`            | yes      | Sending/receiving email, opening the WS, managing lists                 |
| `AGENTMAIL_DOMAIN`             | recommended | A domain you've verified in your AgentMail dashboard                 |
| `AI_PROVIDER`                  | optional | `anthropic` (default) or `openai`                                       |
| `ANTHROPIC_API_KEY`            | one of   | Required when `AI_PROVIDER=anthropic` (the default)                     |
| `OPENAI_API_KEY`               | one of   | Required when `AI_PROVIDER=openai`                                      |
| `AI_MODEL_ID`                  | optional | Override the model id. Defaults: `claude-sonnet-4-6` / `gpt-4o`         |
| `EXA_API_KEY`                  | yes      | Web search tool for venue / vendor research                             |
| `PRINCIPAL_EMAIL`              | yes      | Your email; assistants use it for `forward_to_principal` escalations    |
| `AGENTMAIL_USERNAME_<ID>`      | optional | Override an assistant's local-part (e.g. `AGENTMAIL_USERNAME_FRIDAY=tony-friday`) |
| `NEXT_PUBLIC_APP_URL`          | optional | Informational; your deployed URL                                        |

Missing keys surface as **clear errors in the UI** (`Missing required env var: …`) rather than silently no-op'ing. There is no "demo mode" - the template assumes you've configured what it needs.

## Stack & tools

| Layer            | What                                                                                  |
|------------------|---------------------------------------------------------------------------------------|
| Framework        | [Next.js 16](https://nextjs.org) (App Router, Turbopack)                              |
| Language         | TypeScript 5                                                                          |
| UI               | React 19 + [Tailwind CSS v4](https://tailwindcss.com)                                 |
| Markdown         | [react-markdown](https://github.com/remarkjs/react-markdown) + remark-gfm (for tables)|
| Email primitive  | [AgentMail SDK](https://docs.agentmail.to) (`agentmail` 0.5.x)                        |
| AI primitive     | [Vercel AI SDK v6](https://ai-sdk.dev) + `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/react` |
| Model            | Provider-agnostic. Default: Anthropic Claude (`claude-sonnet-4-6`). Set `AI_PROVIDER=openai` for GPT (`gpt-4o`). See `lib/model.ts`. |
| Web search       | [Exa](https://exa.ai) via `exa-js`                                                    |
| Schemas          | [Zod 4](https://zod.dev) for tool input validation                                    |
| Persistence      | None. Inbox state lives in AgentMail; assistants live in code.                        |

## WebSocket best practices (and what they look like here)

Realtime on Vercel serverless has two big constraints:

1. **You can't host a long-lived WebSocket server in a Next.js route handler** - serverless functions terminate per request.
2. **You can't safely embed your long-lived AgentMail API key in the browser** - it has full org access.

The standard answer is a **server-side WS → browser-side SSE relay**, with the realtime service (AgentMail) holding the durable connection. That's what this template does:

```
AgentMail WS  ◄── server-side ──►  SSE stream  ◄── EventSource (auto-reconnect)
(durable)         Next.js route                    in browser
                  (one per assistant)
```

### Best practices implemented

| Practice | Where | What we do |
|---|---|---|
| **API key never reaches the browser** | `app/api/events/route.ts` | The browser opens an `EventSource` to `/api/events?assistantId=…`. The server opens the AgentMail WS using `AGENTMAIL_API_KEY` and pipes events down. |
| **Connection scoped to one assistant** | `lib/assistants.ts` → `ensureProvisioned` | Each SSE call resolves the assistant, gets its `inboxId`, and calls `socket.sendSubscribe({ inboxIds: [inboxId], eventTypes: [...] })` so only relevant events flow. |
| **Heartbeat to defeat proxy timeouts** | `app/api/events/route.ts` | A `: keepalive\n\n` comment frame is sent every 15s. Vercel and most edge proxies will close idle TCP connections; the heartbeat keeps it alive. |
| **Clean shutdown on disconnect** | `request.signal.addEventListener("abort", …)` | When the browser closes the tab or navigates away, `request.signal` aborts. We close the AgentMail WS and the SSE controller to avoid orphan sockets. |
| **Auto-reconnect** | Browser native (EventSource spec) | `EventSource` reconnects automatically when the server closes the stream. The Vercel function timeout (typically 5-15 min on Pro / Fluid) just causes a brief blip; the browser reopens transparently. |
| **No state lost across reconnects** | `client.inboxes.threads.list` on first mount | The initial state comes from a REST call to `/api/threads` so the inbox is fully populated before the live stream starts. Reconnects don't replay history - they don't need to. |
| **All assistant streams kept alive** | `app/page.tsx` | All three Inbox components are mounted simultaneously (`CSS hidden` for the inactive ones). Streams keep flowing in the background - when you switch tabs, the new view is already live. |
| **Heads-up status on the UI** | `components/inbox.tsx` | A small status dot shows `Live` / `Reconnecting` / `Connecting` / `Disconnected` so the user always knows whether they're seeing fresh state. |

### What the WS protocol looks like

The AgentMail WS speaks JSON. After connect, the server sends:

```json
{ "type": "subscribe",
  "inbox_ids": ["friday-3oac@agentmail.to"],
  "event_types": ["message.received", "message.sent", "message.delivered"] }
```

Each event arrives as:

```json
{ "type": "event",
  "eventType": "message.received",
  "eventId": "...",
  "message": { ... },
  "thread":  { ... } }
```

We forward each event as a single SSE frame (`data: <json>\n\n`) to the browser, which deserializes and upserts the thread into the inbox list.

### Why not "real" WebSockets browser-to-server?

Two reasons. **(1)** Vercel route handlers can't accept WS upgrades - they're request/response only. **(2)** The user-facing UX is identical: SSE gives you server-push, EventSource auto-reconnects, no manual handling needed. The transport difference is invisible. If you ever need full duplex from the browser (rare for an inbox UI), you'd run the WS layer outside Vercel (Cloudflare Workers, Fly, Railway, etc.).

## License

MIT - go build cool things.
