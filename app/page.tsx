"use client";

import { useEffect, useState } from "react";
import { ASSISTANT_SEEDS, type AssistantSeed } from "@/lib/assistants-seed";
import { Inbox } from "@/components/inbox";
import { ChatPanel } from "@/components/chat-panel";
import { ThreadModal } from "@/components/thread-modal";

type ExampleGroup = {
    assistantId: "friday" | "pepper" | "happy";
    bodies: string[];
};

const EXAMPLES_BY_ASSISTANT: ExampleGroup[] = [
    {
        assistantId: "friday",
        bodies: [
            "find a time for me, alice@example.com, and bob@example.com to grab dinner next Thursday in SF. Budget $80/person, vegetarian-friendly.",
            "coordinate a 30-min product kickoff between alice@example.com, bob@example.com, and carol@example.com next Tuesday or Wednesday. Send a calendar invite once everyone confirms.",
            "four of us — alice@x.com, bob@y.com, carol@z.com, dave@w.com — are planning a weekend trip in June. Find a weekend that works for everyone and propose a quick itinerary.",
        ],
    },
    {
        assistantId: "pepper",
        bodies: [
            "get quotes from 3 plumbers for a faucet replacement at 1234 Market St, San Francisco, CA. Budget around $400.",
            "I need a caterer for a 50-person company offsite in SF on June 14th. ~$40/head, vegetarian and vegan options required. Reach out to 3 and compare.",
            "find a moving company for a 2BR apartment, SF to LA, the first weekend of July. Get three quotes and recommend one.",
        ],
    },
    {
        assistantId: "happy",
        bodies: [
            "alex@fakeco.com keeps cold-pitching me their analytics tool. Add him to my blocklist and send a polite final decline.",
            "I got forwarded a recruiter pitch from jane@recruiterco.com. Decline politely on my behalf — I'm not job hunting right now.",
            "sarah@bigco.com just emailed asking for 15 minutes — Mark referred her. Screen the message, add her to my allowlist if she looks legit, and let me know what you decide.",
        ],
    },
];

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

export default function Home() {
    const [selected, setSelected] = useState<AssistantSeed>(ASSISTANT_SEEDS[0]);
    const [openThread, setOpenThread] = useState<{
        threadId: string;
        subject?: string;
    } | null>(null);
    const [openAccordion, setOpenAccordion] = useState<string | null>("friday");
    const [prefill, setPrefill] = useState<{
        assistantId: string;
        text: string;
        n: number;
    } | null>(null);

    // Close the modal automatically when the user switches assistant tabs —
    // the thread belongs to whichever inbox they were viewing.
    useEffect(() => {
        setOpenThread(null);
    }, [selected.id]);

    function applyExample(target: AssistantSeed, text: string) {
        setSelected(target);
        setPrefill({ assistantId: target.id, text, n: Date.now() });
    }

    return (
        <main className="min-h-dvh bg-white text-stone-950">
            <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 sm:pt-28">
                <header className="mb-12">
                    <h1 className="text-5xl font-medium tracking-tight text-stone-950 sm:text-6xl">
                        Stark Industries HQ
                    </h1>
                    <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-stone-500">
                        Friday, Pepper, and Happy — three AI assistants, each
                        with their own email address. CC them on a thread,
                        they coordinate, search, and reply.
                    </p>
                </header>

                <nav className="mb-8 border-b border-stone-200">
                    <div className="flex gap-1">
                        {ASSISTANT_SEEDS.map((a) => {
                            const active = selected.id === a.id;
                            return (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => setSelected(a)}
                                    className={`relative px-6 py-4 text-base transition ${
                                        active
                                            ? "font-medium text-stone-950"
                                            : "text-stone-500 hover:text-stone-800"
                                    }`}
                                >
                                    {a.name}
                                    {active && (
                                        <span className="absolute inset-x-4 -bottom-px h-px bg-stone-950" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                {/*
                 * One Inbox + one ChatPanel per assistant, all mounted at
                 * once. CSS hides the inactive ones via `hidden`, so they
                 * stay mounted — streams keep flowing, SSE stays connected,
                 * useChat state persists. Switching tabs becomes a pure
                 * visibility toggle.
                 */}
                <section className="mb-16 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-6">
                    <div>
                        {ASSISTANT_SEEDS.map((a) => (
                            <div
                                key={a.id}
                                className={selected.id === a.id ? "" : "hidden"}
                            >
                                <Inbox
                                    assistant={a}
                                    selectedThreadId={
                                        openThread?.threadId ?? null
                                    }
                                    onOpenThread={(threadId, subject) =>
                                        setOpenThread({ threadId, subject })
                                    }
                                />
                            </div>
                        ))}
                    </div>
                    <div>
                        {ASSISTANT_SEEDS.map((a) => (
                            <div
                                key={a.id}
                                className={selected.id === a.id ? "" : "hidden"}
                            >
                                <ChatPanel
                                    assistant={a}
                                    prefill={
                                        prefill?.assistantId === a.id
                                            ? {
                                                  text: prefill.text,
                                                  n: prefill.n,
                                              }
                                            : null
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
                        Examples
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
                        {EXAMPLES_BY_ASSISTANT.map((group, gi) => {
                            const target = ASSISTANT_SEEDS.find(
                                (a) => a.id === group.assistantId,
                            );
                            if (!target) return null;
                            const isOpen = openAccordion === group.assistantId;
                            return (
                                <div
                                    key={group.assistantId}
                                    className={
                                        gi > 0
                                            ? "border-t border-stone-100"
                                            : ""
                                    }
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setOpenAccordion((cur) =>
                                                cur === group.assistantId
                                                    ? null
                                                    : group.assistantId,
                                            )
                                        }
                                        aria-expanded={isOpen}
                                        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-stone-50"
                                    >
                                        <div className="flex min-w-0 items-baseline gap-3">
                                            <span className="text-base font-medium text-stone-950">
                                                {target.name}
                                            </span>
                                            <span className="truncate text-xs text-stone-500">
                                                {target.specialty}
                                            </span>
                                        </div>
                                        <svg
                                            className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform ${
                                                isOpen ? "rotate-90" : ""
                                            }`}
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            aria-hidden="true"
                                        >
                                            <path d="M9 6l6 6-6 6" />
                                        </svg>
                                    </button>
                                    {isOpen && (
                                        <div className="border-t border-stone-100 bg-stone-50 px-2 py-2">
                                            {group.bodies.map((body, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() =>
                                                        applyExample(
                                                            target,
                                                            `${target.name}, ${body}`,
                                                        )
                                                    }
                                                    className="group flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-white"
                                                >
                                                    <span className="text-[14px] leading-relaxed text-stone-700 group-hover:text-stone-950">
                                                        <span className="font-medium text-stone-950">
                                                            {target.name},
                                                        </span>{" "}
                                                        {body}
                                                    </span>
                                                    <span className="ml-auto pt-0.5 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-700">
                                                        <ArrowIcon />
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {openThread && (
                    <ThreadModal
                        threadId={openThread.threadId}
                        subject={openThread.subject}
                        onClose={() => setOpenThread(null)}
                    />
                )}

                <footer className="mt-24 flex justify-between text-xs text-stone-400">
                    <div>
                        <a
                            className="transition hover:text-stone-700"
                            href="https://docs.agentmail.to"
                        >
                            AgentMail docs
                        </a>
                        <span className="mx-2">·</span>
                        <a
                            className="transition hover:text-stone-700"
                            href="https://github.com/agentmail-to/agentmail-template-starkhq"
                        >
                            Source
                        </a>
                    </div>
                    <div className="font-mono">Powered by AgentMail</div>
                </footer>
            </div>
        </main>
    );
}
