import { z } from "zod";
import { getAssistant, ensureProvisioned } from "@/lib/assistants";
import { getAgentMail } from "@/lib/agentmail";

const querySchema = z.object({ assistantId: z.string() });

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
        assistantId: searchParams.get("assistantId"),
    });
    if (!parsed.success) {
        return Response.json({ error: "Missing assistantId" }, { status: 400 });
    }

    const assistant = await getAssistant(parsed.data.assistantId);
    if (!assistant) {
        return Response.json({ error: "Unknown assistant" }, { status: 404 });
    }

    try {
        const provisioned = await ensureProvisioned(assistant);
        if (!provisioned.inboxId) {
            return Response.json(
                { error: "Inbox not provisioned" },
                { status: 500 },
            );
        }
        const client = getAgentMail();
        const result = await client.inboxes.threads.list(provisioned.inboxId);
        const threads = result.threads ?? [];
        return Response.json({
            threads,
            count: result.count ?? threads.length,
            email: provisioned.email,
            username: provisioned.username,
        });
    } catch (err) {
        return Response.json(
            { error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
}
