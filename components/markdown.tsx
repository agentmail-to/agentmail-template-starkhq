"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders the assistant's streamed markdown output. Tight, monochrome
 * styling that matches the rest of the chat UI — no `prose` plugin, just
 * per-element Tailwind so we stay in control of spacing and color.
 *
 * Re-rendering on every streamed chunk is fine: react-markdown reparses on
 * each pass and gracefully handles incomplete syntax (e.g. `**` with no
 * closing yet just renders as text until the closing arrives).
 */
export function Markdown({ children }: { children: string }) {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                p: ({ children }) => (
                    <p className="my-2 first:mt-0 last:mb-0 leading-relaxed">
                        {children}
                    </p>
                ),
                h1: ({ children }) => (
                    <h1 className="mt-4 mb-2 text-base font-semibold text-stone-950 first:mt-0">
                        {children}
                    </h1>
                ),
                h2: ({ children }) => (
                    <h2 className="mt-4 mb-2 text-[15px] font-semibold text-stone-950 first:mt-0">
                        {children}
                    </h2>
                ),
                h3: ({ children }) => (
                    <h3 className="mt-3 mb-1.5 text-sm font-semibold text-stone-950 first:mt-0">
                        {children}
                    </h3>
                ),
                strong: ({ children }) => (
                    <strong className="font-semibold text-stone-950">
                        {children}
                    </strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                a: ({ href, children }) => (
                    <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-stone-300 underline-offset-2 transition hover:decoration-stone-700"
                    >
                        {children}
                    </a>
                ),
                ul: ({ children }) => (
                    <ul className="my-2 ml-5 list-disc space-y-1 marker:text-stone-400">
                        {children}
                    </ul>
                ),
                ol: ({ children }) => (
                    <ol className="my-2 ml-5 list-decimal space-y-1 marker:text-stone-400">
                        {children}
                    </ol>
                ),
                li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                ),
                code: ({ className, children }) => {
                    const isBlock =
                        typeof className === "string" &&
                        className.startsWith("language-");
                    return (
                        <code
                            className={
                                isBlock
                                    ? "font-mono text-[13px]"
                                    : "rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[13px] text-stone-800"
                            }
                        >
                            {children}
                        </code>
                    );
                },
                pre: ({ children }) => (
                    <pre className="my-3 overflow-x-auto rounded-lg border border-stone-200 bg-stone-50 p-3 text-[13px]">
                        {children}
                    </pre>
                ),
                blockquote: ({ children }) => (
                    <blockquote className="my-2 border-l-2 border-stone-200 pl-3 text-stone-600">
                        {children}
                    </blockquote>
                ),
                hr: () => <hr className="my-4 border-stone-200" />,
                table: ({ children }) => (
                    <div className="my-3 overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            {children}
                        </table>
                    </div>
                ),
                thead: ({ children }) => (
                    <thead className="border-b border-stone-200">
                        {children}
                    </thead>
                ),
                tbody: ({ children }) => <tbody>{children}</tbody>,
                tr: ({ children }) => (
                    <tr className="border-b border-stone-100 last:border-0">
                        {children}
                    </tr>
                ),
                th: ({ children }) => (
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-stone-500">
                        {children}
                    </th>
                ),
                td: ({ children }) => (
                    <td className="px-3 py-2 align-top text-stone-800">
                        {children}
                    </td>
                ),
            }}
        >
            {children}
        </ReactMarkdown>
    );
}
