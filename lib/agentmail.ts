import { AgentMailClient } from "agentmail";
import { env, requireEnv } from "./env";

let _client: AgentMailClient | null = null;
let _clientKey: string | null = null;

export function getAgentMail(): AgentMailClient {
    const apiKey = requireEnv("AGENTMAIL_API_KEY");
    // Re-instantiate the client if the key changed in .env.local mid-session.
    if (_clientKey !== apiKey) {
        _client = new AgentMailClient({ apiKey });
        _clientKey = apiKey;
    }
    return _client!;
}

export function getDomain(): string | undefined {
    return env.AGENTMAIL_DOMAIN || undefined;
}
