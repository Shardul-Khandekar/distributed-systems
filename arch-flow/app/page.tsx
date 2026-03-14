// use client means that the file runs in the browser, not on the server
"use client";

import { useState, useCallback } from "react";
import type { AGUIEvent, DesignState } from "@/types/agui";

interface AgentMessage {
  agentName: string;
  text: string;       // built up chunk by chunk as TEXT_MESSAGE_CHUNKs arrive
  done: boolean;      // flips to true on TEXT_MESSAGE_END
}

type RunStatus = "idle" | "running" | "done" | "error";


export default function Page() {

    const [description, setDescription]     = useState("");
    const [status, setStatus]               = useState<RunStatus>("idle");
    const [state, setState]                 = useState<DesignState | null>(null);
    const [messages, setMessages]           = useState<Record<string, AgentMessage>>({});
    const [eventLog, setEventLog]           = useState<AGUIEvent[]>([]);
    const [activeTab, setActiveTab]         = useState<"output" | "events">("output");

    // Stream reader
    // POST /api/run, for each event that arrives, it updates the relevant piece of UI
    const handleRun = useCallback(async () => {

        // Defesive check to check if description is empty or whitespace or if agent is already running
        if (!description.trim() || status === "running") return;

        // Reset everything before starting a new run
        setStatus("running");
        setMessages({});
        setEventLog([]);
        setState(null);

        try {
            const res = await fetch("/api/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ systemDescription: description }),
            });
            
            // res.body is ReadableStream not a string, json but a continuous flow of raw binary data
            const body = res.body;
            if (!body) throw new Error("No stream in response");

            // Set up the stream reader
            // TextDecoder converts the raw bytes into strings
            // ReadableStream doesn't give data by default, reader.read() is used to fetch the next available chunk
            const reader  = body.getReader();
            // Decoder convers Unit8Array [72, 101, 108, 108, 111] to "Hello"
            const decoder = new TextDecoder();
            let   buffer  = "";

            while (true) {
                // reader.read() returns a promise that resolves to an object { done: boolean, value: Uint8Array }
                const { done, value } = await reader.read();
                if (done) break;

                // Without { stream: true } the decoder would flush its internal state after each chunk, which can corrupt multi-byte characters
                buffer += decoder.decode(value, { stream: true });

                // SSE events are separated by \n\n — split on that boundary.
                // The last element may be an incomplete event, so we keep it
                // in the buffer and prepend it to the next read.
                const parts = buffer.split("\n\n");
                // For streaming the last element is always incomplete fragment, so the chunk hasn't received closing \n\n yet
                buffer = parts.pop() ?? "";

                // Sample parts -> parts  → ['data: {"type":"RUN_STARTED"}', 'data: {"type":"TEXT_MESSAGE"}']
                for (const part of parts) {
                    const line = part.trim();
                    if (!line.startsWith("data: ")) continue;
                    
                    // Parse the JSON payload after "data: "
                    const event: AGUIEvent = JSON.parse(line.slice(6));

                    setEventLog(prev => [...prev, event]);

                    // Handle different event types
                    switch (event.type) {
                        case "STATE_SNAPSHOT":
                            setState(event.snapshot);
                            break;
                        case "STATE_DELTA":
                            setState(prev => {
                                if (!prev) return prev;
                                const next = { ...prev };
                                for (const op of event.delta) {
                                    if (op.op === "replace" && op.path === "/phase") {
                                        next.phase = op.value as DesignState["phase"];
                                    }
                                    if (op.op === "add" && op.path.startsWith("/agentOutputs/")) {
                                        const key = op.path.split("/").pop()!;
                                        next.agentOutputs = { ...next.agentOutputs, [key]: op.value as string };
                                    }
                                }
                                return next;
                            });
                            break;
                        case "TEXT_MESSAGE_START":
                            // New agent message beginning — create an empty container for it
                            setMessages(prev => ({
                                ...prev,
                                [event.messageId]: {
                                agentName: event.agentName,
                                text: "",
                                done: false,
                                },
                            }));
                            break;
                        case "TEXT_MESSAGE_CHUNK":
                            // Token arrived — append it to the right message container
                            // This is what makes text appear word by word in the UI
                            setMessages(prev => ({
                                ...prev,
                                [event.messageId]: {
                                ...prev[event.messageId],
                                text: prev[event.messageId].text + event.delta,
                                },
                            }));
                            break;
                         case "TEXT_MESSAGE_END":
                            // Message complete — flip done flag, cursor animation stops
                            setMessages(prev => ({
                                ...prev,
                                [event.messageId]: { ...prev[event.messageId], done: true },
                            }));
                            break;

                        case "RUN_FINISHED":
                            setStatus("done");
                            break;

                        case "RUN_ERROR":
                            setStatus("error");
                            break;
                    }
                }
            }
        } catch (err) {
            console.error(err);
            setStatus("error");
        }
    }, [description, status]);

     return (

        <div className="min-h-screen bg-slate-950 text-slate-100 font-mono">

        {/* Header */}
        <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
            <div className="w-5 h-5 bg-violet-500 rounded" />
            <span className="text-sm font-medium">ArchFlow</span>
            <span className="text-xs text-slate-500 border border-slate-700 px-2 py-0.5 rounded">
            Phase 1
            </span>
        </header>

        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

            {/* Input */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
                System Description
            </p>
            {/* User types a character -> onChange fires setDescription with the new value -> react re-renders the component -> value={description} now reflects the new string */}
            <textarea
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3
                        text-sm text-slate-100 resize-none focus:outline-none
                        focus:border-violet-500 placeholder-slate-600"
                rows={3}
                placeholder="e.g. A URL shortener handling 100M requests per day…"
                value={description}
                onChange={e => setDescription(e.target.value)}
            />
            {/* The textarea is disabled if textarea is empty or only whitespace or agent is already running */}
            {/* If status is running show Designing.. else show Design System → */}
            {/* Short circuit rendering pattern: Show B only if A is true A && B */}
            <div className="mt-3 flex items-center gap-4">
                <button
                onClick={handleRun}
                disabled={!description.trim() || status === "running"}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40
                            disabled:cursor-not-allowed text-sm rounded-lg transition-colors"
                >
                {status === "running" ? "Designing…" : "Design System →"}
                </button>
                {status === "done"  && <span className="text-xs text-emerald-400">✓ Done</span>}
                {status === "error" && <span className="text-xs text-red-400">✗ Error</span>}
            </div>
            </div>

            {/* Output area — only shown once a run starts */}
            {eventLog.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

                {/* Tabs */}
                <div className="flex border-b border-slate-800">
                {(["output", "events"] as const).map(tab => (
                    <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-3 text-xs uppercase tracking-wider transition-colors ${
                        activeTab === tab
                        ? "text-violet-400 border-b-2 border-violet-500"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                    >
                    {tab === "output" ? "Output" : `Events (${eventLog.length})`}
                    </button>
                ))}
                </div>

                {/* Output Tab — renders each agent's streaming message */}
                {activeTab === "output" && (
                <div className="p-5 space-y-4">
                    {Object.entries(messages).map(([id, msg]) => (
                    <div key={id}>
                        <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-violet-500" />
                        <span className="text-xs text-violet-400 uppercase tracking-wider">
                            {msg.agentName}
                        </span>
                        {!msg.done && (
                            <span className="text-xs text-slate-500 animate-pulse">
                            streaming…
                            </span>
                        )}
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                        {msg.text}
                        {/* Blinking cursor — disappears when message is done */}
                        {!msg.done && (
                            <span className="inline-block w-2 h-4 bg-violet-400 ml-0.5 animate-pulse" />
                        )}
                        </p>
                    </div>
                    ))}
                </div>
                )}

                {/* Events Tab — raw AG-UI event log, the learning tool */}
                {activeTab === "events" && (
                <div className="p-4 max-h-96 overflow-y-auto space-y-1 text-xs">
                    <p className="text-slate-500 mb-3">
                    Raw AG-UI events as they arrived from <code className="text-violet-400">/api/run</code>
                    </p>
                    {eventLog.map((event, i) => (
                    <div key={i} className="flex gap-3 py-1 border-b border-slate-800 last:border-0">
                        <span className="text-slate-600 w-5 shrink-0">{i}</span>
                        <span className={`w-48 shrink-0 font-medium ${
                        event.type.startsWith("RUN")   ? "text-emerald-400" :
                        event.type.startsWith("STEP")  ? "text-violet-400"  :
                        event.type.startsWith("TEXT")  ? "text-sky-400"     :
                        event.type.startsWith("STATE") ? "text-amber-400"   :
                        "text-slate-400"
                        }`}>
                        {event.type}
                        </span>
                        <span className="text-slate-500 truncate">
                        {"delta" in event
                            ? `"${event.delta.slice(0, 50)}"`
                            : JSON.stringify(event).slice(0, 60)}
                        </span>
                    </div>
                    ))}
                </div>
                )}

            </div>
            )}
        </div>
        </div>
    );
}