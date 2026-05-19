import {
    streamText,
    generateText,
    stepCountIs,
    type ModelMessage,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { ensureProvisioned, type Assistant } from "./assistants";
import { buildTools } from "./tools";
import { getAgentMail } from "./agentmail";

const MODEL_ID = "claude-sonnet-4-6";

/**
 * Streamed turn initiated from the chat UI. The principal addresses an
 * assistant ("Friday, schedule X..."); the assistant decides whether to
 * email people, search the web, read her own inbox, or just answer in chat.
 *
 * The full message history is passed in so the assistant remembers prior
 * turns. Tool calls/results within a turn are kept inside that turn — they
 * are NOT round-tripped to the client in this minimal template, so on
 * follow-up turns the assistant uses list_threads/get_thread to re-read the
 * inbox state instead of relying on cached tool outputs.
 */
export async function streamUserTurn({
    assistant,
    messages,
}: {
    assistant: Assistant;
    messages: ModelMessage[];
}) {
    const provisioned = await ensureProvisioned(assistant);
    const tools = buildTools({ assistant: provisioned });
    return streamText({
        model: anthropic(MODEL_ID),
        system: `${provisioned.systemPrompt}

When the principal asks about replies, responses, or the status of an existing thread, USE list_threads and get_thread to actually read the inbox before answering. Don't claim you have no context — you have tools to look.`,
        messages,
        tools,
        stopWhen: stepCountIs(12),
    });
}

/**
 * Non-streamed turn for processing an inbound message. The assistant reads the
 * full thread and decides whether to reply, ask, or wait.
 *
 * The Friday template doesn't call this directly — the WS-driven UI only
 * streams events for live display. For production-grade autonomous behavior
 * (the assistant continuing a coordination while no browser is connected),
 * wire this to a webhook handler. See README → "Production: enable autonomous
 * replies".
 */
export async function runInboundTurn({
    assistant,
    threadId,
    inboundMessageId,
    inboundFrom,
    inboundText,
    inboundSubject,
}: {
    assistant: Assistant;
    threadId: string;
    inboundMessageId: string;
    inboundFrom: string;
    inboundText: string;
    inboundSubject?: string;
}) {
    let threadContext = `From: ${inboundFrom}\nSubject: ${
        inboundSubject ?? "(no subject)"
    }\n\n${inboundText}`;

    try {
        const client = getAgentMail();
        const thread = await client.threads.get(threadId);
        const messages = thread.messages ?? [];
        if (messages.length > 0) {
            threadContext = messages
                .map((m) => {
                    const from = (m as { from?: string }).from ?? "(unknown)";
                    const subject =
                        (m as { subject?: string }).subject ??
                        "(no subject)";
                    const body =
                        (m as { text?: string; html?: string }).text ??
                        (m as { text?: string; html?: string }).html ??
                        "";
                    return `From: ${from}\nSubject: ${subject}\n\n${body}`;
                })
                .join("\n\n---\n\n");
        }
    } catch {
        // fall back to inbound-only context
    }

    const provisioned = await ensureProvisioned(assistant);
    const tools = buildTools({
        assistant: provisioned,
        threadId,
        inReplyToMessageId: inboundMessageId,
    });

    return generateText({
        model: anthropic(MODEL_ID),
        system: `${provisioned.systemPrompt}

You just received a new email in an ongoing thread. Read the full thread carefully and decide what to do:
- If the conversation needs a reply, use reply_to_thread (referencing message id "${inboundMessageId}").
- If you're still waiting on other participants and have nothing new to say, do nothing.
- If you have all the constraints you needed, send a converged proposal to all participants.

Don't over-explain. Sign emails as "${provisioned.name}".`,
        prompt: `Thread:\n\n${threadContext}`,
        tools,
        stopWhen: stepCountIs(6),
    });
}
