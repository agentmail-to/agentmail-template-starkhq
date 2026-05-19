"use client";

import { useEffect } from "react";
import { ThreadDetail } from "./thread-detail";

export function ThreadModal({
    threadId,
    subject,
    onClose,
}: {
    threadId: string;
    subject?: string;
    onClose: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        // Lock body scroll while the modal is open.
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={subject ?? "Thread"}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
                    <div className="min-w-0">
                        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-stone-400">
                            Thread
                        </div>
                        <div className="mt-1 truncate text-base font-medium text-stone-950">
                            {subject ?? "(no subject)"}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                    >
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
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </header>
                <div className="overflow-y-auto">
                    <ThreadDetail threadId={threadId} />
                </div>
            </div>
        </div>
    );
}
