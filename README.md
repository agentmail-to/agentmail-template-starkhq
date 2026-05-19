# Stark Industries HQ — Agentic Email Assistants

A Vercel template for spinning up **named AI assistants that each have their own email address**. They coordinate over email with real people, read their own inbox, and execute end-to-end — Friday plans a dinner with three friends and books the restaurant; Pepper sources quotes from vendors and confirms the booking; Happy triages your inbound mail and only escalates what's worth your attention.

Powered by [AgentMail](https://agentmail.to), the [AI SDK](https://ai-sdk.dev), [Anthropic Claude](https://anthropic.com), and [Exa](https://exa.ai).

## TL;DR

```bash
pnpm install
cp .env.example .env.local           # then fill in the keys
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Click an example scenario. Watch the assistant call tools, send real email, and stream replies back as participants respond — all visible in the inbox panel in real time.

The template ships with three Tony-Stark-flavored assistants:

| Assistant  | Specialty                      | Direction | Tool surface |
|------------|--------------------------------|-----------|--------------|
| **Friday** | Multi-party scheduling & coordination | Outbound  | send / reply / read / search / escalate |
| **Pepper** | Vendors & operations           | Outbound  | send / reply / read / search / escalate |
| **Happy**  | Inbound triage & security      | Inbound   | + block / allow / list filters |

## What this template demonstrates

- **Agent identity over email.** Each assistant has a real, addressable inbox. People can CC them, reply to them, and treat them as participants — not as a chatbot widget.
- **Real-time inbox UI.** Threads, messages, and live updates streamed from AgentMail's WebSocket and rendered Gmail-style.
- **Streaming agent loop with tool calls.** The chat panel renders text and tool calls (`reading inbox…`, `sending email…`) as the assistant works through a multi-step plan.
- **Idempotent provisioning.** Restarting the dev server doesn't create duplicate inboxes — each assistant's `id` is passed as AgentMail's `clientId`.
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
- **pnpm** (the template uses `pnpm` lockfile, but `npm` / `yarn` / `bun` work fine — just regenerate the lock).
- **An AgentMail account** with at least one **verified domain** ([dashboard](https://agentmail.to/dashboard)). Without a verified domain, assistants provision under the shared `agentmail.to` subdomain, where common usernames like `friday` are already globally claimed (the template's suffix-retry logic handles that, but you'll get `friday-3oac@agentmail.to` instead of `friday@yourdomain.com`).
- **An Anthropic API key** ([console.anthropic.com](https://console.anthropic.com)).
- **An Exa API key** ([dashboard.exa.ai](https://dashboard.exa.ai)).

## Quick start

```bash
git clone https://github.com/agentmail-to/agentmail-template-starkhq
cd agentmail-template-starkhq
pnpm install
cp .env.example .env.local
# fill in AGENTMAIL_API_KEY, AGENTMAIL_DOMAIN, ANTHROPIC_API_KEY,
# EXA_API_KEY, and PRINCIPAL_EMAIL
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

[Deploy](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fagentmail-to%2Fagentmail-template-starkhq&project-name=agentmail-template-starkhq&repository-name=agentmail-template-starkhq&env=AGENTMAIL_API_KEY,AGENTMAIL_DOMAIN,ANTHROPIC_API_KEY,EXA_API_KEY,PRINCIPAL_EMAIL&envDescription=AgentMail%20gives%20each%20assistant%20an%20inbox.%20Anthropic%20powers%20the%20agent%20loop.%20Exa%20enables%20web%20search.&envLink=https%3A%2F%2Fgithub.com%2Fagentmail-to%2Fagentmail-template-starkhq%23environment-variables)

No database to provision. Just paste the five environment variables when prompted.

## Environment variables

| Variable                       | Required | What it's for                                                           |
|--------------------------------|----------|-------------------------------------------------------------------------|
| `AGENTMAIL_API_KEY`            | yes      | Sending/receiving email, opening the WS, managing lists                 |
| `AGENTMAIL_DOMAIN`             | recommended | A domain you've verified in your AgentMail dashboard                 |
| `ANTHROPIC_API_KEY`            | yes      | Powers the agent loop (`claude-sonnet-4-6`)                             |
| `EXA_API_KEY`                  | yes      | Web search tool for venue / vendor research                             |
| `PRINCIPAL_EMAIL`              | yes      | Your email; assistants use it for `forward_to_principal` escalations    |
| `AGENTMAIL_USERNAME_<ID>`      | optional | Override an assistant's local-part (e.g. `AGENTMAIL_USERNAME_FRIDAY=tony-friday`) |
| `NEXT_PUBLIC_APP_URL`          | optional | Informational; your deployed URL                                        |

Missing keys surface as **clear errors in the UI** (`Missing required env var: …`) rather than silently no-op'ing. There is no "demo mode" — the template assumes you've configured what it needs.

## Stack & tools

| Layer            | What                                                                                  |
|------------------|---------------------------------------------------------------------------------------|
| Framework        | [Next.js 16](https://nextjs.org) (App Router, Turbopack)                              |
| Language         | TypeScript 5                                                                          |
| UI               | React 19 + [Tailwind CSS v4](https://tailwindcss.com)                                 |
| Markdown         | [react-markdown](https://github.com/remarkjs/react-markdown) + remark-gfm (for tables)|
| Email primitive  | [AgentMail SDK](https://docs.agentmail.to) (`agentmail` 0.5.x)                        |
| AI primitive     | [Vercel AI SDK v6](https://ai-sdk.dev) + `@ai-sdk/anthropic`, `@ai-sdk/react`         |
| Model            | Anthropic Claude (`claude-sonnet-4-6` by default; see `lib/agent.ts`)                 |
| Web search       | [Exa](https://exa.ai) via `exa-js`                                                    |
| Schemas          | [Zod 4](https://zod.dev) for tool input validation                                    |
| Persistence      | None. Inbox state lives in AgentMail; assistants live in code.                        |

## WebSocket best practices (and what they look like here)

Realtime on Vercel serverless has two big constraints:

1. **You can't host a long-lived WebSocket server in a Next.js route handler** — serverless functions terminate per request.
2. **You can't safely embed your long-lived AgentMail API key in the browser** — it has full org access.

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
| **No state lost across reconnects** | `client.inboxes.threads.list` on first mount | The initial state comes from a REST call to `/api/threads` so the inbox is fully populated before the live stream starts. Reconnects don't replay history — they don't need to. |
| **All assistant streams kept alive** | `app/page.tsx` | All three Inbox components are mounted simultaneously (`CSS hidden` for the inactive ones). Streams keep flowing in the background — when you switch tabs, the new view is already live. |
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

Two reasons. **(1)** Vercel route handlers can't accept WS upgrades — they're request/response only. **(2)** The user-facing UX is identical: SSE gives you server-push, EventSource auto-reconnects, no manual handling needed. The transport difference is invisible. If you ever need full duplex from the browser (rare for an inbox UI), you'd run the WS layer outside Vercel (Cloudflare Workers, Fly, Railway, etc.).

## Implementation deep-dive

### Assistants are config, not data

`lib/assistants-seed.ts` defines all assistants as TypeScript values:

```ts
{
  id: "friday",
  name: "Friday",
  username: "friday",
  specialty: "Scheduling & coordination",
  systemPrompt: `You are Friday, ...`
}
```

There is no database, no admin UI, no `+ New Assistant` form. To add a new role, edit the file and redeploy. To override an existing username at deploy time (e.g., to avoid collisions on a shared domain), set `AGENTMAIL_USERNAME_<ID>` in env — the seed value is used as the fallback.

### Idempotent inbox provisioning

When an assistant first needs to send or read mail, `lib/assistants.ts → ensureProvisioned` calls:

```ts
await client.inboxes.create({
  clientId: assistant.id,      // ← idempotency key
  username:  baseUsername,
  domain:    AGENTMAIL_DOMAIN,
  displayName: assistant.name,
});
```

`clientId` is AgentMail's idempotency primitive — subsequent calls with the same `clientId` return the existing inbox instead of creating a new one. So restarting the dev server doesn't proliferate `friday-abc1@…`, `friday-abc2@…`, `friday-abc3@…`. There's also a fallback path that catches `IsTakenError` (e.g., for legacy inboxes created before `clientId` was wired up) and uses `inboxes.list` to find an owned match, plus a random-suffix retry for usernames claimed by other orgs.

Resolved inbox info (`inboxId`, `email`, `username`) is cached in a process-local `Map`. Cold starts rebuild it lazily; the `clientId` idempotency ensures correctness without persistence.

### Per-assistant tool gating

`lib/tools.ts → buildTools` defines the full toolkit, then filters by `ctx.assistant.id`:

```ts
const PER_ASSISTANT_TOOLS = {
  friday: ["send_email", "reply_to_thread", "list_threads", "get_thread", "exa_search", "forward_to_principal"],
  pepper: ["send_email", "reply_to_thread", "list_threads", "get_thread", "exa_search", "forward_to_principal"],
  happy:  [...COMMON, "block_sender", "allow_sender", "list_filters"],
};
```

If you ask Friday to block a sender, she literally doesn't have the tool — the AI can't pretend to use what isn't there, so it naturally responds with "that's Happy's role." Strong role boundaries via capability scoping, not just prompt engineering.

### System prompts: shared principles + role-specific instructions

Each assistant's system prompt has a role-specific opener and a shared `SHARED_PRINCIPLES` block:

```
Core principle: you have an email address and tools — execute. If the next step is
something you have the means to do (send an email, reach out to a vendor, confirm a
booking, reply in a thread), DO IT yourself. Do NOT delegate back to the principal
with phrases like "you can call them" or "feel free to book directly." Your value
is that the principal doesn't have to.

If you genuinely cannot proceed and the principal needs to make a call, use the
forward_to_principal tool to email them a concise summary. Don't just punt the
question back into chat.
```

This is what stops Friday from finishing a coordination and then saying "you can call the restaurant yourself" — and it gives all three a clean escalation path via `forward_to_principal` when they really do need a human.

### Streaming chat with tool-call UI

The chat panel uses `useChat` from `@ai-sdk/react` and renders structured `parts`:

```tsx
{message.parts.map((part, i) => {
  if (isTextUIPart(part)) return <Markdown key={i}>{part.text}</Markdown>;
  if (isToolUIPart(part)) return <ToolCall key={i} name={getToolName(part)} state={part.state} />;
})}
```

Tool calls render as small pills: `[Reading inbox …]` while in-flight, `[Reading inbox ✓]` once the tool returns. The server uses `result.toUIMessageStreamResponse()` to emit the structured stream that drives this.

### Modal thread viewer + quoted-reply collapse

Clicking a row in the inbox opens the thread in a centered modal (`components/thread-modal.tsx`) — backdrop, `Esc` to close, body-scroll lock. The modal renders `<ThreadDetail>` which fetches `client.threads.get()` server-side via `/api/thread/[threadId]`.

Each message in the thread runs through a regex (`^On\b[\s\S]*?\bwrote:\s*$/m`) that detects the canonical "On … wrote:" preamble. Everything from that line onward is hidden behind a `···` pill so the visible content is only the new reply, not the quoted history.

### messageId normalization

LLMs sometimes strip angle brackets from RFC 5322 message ids (`<CAJ…@mail.gmail.com>`) when copying them between tool calls, because `<…>` look like markup. AgentMail's `reply()` endpoint matches on the canonical bracketed form. The `normalizeMessageId` helper in `lib/tools.ts` re-wraps any RFC-shaped id (contains `@`) that arrives without brackets — so the bug fails silently on the client side and recovers transparently on the server.

### Always-mounted assistant panels

`app/page.tsx` renders all three `<Inbox>` and all three `<ChatPanel>` instances simultaneously, with `className={selected.id === a.id ? "" : "hidden"}` on the wrapper. CSS `display: none` keeps inactive panels in the React tree, so:

- `useChat` state persists per assistant (switching tabs doesn't reset the conversation)
- `EventSource` connections stay open in the background (Pepper's inbox keeps updating even while you're looking at Friday)
- In-flight streams continue (clicking a different tab mid-response doesn't abort the request)

## Customization

### Add a new assistant

Edit `lib/assistants-seed.ts`:

```ts
{
  id: "jarvis",
  name: "JARVIS",
  username: "jarvis",
  specialty: "Research & long-form synthesis",
  systemPrompt: `You are JARVIS, an analyst who turns ambiguous research
                 questions into clear written briefs ...`,
}
```

Then add tool gating to `lib/tools.ts → PER_ASSISTANT_TOOLS`:

```ts
jarvis: ["send_email", "reply_to_thread", "list_threads", "get_thread", "exa_search", "forward_to_principal"],
```

Restart `pnpm dev`. JARVIS now has a tab in the UI, his own inbox at `jarvis@<your-domain>`, and access to the tools you specified.

### Add a new tool

`lib/tools.ts → buildTools` is one big object literal of `tool({ description, inputSchema, execute })` definitions. Add yours alongside the existing five, then list it in `PER_ASSISTANT_TOOLS` for the assistants who should have access.

### Change persona / voice

Edit the `systemPrompt` field in `lib/assistants-seed.ts`. The prompts get read fresh every chat turn — no rebuild needed.

## Production checklist

- [ ] All five required env vars set on the deployment.
- [ ] `AGENTMAIL_DOMAIN` points to a domain you've verified in AgentMail (SPF/DKIM/DMARC green).
- [ ] You've sent a few test emails from each assistant to a real address and confirmed deliverability.
- [ ] You've thought about what happens when nobody is watching the inbox. The current template only runs the agent loop when a browser is connected. For autonomous overnight behavior (replies that come in while you're asleep), add a webhook handler — `runInboundTurn` is exported from `lib/agent.ts` for exactly this purpose. See the comment in that file.
- [ ] The `agentmail` SDK in production needs `serverExternalPackages: ["agentmail"]` in `next.config.ts` (already there). This is because the SDK's optional x402 payments integration uses a dynamic import that Turbopack/Webpack tries to statically resolve at build time.
- [ ] Logs from tool failures (`[tool:reply_to_thread] failed …`) are useful in dev but noisy in prod — consider piping them through a structured logger or trimming them once your prompts are tuned.

## Known limitations

- **In-flight requests are not resumed across page refreshes.** Chat history is held in React state via `useChat`; reloading the page resets it. Persisting `messages[]` per assistant in localStorage or a real DB is left to the consumer.
- **No multi-user / multi-tenant support.** This template assumes one principal (you). For multi-tenant, you'd need an auth layer plus per-user inbox provisioning (AgentMail has the pods/scoped-keys primitives for this — out of scope for the template).
- **Inbound webhook handler is not included.** Removed in favor of WS-based live UI updates. Add one if you need autonomous reply behavior; the agent loop function (`runInboundTurn`) is ready to wire up.
- **`PRINCIPAL_EMAIL` is single-valued.** All escalations go to one address.

## License

MIT — go build cool things.
