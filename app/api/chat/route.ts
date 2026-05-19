import { convertToModelMessages, type UIMessage } from "ai";
import { getAssistant } from "@/lib/assistants";
import { streamUserTurn } from "@/lib/agent";

export async function POST(req: Request) {
    const body = (await req.json().catch(() => null)) as {
        messages?: UIMessage[];
        assistantId?: string;
    } | null;

    if (!body?.messages || !body.assistantId) {
        return new Response("Invalid body", { status: 400 });
    }

    const assistant = await getAssistant(body.assistantId);
    if (!assistant) {
        return new Response(`Unknown assistant: ${body.assistantId}`, {
            status: 404,
        });
    }

    const result = await streamUserTurn({
        assistant,
        messages: await convertToModelMessages(body.messages),
    });
    return result.toUIMessageStreamResponse();
}
