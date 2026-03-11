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

  // Step Events
  // StepId is generated here which is used by caller
  emitStepStarted(runId: string, stepName: string): string {
    const stepId = uuid();
    this.emit({ type: "STEP_STARTED", runId, stepId, stepName, timestamp: Date.now() });
    return stepId;
  }

  emitStepFinished(runId: string, stepId: string): void {
    this.emit({ type: "STEP_FINISHED", runId, stepId, timestamp: Date.now() });
  }

  // Text Streaming Events
  // Returns messageId the agent calls emitTextStart once, then emitTextChunk for every
  // token OpenAI streams back, then emitTextEnd when done.

  emitTextStart(runId: string, agentName: string): string {
    const messageId = uuid();
    this.emit({ type: "TEXT_MESSAGE_START", runId, messageId, agentName, timestamp: Date.now() });
    return messageId;
  }

  emitTextChunk(runId: string, messageId: string, delta: string): void {
    this.emit({ type: "TEXT_MESSAGE_CHUNK", runId, messageId, delta, timestamp: Date.now() });
  }

  emitTextEnd(runId: string, messageId: string): void {
    this.emit({ type: "TEXT_MESSAGE_END", runId, messageId, timestamp: Date.now() });
  }

  // State Events
  emitStateSnapshot(runId: string, snapshot: DesignState): void {
    this.emit({ type: "STATE_SNAPSHOT", runId, snapshot, timestamp: Date.now() });
  }

  emitStateDelta(runId: string, delta: JsonPatchOp[]): void {
    this.emit({ type: "STATE_DELTA", runId, delta, timestamp: Date.now() });
  }

  // Close the stream when done otherwise the browser keeps the connection open waiting for more events indefinitely.
  close(): void {
    this.controller.close();
  }
}

export function createAGUIStream(): {
  stream: ReadableStream<Uint8Array>;
  writer: AGUIStreamWriter;
} {
  let writer!: AGUIStreamWriter;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      writer = new AGUIStreamWriter(controller);
    },
  });

  return { stream, writer };
}

// ID helpers
export const newRunId    = () => `run_${uuid()}`;
export const newThreadId = () => `thread_${uuid()}`;