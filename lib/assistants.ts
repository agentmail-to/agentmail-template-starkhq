import { ASSISTANT_SEEDS, type AssistantSeed } from "./assistants-seed";
import { getAgentMail, getDomain } from "./agentmail";

export type Assistant = AssistantSeed & {
    inboxId?: string;
    email?: string;
};

/**
 * Process-local cache of resolved inbox info per assistant id. Lives for the
 * lifetime of the Node process; rebuilt lazily on cold start. AgentMail's
 * `clientId` idempotency keeps re-resolution correct without persistence.
 */
const inboxCache = new Map<
    string,
    { inboxId: string; email: string; username: string }
>();

export function getAssistant(id: string): Assistant | null {
    const seed = ASSISTANT_SEEDS.find((a) => a.id === id);
    if (!seed) return null;
    const cached = inboxCache.get(seed.id);
    return cached ? { ...seed, ...cached } : seed;
}

export async function ensureProvisioned(
    assistant: Assistant,
): Promise<Assistant> {
    const cached = inboxCache.get(assistant.id);
    if (cached) return { ...assistant, ...cached };

    const client = getAgentMail();
    const domain = getDomain();

    // Env override: AGENTMAIL_USERNAME_<ID> lets cloners pick their own handles.
    const envOverride =
        process.env[`AGENTMAIL_USERNAME_${assistant.id.toUpperCase()}`];
    const baseUsername = envOverride?.trim() || assistant.username;

    const isTaken = (err: unknown) =>
        (err as { name?: string })?.name === "IsTakenError" ||
        /Inbox is taken/i.test(String(err));

    const tryCreate = async (
        username: string,
    ): Promise<{ inboxId: string; email: string; username: string } | null> => {
        try {
            // `clientId` is AgentMail's idempotency key: subsequent calls with
            // the same id return the existing inbox instead of creating a new
            // one — so restarting the server doesn't proliferate inboxes.
            const inbox = await client.inboxes.create({
                clientId: assistant.id,
                username,
                ...(domain ? { domain } : {}),
                displayName: assistant.name,
            });
            return {
                inboxId: inbox.inboxId,
                email: inbox.email,
                username,
            };
        } catch (err) {
            if (isTaken(err)) return null;
            throw err;
        }
    };

    let provisioned = await tryCreate(baseUsername);

    if (!provisioned) {
        // Username is taken somewhere. First check if WE own it (legacy
        // inboxes created before clientId was wired up won't be returned
        // automatically by clientId).
        let pageToken: string | undefined;
        let existing: { inboxId: string; email: string } | undefined;
        for (let i = 0; i < 5; i++) {
            const page = await client.inboxes.list({
                limit: 100,
                ...(pageToken ? { pageToken } : {}),
            });
            existing = page.inboxes.find((inb) => {
                const [local, host] = inb.email.split("@");
                return (
                    local === baseUsername &&
                    (!domain || host === domain)
                );
            });
            if (existing) break;
            if (!page.nextPageToken) break;
            pageToken = page.nextPageToken;
        }
        if (existing) {
            provisioned = {
                inboxId: existing.inboxId,
                email: existing.email,
                username: baseUsername,
            };
        } else {
            // Not ours — claimed on a shared default. Retry with random suffixes.
            for (let i = 0; i < 5; i++) {
                const suffix = Math.random().toString(36).slice(2, 6);
                const candidate = `${baseUsername}-${suffix}`;
                provisioned = await tryCreate(candidate);
                if (provisioned) break;
            }
        }
    }

    if (!provisioned) {
        throw new Error(
            `Could not provision an inbox for "${baseUsername}" after several attempts.`,
        );
    }

    inboxCache.set(assistant.id, provisioned);
    return { ...assistant, ...provisioned };
}
