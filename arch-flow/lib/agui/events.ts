import { v4 as uuid } from "uuid";
import type {
  AGUIEvent,
  DesignState,
  JsonPatchOp,
} from "@/types/agui";

// SSE Header
export const SSE_HEADERS: HeadersInit = {
  "Content-Type":      "text/event-stream",
  "Cache-Control":     "no-cache, no-transform",
  "Connection":        "keep-alive",
  "X-Accel-Buffering": "no",
};

// SSE Writer

// SSE wire format
// data: {"type":"TEXT_MESSAGE_CHUNK","delta":"Hello",...}\n\n
// The double newline \n\n is the SSE spec's event separator.
// Without it the browser doesn't know where one event ends.

export class AGUIStreamWriter {
  private encoder = new TextEncoder();
  private controller: ReadableStreamDefaultController<Uint8Array>;

  constructor(controller: ReadableStreamDefaultController<Uint8Array>) {
    this.controller = controller;
  }

  private emit(event: AGUIEvent): void {
    const line = `data: ${JSON.stringify(event)}\n\n`;
    this.controller.enqueue(this.encoder.encode(line));
  }

  // Lifecycle Events
  emitRunStarted(runId: string, threadId: string): void {
    this.emit({ type: "RUN_STARTED", runId, threadId, timestamp: Date.now() });
  }

  emitRunFinished(runId: string): void {
    this.emit({ type: "RUN_FINISHED", runId, timestamp: Date.now() });
  }

  emitRunError(runId: string, message: string): void {
    this.emit({ type: "RUN_ERROR", runId, message, timestamp: Date.now() });
  }