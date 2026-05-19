import { getAssistant, ensureProvisioned } from "@/lib/assistants";
import { getAgentMail } from "@/lib/agentmail";

/**
 * SSE relay. The server opens a WebSocket to AgentMail using the long-lived
 * API key (which can't safely be embedded in the browser) and forwards each
 * event to the browser as `data: <json>\n\n`. EventSource in the browser
 * auto-reconnects whenever this stream closes.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const assistantId = searchParams.get("assistantId");
    if (!assistantId) {
        return new Response("Missing assistantId", { status: 400 });
    }

    const assistant = await getAssistant(assistantId);
    if (!assistant) {
        return new Response("Unknown assistant", { status: 404 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            let closed = false;
            const send = (data: object) => {
                if (closed) return;
                try {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
                    );
                } catch {
                    closed = true;
                }
            };
            const heartbeat = setInterval(() => {
                if (closed) return;
                try {
                    controller.enqueue(encoder.encode(`: keepalive\n\n`));
                } catch {
                    closed = true;
                }
            }, 15_000);
            const cleanup = () => {
                if (closed) return;
                closed = true;
                clearInterval(heartbeat);
                try {
                    controller.close();
                } catch {
                    // already closed
                }
            };

            let inboxId: string;
            try {
                const provisioned = await ensureProvisioned(assistant);
                if (!provisioned.inboxId) {
                    send({
                        type: "error",
                        message: "Inbox not provisioned",
                    });
                    cleanup();
                    return;
                }
                inboxId = provisioned.inboxId;
            } catch (err) {
                send({
                    type: "error",
                    message: err instanceof Error ? err.message : String(err),
                });
                cleanup();
                return;
            }

            const client = getAgentMail();
            let socket: Awaited<
                ReturnType<typeof client.websockets.connect>
            > | null = null;

            try {
                socket = await client.websockets.connect();
            } catch (err) {
                send({
                    type: "error",
                    message: err instanceof Error ? err.message : String(err),
                });
                cleanup();
                return;
            }

            socket.sendSubscribe({
                type: "subscribe",
                inboxIds: [inboxId],
                eventTypes: [
                    "message.received",
                    "message.received.spam",
                    "message.sent",
                    "message.delivered",
                ],
            });
            send({ type: "status", status: "live" });

            socket.on("message", (evt) => {
                send(evt as unknown as object);
            });
            socket.on("error", (err) => {
                send({ type: "error", message: err.message });
            });
            socket.on("close", () => {
                send({ type: "status", status: "closed" });
                cleanup();
            });

            req.signal.addEventListener("abort", () => {
                try {
                    socket?.close();
                } catch {
                    // already closed
                }
                cleanup();
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
