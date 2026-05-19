"use client";

import { useEffect, useState } from "react";

// Matches the canonical "On <date>, <name> <email> wrote:" preamble that
// virtually every email client prepends when quoting a prior message. We
// use a lazy multi-line match so it tolerates the preamble wrapping across
// lines, then collapse everything from that line onward.
const QUOTED_PREAMBLE = /^On\b[\s\S]*?\bwrote:\s*$/m;

function splitQuoted(text: string): { visible: string; quoted: string } {
    const match = text.match(QUOTED_PREAMBLE);
    if (!match || match.index === undefined) {
        return { visible: text, quoted: "" };
    }
    return {
        visible: text.slice(0, match.index).trimEnd(),
        quoted: text.slice(match.index).trimEnd(),
    };
}

function MessageBody({ text }: { text: string }) {
    const { visible, quoted } = splitQuoted(text);
    const [showQuoted, setShowQuoted] = useState(false);

    return (
        <div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                {visible || (
                    <span className="italic text-stone-400">(no content)</span>
                )}
            </div>
            {quoted && (
                <div className="mt-2">
                    <button
                        type="button"
                        onClick={() => setShowQuoted((v) => !v)}
                        aria-expanded={showQuoted}
                        aria-label={
                            showQuoted ? "Hide quoted text" : "Show quoted text"
                        }
                        className="inline-flex items-center rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-[13px] leading-none tracking-widest text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
                    >
                        ···
                    </button>
                    {showQuoted && (
                        <div className="mt-2 whitespace-pre-wrap border-l-2 border-stone-200 pl-3 text-xs leading-relaxed text-stone-500">
                            {quoted}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

type Message = {
    messageId?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    subject?: string;
    text?: string;
    html?: string;
    timestamp?: string;
    createdAt?: string;
};

type ThreadFull = {
    threadId?: string;
    subject?: string;
    messages?: Message[];
};

function formatTimestamp(iso?: string): string {
    if (!iso) return "";
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return "";
    const d = new Date(ts);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        ...(sameYear ? {} : { year: "numeric" }),
        hour: "numeric",
        minute: "2-digit",
    });
}

function senderName(addr?: string): string {
    if (!addr) return "(unknown)";
    const named = addr.match(/^([^<]+)<([^>]+)>$/);
    if (named) return named[1].trim().replace(/^["']|["']$/g, "");
    return addr;
}

function senderEmail(addr?: string): string {
    if (!addr) return "";
    const m = addr.match(/<([^>]+)>/);
    return m ? m[1] : addr;
}

export function ThreadDetail({ threadId }: { threadId: string }) {
    const [thread, setThread] = useState<ThreadFull | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        setThread(null);
        setError(null);
        fetch(`/api/thread/${encodeURIComponent(threadId)}`)
            .then(async (r) => {
                if (!r.ok) throw new Error(await r.text());
                return r.json();
            })
            .then((data: { thread?: ThreadFull }) => {
                if (mounted) setThread(data.thread ?? null);
            })
            .catch((err) => {
                if (mounted)
                    setError(err instanceof Error ? err.message : String(err));
            });
        return () => {
            mounted = false;
        };
    }, [threadId]);

    if (error) {
        return (
            <div className="bg-stone-50 px-4 py-3 text-xs text-stone-500">
                Couldn&apos;t load thread: {error}
            </div>
        );
    }

    if (!thread) {
        return (
            <div className="flex items-center gap-2 bg-stone-50 px-4 py-3 text-xs text-stone-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-stone-300" />
                Loading thread…
            </div>
        );
    }

    const messages = thread.messages ?? [];

    return (
        <div className="space-y-2 bg-stone-50 px-4 py-3">
            {messages.length === 0 ? (
                <div className="text-xs text-stone-400">Empty thread.</div>
            ) : (
                messages.map((m, i) => {
                    const ts = m.timestamp ?? m.createdAt;
                    const body = (m.text ?? m.html ?? "").trim();
                    return (
                        <article
                            key={m.messageId ?? i}
                            className="rounded-xl border border-stone-200 bg-white px-4 py-3"
                        >
                            <header className="mb-2 flex items-baseline justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-stone-950">
                                        {senderName(m.from)}
                                    </div>
                                    {senderEmail(m.from) !==
                                        senderName(m.from) && (
                                        <div className="truncate font-mono text-[11px] text-stone-500">
                                            {senderEmail(m.from)}
                                        </div>
                                    )}
                                </div>
                                <div className="shrink-0 text-[11px] text-stone-400">
                                    {formatTimestamp(ts)}
                                </div>
                            </header>
                            {body ? (
                                <MessageBody text={body} />
                            ) : (
                                <div className="text-xs italic text-stone-400">
                                    (no body)
                                </div>
                            )}
                        </article>
                    );
                })
            )}
        </div>
    );
}
