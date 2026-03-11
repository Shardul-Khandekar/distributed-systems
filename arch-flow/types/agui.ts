// Event Types

export type AGUIEventType =
    // Run lifecycle -> A single end to end run for a user request
    | "RUN_STARTED"
    | "RUN_FINISHED"
    | "RUN_ERROR"

    // Steps lifecycle -> A single agents tuen inside a run
    | "STEP_STARTED"
    | "STEP_FINISHED"

    // Text streaming -> How agent sends words to the UI, token by token
    | "TEXT_MESSAGE_START"
    | "TEXT_MESSAGE_CHUNK"
    | "TEXT_MESSAGE_END"

    // State -> Shared memory where all agents can read and write information
    | "STATE_SNAPSHOT"
    | "STATE_DELTA";


// Every single AG-UI event has three fields, no expections
// Frontend uses runId to know which run this event belongs to
interface BaseEvent {
  type: AGUIEventType;
  runId: string;
  timestamp: number;
}

