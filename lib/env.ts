/**
 * Env vars are read at call time via getters, not at module load. This
 * ensures Next.js's `Reload env: .env.local` hot-update is actually
 * observable from server code — a captured-at-load snapshot would
 * stay stale until you fully restart the dev process.
 */
export const env = {
    get AGENTMAIL_API_KEY() {
        return process.env.AGENTMAIL_API_KEY;
    },
    get AGENTMAIL_DOMAIN() {
        return process.env.AGENTMAIL_DOMAIN;
    },
    get ANTHROPIC_API_KEY() {
        return process.env.ANTHROPIC_API_KEY;
    },
    get EXA_API_KEY() {
        return process.env.EXA_API_KEY;
    },
    get PRINCIPAL_EMAIL() {
        return process.env.PRINCIPAL_EMAIL;
    },
    get APP_URL() {
        return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    },
};

export function requireEnv(key: keyof typeof env): string {
    const value = env[key];
    if (!value) {
        throw new Error(
            `Missing required env var: ${key}. Add it to .env.local and restart the dev server. See .env.example for the full list.`,
        );
    }
    return value;
}
