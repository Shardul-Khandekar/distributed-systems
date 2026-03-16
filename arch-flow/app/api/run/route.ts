import { NextRequest, NextResponse } from "next/server";
import { createAGUIStream, SSE_HEADERS, newRunId, newThreadId } from "@/lib/agui/events";
import { runArchitectAgent } from "@/lib/agents/architect";
import type { DesignState } from "@/types/agui";

// Never cache and always run on nodejs not on edge runtime
// Every agent run must be a fresh request, a cached response would never stream
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// In memory store for simplicity, not shared between instances, not persistent, reset on server restart
const decisionResolvers = new Map<string, (chosenOptionId: string) => void>();

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
    // One submit button click is one run
    const runId    = newRunId();
    // threadId identifies conversation thread since it could span multiple runs
    const threadId = newThreadId();

    // Fire and forget the agent, it will run independently and push events to the stream whenever it wants
    // async launches an agent without awaiting for it
    // It creates a pipe with the frontend and then agent independently pushes into that pipe whenever it has something
    // The return outside fires immediately, sending stream to frontend before the agent is even done
    (async () => {
        try {
            // Tell UI run is starting
            writer.emitRunStarted(runId, threadId);

            // Send initial state snapshot
            const initialState: DesignState = {
                phase: "designing",
                systemDescription,
                agentOutputs: {},
                pendingDecision:   null,
                decisions:         [],
            };
            writer.emitStateSnapshot(runId, initialState);

            await runArchitectAgent({
                systemDescription,
                runId,
                writer,
                waitForDecision: (decisionId: string) => {
                return new Promise<string>((resolve) => {
                    decisionResolvers.set(decisionId, resolve);
                });
                },
            });

            writer.emitStateDelta(runId, [
                { op: "replace", path: "/phase", value: "done" },
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

// Event Sequence
// writer.emitRunStarted(runId, threadId); -> Opens the stream
// writer.emitStateSnapshot(runId, initialState); -> Sends initial state to the frontend
// const output = await runArchitectAgent -> Agent does the work
// writer.emitStateDelta(runId, delta); -> Sends state updates to the frontend
// writer.emitRunFinished(runId); -> Closes the stream

// Main thread: Route called → extract body → launch async → return stream (millisenconds)
// Async thread: emitRunStarted → emitStateSnapshot → run agent → emitStateDelta (multiple times) → emitRunFinished/emitRunError