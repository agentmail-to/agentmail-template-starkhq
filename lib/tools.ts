import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";
import { getAgentMail } from "./agentmail";
import { requireEnv } from "./env";
import type { Assistant } from "./assistants";

type ToolContext = {
    assistant: Assistant;
    threadId?: string;
    inReplyToMessageId?: string;
};

// The AgentMail SDK returns RFC 5322 message ids with their canonical angle
// brackets (e.g. `<CAJi...@mail.gmail.com>`). Claude — and LLMs generally —
// treat `<…>` as markup and strip the brackets when passing the id from one
// tool call into the next, which makes `reply()` 404 with "Message not
// found". We restore the canonical form for any id that looks RFC-shaped
// (contains "@") and isn't already bracketed. AgentMail's own ULIDs
// (no "@") pass through unchanged.
function normalizeMessageId(id: string): string {
    const looksRfc = id.includes("@");
    const alreadyBracketed = id.startsWith("<") && id.endsWith(">");
    return looksRfc && !alreadyBracketed ? `<${id}>` : id;
}

// Logs tool errors before re-throwing so they surface in the dev terminal.
// The AI SDK otherwise catches and silently serializes them into the stream.
function logged<I, O>(name: string, fn: (input: I) => Promise<O>) {
    return async (input: I): Promise<O> => {
        try {
            return await fn(input);
        } catch (err) {
            const e = err as {
                name?: string;
                message?: string;
                statusCode?: number;
                body?: unknown;
            };
            console.error(`[tool:${name}] failed`, {
                input,
                name: e.name,
                statusCode: e.statusCode,
                message: e.message,
                body: e.body,
            });
            throw err;
        }
    };
}

/**
 * Per-assistant tool gating. Each assistant only sees the tools relevant to
 * its role — Friday and Pepper don't need filter management; Happy doesn't
 * need anything Friday/Pepper don't also use. If you add a new assistant id,
 * add it here too (defaults to the common set for unknown ids).
 */
const PER_ASSISTANT_TOOLS = {
    friday: [
        "send_email",
        "reply_to_thread",
        "list_threads",
        "get_thread",
        "exa_search",
        "forward_to_principal",
    ],
    pepper: [
        "send_email",
        "reply_to_thread",
        "list_threads",
        "get_thread",
        "exa_search",
        "forward_to_principal",
    ],
    happy: [
        "send_email",
        "reply_to_thread",
        "list_threads",
        "get_thread",
        "exa_search",
        "forward_to_principal",
        "block_sender",
        "allow_sender",
        "list_filters",
    ],
} as const;

type ToolName = (typeof PER_ASSISTANT_TOOLS)[keyof typeof PER_ASSISTANT_TOOLS][number];

export function buildTools(ctx: ToolContext) {
    const all = {
        send_email: tool({
            description:
                "Send a new email from your inbox. Use this to initiate a thread (e.g., reaching out to a participant for the first time).",
            inputSchema: z.object({
                to: z
                    .array(z.string())
                    .min(1)
                    .describe("Recipient email addresses"),
                cc: z.array(z.string()).optional(),
                subject: z.string().describe("Subject line"),
                body: z.string().describe("Email body, plaintext"),
            }),
            execute: logged("send_email", async ({ to, cc, subject, body }) => {
                if (!ctx.assistant.inboxId) {
                    throw new Error(
                        "Assistant inbox is not provisioned yet — cannot send mail.",
                    );
                }
                const client = getAgentMail();
                const result = await client.inboxes.messages.send(
                    ctx.assistant.inboxId,
                    { to, cc, subject, text: body },
                );
                return {
                    ok: true,
                    messageId: result.messageId,
                    threadId: result.threadId,
                };
            }),
        }),

        reply_to_thread: tool({
            description:
                "Reply within an existing thread. `messageId` must be a specific message id from inside the thread (NOT a thread id). Get message ids from `list_threads` (`lastMessageId` field) or `get_thread` (each item's `messageId`). Replying to a thread id will fail.",
            inputSchema: z.object({
                messageId: z
                    .string()
                    .describe(
                        "A message id from inside the thread — typically the `lastMessageId` from list_threads, or any messageId from get_thread. Do not pass a thread id.",
                    ),
                body: z.string().describe("Reply body, plaintext"),
                replyAll: z
                    .boolean()
                    .optional()
                    .describe("Reply to all original recipients"),
            }),
            execute: logged(
                "reply_to_thread",
                async ({ messageId, body, replyAll }) => {
                    const normalized = normalizeMessageId(messageId);
                    console.log(
                        "[tool:reply_to_thread] messageId — from AI:",
                        JSON.stringify(messageId),
                        "→ normalized:",
                        JSON.stringify(normalized),
                    );
                    if (!ctx.assistant.inboxId) {
                        throw new Error(
                            "Assistant inbox is not provisioned yet — cannot reply.",
                        );
                    }
                    const client = getAgentMail();
                    const result = replyAll
                        ? await client.inboxes.messages.replyAll(
                              ctx.assistant.inboxId,
                              normalized,
                              { text: body },
                          )
                        : await client.inboxes.messages.reply(
                              ctx.assistant.inboxId,
                              normalized,
                              { text: body },
                          );
                    return {
                        ok: true,
                        messageId: result.messageId,
                        threadId: result.threadId,
                    };
                },
            ),
        }),

        list_threads: tool({
            description:
                "List recent threads in your inbox. Each row includes `lastMessageId` — pass that as `messageId` to `reply_to_thread` when you want to respond.",
            inputSchema: z.object({
                limit: z
                    .number()
                    .int()
                    .min(1)
                    .max(50)
                    .default(20)
                    .describe("Maximum number of threads to return"),
            }),
            execute: logged("list_threads", async ({ limit }) => {
                if (!ctx.assistant.inboxId) {
                    throw new Error(
                        "Assistant inbox is not provisioned yet — cannot list threads.",
                    );
                }
                const client = getAgentMail();
                const result = await client.inboxes.threads.list(
                    ctx.assistant.inboxId,
                    { limit },
                );
                console.log(
                    "[tool:list_threads] raw SDK lastMessageIds:",
                    JSON.stringify(
                        (result.threads ?? []).map((t) => t.lastMessageId),
                    ),
                );
                return {
                    ok: true,
                    threads: (result.threads ?? []).map((t) => ({
                        threadId: t.threadId,
                        lastMessageId: t.lastMessageId,
                        subject: t.subject,
                        preview: t.preview,
                        senders: t.senders,
                        recipients: t.recipients,
                        messageCount: t.messageCount,
                        updatedAt: t.updatedAt,
                    })),
                };
            }),
        }),

        get_thread: tool({
            description:
                "Read the full content of a thread, including all messages. Each message has its own `messageId` — use those for `reply_to_thread`.",
            inputSchema: z.object({
                threadId: z.string().describe("ID of the thread to read"),
            }),
            execute: logged("get_thread", async ({ threadId }) => {
                const client = getAgentMail();
                const thread = await client.threads.get(threadId);
                console.log(
                    "[tool:get_thread] raw SDK messageIds:",
                    JSON.stringify(
                        (thread.messages ?? []).map(
                            (m) =>
                                (m as unknown as { messageId?: string })
                                    .messageId,
                        ),
                    ),
                );
                return {
                    ok: true,
                    threadId: thread.threadId,
                    subject: thread.subject,
                    messages: (thread.messages ?? []).map((m) => {
                        const msg = m as unknown as {
                            messageId?: string;
                            from?: string;
                            to?: string[];
                            cc?: string[];
                            subject?: string;
                            text?: string;
                            html?: string;
                            createdAt?: string | Date;
                            timestamp?: string | Date;
                        };
                        const ts = msg.createdAt ?? msg.timestamp;
                        return {
                            messageId: msg.messageId,
                            from: msg.from,
                            to: msg.to,
                            cc: msg.cc,
                            subject: msg.subject,
                            text: msg.text ?? msg.html ?? "",
                            timestamp:
                                ts instanceof Date ? ts.toISOString() : ts,
                        };
                    }),
                };
            }),
        }),

        exa_search: tool({
            description:
                "Search the web for relevant information (venues, businesses, prices, current events). Returns top results with title, URL, and snippet.",
            inputSchema: z.object({
                query: z.string(),
                numResults: z.number().int().min(1).max(10).default(5),
            }),
            execute: logged("exa_search", async ({ query, numResults }) => {
                const apiKey = requireEnv("EXA_API_KEY");
                const exa = new Exa(apiKey);
                const out = await exa.searchAndContents(query, {
                    numResults,
                    text: { maxCharacters: 800 },
                });
                return {
                    ok: true,
                    results: out.results.map((r) => ({
                        title: r.title,
                        url: r.url,
                        snippet: r.text?.slice(0, 400) ?? "",
                    })),
                };
            }),
        }),

        forward_to_principal: tool({
            description:
                "Escalate something to your principal — sends them an email from your inbox summarizing what happened and what you'd recommend. Use sparingly: only for things that genuinely need the principal's attention. Don't escalate things you can handle yourself.",
            inputSchema: z.object({
                subject: z
                    .string()
                    .describe("Subject line for the escalation email"),
                summary: z
                    .string()
                    .describe(
                        "What's going on and what you'd recommend. Plain text.",
                    ),
            }),
            execute: logged(
                "forward_to_principal",
                async ({ subject, summary }) => {
                    const principal = requireEnv("PRINCIPAL_EMAIL");
                    if (!ctx.assistant.inboxId) {
                        throw new Error(
                            "Assistant inbox is not provisioned yet — cannot escalate.",
                        );
                    }
                    const client = getAgentMail();
                    const result = await client.inboxes.messages.send(
                        ctx.assistant.inboxId,
                        {
                            to: [principal],
                            subject: `[FYI from ${ctx.assistant.name}] ${subject}`,
                            text: summary,
                        },
                    );
                    return {
                        ok: true,
                        messageId: result.messageId,
                        threadId: result.threadId,
                    };
                },
            ),
        }),

        block_sender: tool({
            description:
                "Block an email address or domain from sending mail to your inbox. Use for confirmed spam, scams, repeat offenders, or senders the principal has explicitly said not to entertain. Pass either a full address (alex@fakeco.com) or a domain (fakeco.com).",
            inputSchema: z.object({
                entry: z
                    .string()
                    .describe(
                        "Email address (alex@fakeco.com) or domain (fakeco.com) to block",
                    ),
                reason: z
                    .string()
                    .optional()
                    .describe("Short audit note for why this is blocked"),
            }),
            execute: logged("block_sender", async ({ entry, reason }) => {
                if (!ctx.assistant.inboxId) {
                    throw new Error(
                        "Assistant inbox is not provisioned yet.",
                    );
                }
                const client = getAgentMail();
                await client.inboxes.lists.create(
                    ctx.assistant.inboxId,
                    "receive",
                    "block",
                    { entry, ...(reason ? { reason } : {}) },
                );
                return { ok: true, blocked: entry };
            }),
        }),

        allow_sender: tool({
            description:
                "Allowlist an email address or domain — guarantees their mail gets through. Use for trusted contacts, important partners, or anyone the principal explicitly wants to hear from. Pass a full address or a domain.",
            inputSchema: z.object({
                entry: z
                    .string()
                    .describe("Email address or domain to allow"),
                reason: z
                    .string()
                    .optional()
                    .describe("Short audit note for why this is allowed"),
            }),
            execute: logged("allow_sender", async ({ entry, reason }) => {
                if (!ctx.assistant.inboxId) {
                    throw new Error(
                        "Assistant inbox is not provisioned yet.",
                    );
                }
                const client = getAgentMail();
                await client.inboxes.lists.create(
                    ctx.assistant.inboxId,
                    "receive",
                    "allow",
                    { entry, ...(reason ? { reason } : {}) },
                );
                return { ok: true, allowed: entry };
            }),
        }),

        list_filters: tool({
            description:
                "Show the current inbound allowlist and blocklist for your inbox. Use this before adding new entries to avoid duplicates, or when the principal asks who you're currently filtering.",
            inputSchema: z.object({}),
            execute: logged("list_filters", async () => {
                if (!ctx.assistant.inboxId) {
                    throw new Error(
                        "Assistant inbox is not provisioned yet.",
                    );
                }
                const client = getAgentMail();
                const [allowed, blocked] = await Promise.all([
                    client.inboxes.lists.list(
                        ctx.assistant.inboxId,
                        "receive",
                        "allow",
                    ),
                    client.inboxes.lists.list(
                        ctx.assistant.inboxId,
                        "receive",
                        "block",
                    ),
                ]);
                return {
                    ok: true,
                    allowed: allowed.entries ?? [],
                    blocked: blocked.entries ?? [],
                };
            }),
        }),
    } as const;

    const allowed: ReadonlyArray<ToolName> =
        PER_ASSISTANT_TOOLS[
            ctx.assistant.id as keyof typeof PER_ASSISTANT_TOOLS
        ] ?? PER_ASSISTANT_TOOLS.friday;

    return Object.fromEntries(
        allowed.map((k) => [k, all[k as keyof typeof all]]),
    );
}
