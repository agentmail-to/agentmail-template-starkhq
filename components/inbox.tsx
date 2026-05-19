"use client";

import { useEffect, useState } from "react";
import type { AssistantSeed } from "@/lib/assistants-seed";
import { ThreadRow, type ThreadRowData } from "./thread-row";

type Status = "connecting" | "live" | "reconnecting" | "error";

/**
 * Tolerant normalizer: AgentMail's wire format is snake_case; the SDK
 * normalizes inside the Node.js client, but events arriving over our SSE
 * relay may keep raw casing. Read both forms.
 */
function normalize(raw: unknown): ThreadRowData {
    const r = raw as Record<string, unknown>;
    return {
        threadId: String(r.threadId ?? r.thread_id ?? ""),
        senders: Array.isArray(r.senders) ? (r.senders as string[]) : [],
        subject: (r.subject as string | undefined) ?? undefined,
        preview: (r.preview as string | undefined) ?? undefined,
        timestamp: String(
            r.timestamp ??
                r.updatedAt ??
                r.updated_at ??
                r.createdAt ??
                r.created_at ??
                new Date().toISOString(),
        ),
        messageCount: Number(r.messageCount ?? r.message_count ?? 1),
    };
}

export function Inbox({
    assistant,
    selectedThreadId,
    onOpenThread,
}: {
    assistant: AssistantSeed;
    selectedThreadId?: string | null;
    onOpenThread?: (threadId: string, subject?: string) => void;
}) {
    const [threads, setThreads] = useState<ThreadRowData[]>([]);
    const [flashedIds, setFlashedIds] = useState<Set<string>>(new Set());
    const [status, setStatus] = useState<Status>("connecting");
    const [address, setAddress] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        setStatus("connecting");
        setThreads([]);
        setFlashedIds(new Set());
        setAddress(null);

        fetch(`/api/threads?assistantId=${encodeURIComponent(assistant.id)}`)
            .then(async (r) => {
                if (!r.ok) throw new Error(await r.text());
                return r.json();
            })
            .then((data: { threads?: unknown[]; email?: string }) => {
                if (!mounted) return;
                const items = (data.threads ?? []).map((t) => normalize(t));
                setThreads(items);
                if (data.email) setAddress(data.email);
            })
            .catch(() => {
                if (mounted) setStatus("error");
            });

        const es = new EventSource(
            `/api/events?assistantId=${encodeURIComponent(assistant.id)}`,
        );

        es.onmessage = (e) => {
            if (!mounted) return;
            let evt: Record<string, unknown>;
            try {
                evt = JSON.parse(e.data);
            } catch {
                return;
            }
            if (evt.type === "status" && typeof evt.status === "string") {
                setStatus(evt.status as Status);
                return;
            }
            if (evt.type === "event" && evt.thread) {
                const next = normalize(evt.thread);
                if (!next.threadId) return;
                setThreads((prev) => {
                    const without = prev.filter(
                        (t) => t.threadId !== next.threadId,
                    );
                    return [next, ...without];
                });
                setFlashedIds((prev) => {
                    const ns = new Set(prev);
                    ns.add(next.threadId);
                    return ns;
                });
                setTimeout(() => {
                    if (!mounted) return;
                    setFlashedIds((prev) => {
                        const ns = new Set(prev);
                        ns.delete(next.threadId);
                        return ns;
                    });
                }, 1500);
            }
        };

        es.onerror = () => {
            if (mounted) setStatus("reconnecting");
        };

        return () => {
            mounted = false;
            es.close();
        };
    }, [assistant.id]);

    const statusLabel =
        status === "live"
            ? "Live"
            : status === "error"
              ? "Disconnected"
              : status === "reconnecting"
                ? "Reconnecting"
                : "Connecting";

    const statusDot =
        status === "live"
            ? "bg-emerald-500"
            : status === "error"
              ? "bg-stone-700"
              : "bg-amber-500";

    return (
        <div className="flex h-[520px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                <div>
                    <div className="text-sm font-medium text-stone-950">
                        Inbox
                    </div>
                    <div className="font-mono text-[11px] text-stone-500">
                        {address ?? " "}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <span
                        className={`h-1.5 w-1.5 rounded-full ${statusDot}`}
                    />
                    {statusLabel}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {threads.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-stone-400">
                        {status === "error"
                            ? "Couldn't connect to AgentMail. Check that AGENTMAIL_API_KEY is set in .env.local and restart the dev server."
                            : "No threads yet. Send mail from the chat panel to start one."}
                    </div>
                ) : (
                    <div className="divide-y divide-stone-100">
                        {threads.map((t) => (
                            <button
                                key={t.threadId}
                                type="button"
                                onClick={() =>
                                    onOpenThread?.(t.threadId, t.subject)
                                }
                                className="block w-full text-left"
                            >
                                <ThreadRow
                                    thread={t}
                                    flashed={flashedIds.has(t.threadId)}
                                    selected={selectedThreadId === t.threadId}
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
