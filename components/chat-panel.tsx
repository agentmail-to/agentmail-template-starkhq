"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
    DefaultChatTransport,
    isTextUIPart,
    isToolUIPart,
    getToolName,
} from "ai";
import type { AssistantSeed } from "@/lib/assistants-seed";
import { Markdown } from "./markdown";
import { ToolCall } from "./tool-call";

function ArrowIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
    );
}

function Spinner() {
    return (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
    );
}

function TypingDots() {
    return (
        <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400 [animation-delay:160ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400 [animation-delay:320ms]" />
        </span>
    );
}

export function ChatPanel({
    assistant,
    prefill,
}: {
    assistant: AssistantSeed;
    prefill?: { text: string; n: number } | null;
}) {
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const { messages, sendMessage, status } = useChat({
        transport: new DefaultChatTransport({
            api: "/api/chat",
            body: { assistantId: assistant.id },
        }),
    });

    // Prefill the composer when an example scenario is clicked. We re-fire on
    // every nonce change so picking the same example twice still re-prefills.
    useEffect(() => {
        if (prefill?.text) setInput(prefill.text);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefill?.n]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, [messages]);

    const busy = status === "submitted" || status === "streaming";

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!input.trim() || busy) return;
        sendMessage({ text: input });
        setInput("");
    }

    const lastMessage = messages[messages.length - 1];
    const showThinking =
        status === "submitted" &&
        (!lastMessage ||
            lastMessage.role !== "assistant" ||
            lastMessage.parts.length === 0);

    return (
        <div className="flex h-[520px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-4 py-3">
                <div className="text-sm font-medium text-stone-950">
                    Chat with {assistant.name}
                </div>
                <div className="font-mono text-[11px] text-stone-500">
                    instructions stay private — only sent mail leaves the app
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-5 py-5"
            >
                {messages.length === 0 ? (
                    <div className="text-[15px] text-stone-400">
                        Address{" "}
                        <span className="text-stone-700">{assistant.name}</span>{" "}
                        below.
                    </div>
                ) : (
                    <div className="space-y-5">
                        {messages.map((message) => {
                            if (message.role === "user") {
                                const text = message.parts
                                    .filter(isTextUIPart)
                                    .map((p) => p.text)
                                    .join("");
                                return (
                                    <div
                                        key={message.id}
                                        className="flex justify-end"
                                    >
                                        <div className="max-w-[85%] rounded-2xl bg-stone-100 px-4 py-2.5 text-[15px] leading-relaxed text-stone-900">
                                            {text}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={message.id}
                                    className="space-y-2 text-[15px] leading-relaxed text-stone-900"
                                >
                                    {message.parts.map((part, i) => {
                                        if (isTextUIPart(part)) {
                                            if (!part.text) return null;
                                            return (
                                                <Markdown key={i}>
                                                    {part.text}
                                                </Markdown>
                                            );
                                        }
                                        if (isToolUIPart(part)) {
                                            return (
                                                <ToolCall
                                                    key={i}
                                                    name={getToolName(part)}
                                                    state={part.state}
                                                />
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            );
                        })}
                        {showThinking && (
                            <div className="text-stone-500">
                                <TypingDots />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <form
                onSubmit={onSubmit}
                className="border-t border-stone-100 p-3"
            >
                <div className="flex items-center gap-2 rounded-xl bg-stone-50 px-4 py-2.5 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-stone-300">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={`Talk to ${assistant.name}…`}
                        className="flex-1 bg-transparent text-[15px] text-stone-900 outline-none placeholder:text-stone-400"
                        disabled={busy}
                    />
                    <button
                        type="submit"
                        disabled={busy || !input.trim()}
                        aria-label="Send"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-950 text-white transition hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400"
                    >
                        {busy ? <Spinner /> : <ArrowIcon />}
                    </button>
                </div>
            </form>
        </div>
    );
}
