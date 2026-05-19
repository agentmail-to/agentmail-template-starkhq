"use client";

import { useEffect, useState } from "react";

export type ThreadRowData = {
    threadId: string;
    senders: string[];
    subject?: string;
    preview?: string;
    timestamp: string;
    messageCount: number;
};

function relativeTime(iso: string): string {
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return "";
    const diff = Date.now() - ts;
    if (diff < 60_000) return "now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
    return `${Math.floor(diff / 86_400_000)}d`;
}

function shortSender(addr: string): string {
    const match = addr.match(/<([^>]+)>/);
    const email = match ? match[1] : addr;
    const local = email.split("@")[0];
    return local || email;
}

export function ThreadRow({
    thread,
    flashed,
    selected,
}: {
    thread: ThreadRowData;
    flashed?: boolean;
    selected?: boolean;
}) {
    // Force a re-render every 30s so the relative timestamps stay fresh.
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);

    const senderLabel =
        thread.senders.length === 0
            ? "(no sender)"
            : thread.senders.length === 1
              ? shortSender(thread.senders[0])
              : `${shortSender(thread.senders[0])} +${thread.senders.length - 1}`;

    return (
        <div
            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-700 ${
                flashed
                    ? "bg-stone-100"
                    : selected
                      ? "bg-stone-50"
                      : "bg-transparent hover:bg-stone-50"
            }`}
        >
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                    <div className="truncate text-sm font-medium text-stone-950">
                        {senderLabel}
                    </div>
                    {thread.messageCount > 1 && (
                        <div className="text-xs text-stone-400">
                            ({thread.messageCount})
                        </div>
                    )}
                    <div className="ml-auto shrink-0 text-xs text-stone-400">
                        {relativeTime(thread.timestamp)}
                    </div>
                </div>
                <div className="mt-0.5 truncate text-sm text-stone-700">
                    {thread.subject ?? "(no subject)"}
                </div>
                {thread.preview && (
                    <div className="mt-0.5 truncate text-xs text-stone-500">
                        {thread.preview}
                    </div>
                )}
            </div>
        </div>
    );
}
