"use client";

const FRIENDLY_NAMES: Record<string, string> = {
    send_email: "Sending email",
    reply_to_thread: "Replying",
    list_threads: "Reading inbox",
    get_thread: "Reading thread",
    exa_search: "Searching the web",
};

type Status =
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error"
    | string;

export function ToolCall({ name, state }: { name: string; state: Status }) {
    const label = FRIENDLY_NAMES[name] ?? name.replace(/_/g, " ");
    const isWorking =
        state === "input-streaming" || state === "input-available";
    const isError = state === "output-error";
    const isDone = state === "output-available";

    return (
        <span className="my-1 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-stone-600">
            {isWorking ? (
                <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-stone-400 border-t-transparent" />
            ) : isError ? (
                <svg
                    className="h-3 w-3 text-stone-700"
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
            ) : isDone ? (
                <svg
                    className="h-3 w-3 text-emerald-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <path d="M5 12l5 5L20 7" />
                </svg>
            ) : null}
            <span className={isWorking ? "text-stone-700" : "text-stone-600"}>
                {label}
                {isWorking && "…"}
            </span>
        </span>
    );
}
