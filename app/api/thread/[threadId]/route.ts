import { getAgentMail } from "@/lib/agentmail";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ threadId: string }> },
) {
    const { threadId } = await params;
    if (!threadId) {
        return Response.json({ error: "Missing threadId" }, { status: 400 });
    }
    try {
        const client = getAgentMail();
        const thread = await client.threads.get(threadId);
        return Response.json({ thread });
    } catch (err) {
        return Response.json(
            { error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
        );
    }
}
