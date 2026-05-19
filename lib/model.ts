import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Provider-agnostic model factory. Reads `AI_PROVIDER` (default `"anthropic"`)
 * and `AI_MODEL_ID` (per-provider default applied if unset).
 *
 * Both providers work end-to-end. The default is Anthropic because the system
 * prompts were tuned against Claude — switch the provider, but expect to tune
 * the prompts in `lib/assistants-seed.ts` if you want maximum quality.
 */

const DEFAULT_MODEL_ID = {
    anthropic: "claude-sonnet-4-6",
    openai: "gpt-4o",
} as const;

export function getModel(): LanguageModel {
    const explicit = process.env.AI_PROVIDER?.toLowerCase();
    const modelId = process.env.AI_MODEL_ID || undefined;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    const hasOpenai = !!process.env.OPENAI_API_KEY;

    // Auto-detect provider when AI_PROVIDER is unset: prefer Anthropic
    // (the default), fall back to OpenAI if only that key is present.
    const provider =
        explicit ??
        (hasAnthropic ? "anthropic" : hasOpenai ? "openai" : "anthropic");

    if (provider === "openai") {
        if (!hasOpenai) {
            throw new Error(
                hasAnthropic
                    ? "AI_PROVIDER=openai but OPENAI_API_KEY is not set. Either add OPENAI_API_KEY, or remove AI_PROVIDER to use the ANTHROPIC_API_KEY you already have."
                    : "OPENAI_API_KEY is not set. Add it to .env.local and restart the dev server.",
            );
        }
        return openai(modelId ?? DEFAULT_MODEL_ID.openai);
    }

    if (provider === "anthropic") {
        if (!hasAnthropic) {
            throw new Error(
                hasOpenai
                    ? "AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is not set. Either add ANTHROPIC_API_KEY, or set AI_PROVIDER=openai to use the OPENAI_API_KEY you already have."
                    : "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.",
            );
        }
        return anthropic(modelId ?? DEFAULT_MODEL_ID.anthropic);
    }

    throw new Error(
        `Unknown AI_PROVIDER: "${provider}". Use "anthropic" or "openai".`,
    );
}
