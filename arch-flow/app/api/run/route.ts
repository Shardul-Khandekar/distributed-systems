import { NextRequest, NextResponse } from "next/server";
import { createAGUIStream, SSE_HEADERS, newRunId, newThreadId } from "@/lib/agui/events";
import { runArchitectAgent } from "@/lib/agents/architect";
import type { DesignState } from "@/types/agui";

// Never cache and always run on nodejs not on edge runtime
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {

    // The frontend will POST { systemDescription: "..." } to this endpoint.
    let systemDescription: string;

    try {
        const body = await req.json();
        systemDescription = body.systemDescription?.trim();
        if (!systemDescription) throw new Error();
    } catch {
        return NextResponse.json(
        { error: "Body must be { systemDescription: string }" },
        { status: 400 }
        );
    }

    // Create AG-UI stream
    // stream  → goes to the browser
    // writer  → goes to the agents
    // These two are created together because the writer holds a reference to the stream's internal controller — they can't exist independently.
    const { stream, writer } = createAGUIStream();
    const runId    = newRunId();
    const threadId = newThreadId();

    // Fire and forget the agent, it will run independently and push events to the stream whenever it wants
    (async () => {
        try {
            // Tell UI run is starting
            writer.emitRunStarted(runId, threadId);

            // Send initial state snapshot
            const initialState: DesignState = {
                phase: "designing",
                systemDescription,
                agentOutputs: {},
            };
            writer.emitStateSnapshot(runId, initialState);

            const output = await runArchitectAgent({
                systemDescription,
                runId,
                writer,
            });

            writer.emitStateDelta(runId, [
                { op: "add",     path: "/agentOutputs/architect", value: output },
                { op: "replace", path: "/phase",                  value: "done" },
            ]);
            
            writer.emitRunFinished(runId);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            writer.emitRunError(runId, message);
        } finally {
            writer.close();
        }
    })();

    return new Response(stream, { headers: SSE_HEADERS });
}