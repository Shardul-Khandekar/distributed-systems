import OpenAI from "openai";
import type { AGUIStreamWriter } from "@/lib/agui/events";
import { v4 as uuid } from "uuid";

const client = new OpenAI();

// Agent Input
export interface ArchitectAgentInput {
  systemDescription: string;
  runId: string;
  writer: AGUIStreamWriter;
  waitForDecision: (decisionId: string) => Promise<string>;
}

const pre_hitl_prompt = 
`
  You are a Senior Software Architect designing large-scale systems.
  Analyze the given system and begin designing its architecture. Cover:
    - Core components and responsibilities  
    - Data flow between components
    - Initial technology choices
  
    At exactly ONE point where you face a genuine architectural fork that would significantly change the rest of the design, stop and output this exact block:

    [DECISION]
    {
      "question": "one clear question for the human",
      "context": "one sentence on why this matters for the design",
      "options": [
        { "id": "option_a", "label": "Short label", "description": "Trade-off in one sentence" },
        { "id": "option_b", "label": "Short label", "description": "Trade-off in one sentence" }
      ]
    }
    [/DECISION]

  After the block, stop. Do not write anything else.`;

const post_hitl_prompt =
`
  You are a Senior Software Architect.
  Continue and complete a system design based on a decision the human just made.
  Cover: scalability approach, failure handling, key risks, and final recommendations.
  Be specific — the human's choice should be visible throughout your design.
`

// Agent
// OpenAI token stream  →  AG-UI event stream  →  live browser UI
export async function runArchitectAgent({
  systemDescription,
  runId,
  writer,
  waitForDecision,
}: ArchitectAgentInput): Promise<void>{

    // Signal that agent has started
    const stepId = writer.emitStepStarted(runId, "ArchitectAgent");

    // Signal that a new text message is starting, UI creates a message container tied with messageId
    const messageId = writer.emitTextStart(runId, "ArchitectAgent");

    // Stream openai response
    const preHITLStream = await client.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [
        { role: "system", content: pre_hitl_prompt },
        { role: "user",   content: `Design the architecture for: ${systemDescription}` },
      ],
    });

    let pre_hitl_text = ""; // Full text before the decision point
    let buffer       = "";  // Tokens to emit yet
    let inDecision   = false;
    let decisionRaw  = "";  // raw json inside [DECISION]...[/DECISION]

    for await (const chunk of preHITLStream) {
      
      const delta = chunk.choices[0]?.delta?.content;
      if (!delta) continue;

      buffer += delta;
      if (!inDecision) {
        
        const markerStart = buffer.indexOf("[DECISION]");
        if (markerStart !== -1) {
          // Emit text up to the decision point
          const safeText = buffer.slice(0, markerStart);
          if (safeText) {
            pre_hitl_text += safeText;
            writer.emitTextChunk(runId, messageId, safeText);
          }

          // Switch to decision mode
          inDecision = true;
          buffer = buffer.slice(markerStart + "[DECISION]".length);
        } else {
          // The tail stays in the buffer in case the marker starts at the end of the chunk
          const safeLength = Math.max(0, buffer.length - "[DECISION]".length);
          if (safeLength > 0) {
            const safeText = buffer.slice(0, safeLength);
            pre_hitl_text += safeText;
            writer.emitTextChunk(runId, messageId, safeText);
            buffer = buffer.slice(safeLength);
          }
        }
      } else {
        // Inside the [DECISION] .. [/DECISION] block, accumulate until we see the closing marker
        const markerEnd = buffer.indexOf("[/DECISION]");
        if (markerEnd !== -1) {
          decisionRaw = buffer.slice(0, markerEnd);
          break;
        }
      }
    }

    // Close pre-HITL message
    writer.emitTextEnd(runId, messageId);

    // Parse decision
    const decisionId = uuid();
    const parsed     = JSON.parse(decisionRaw.trim());
    const decision   = { id: decisionId, ...parsed };

    // Update shared state so that the UI shows a decision card
      writer.emitStateDelta(runId, [
        { op: "replace", path: "/phase",           value: "awaiting_decision" },
        { op: "replace", path: "/pendingDecision", value: decision },
    ]);

    writer.emitHITLRequested(runId, decision);

    // The stream is open with the browser connected
    // The agent is waiting for a promise that resolves when a POST call to /api/run/resume happens

    const chosenOptionId = await waitForDecision(decisionId);
    const chosenOption = decision.options.find(
      (o: { id: string; label: string }) => o.id === chosenOptionId
    );

    // After decision update state so that UI clears the card
    writer.emitStateDelta(runId, [
      { op: "replace", path: "/phase",           value: "designing" },
      { op: "replace", path: "/pendingDecision", value: null },
      { op: "add",     path: "/decisions/-",     value: {
          decisionId,
          question:    decision.question,
          chosenLabel: chosenOption?.label ?? chosenOptionId,
        }
      },
    ]);

    // Continue the stream with the post-HITL prompt that includes the human's decision
    const postMessageId = writer.emitTextStart(runId, "ArchitectAgent");

    const postHITLStream = await client.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [
        { role: "system", content: post_hitl_prompt },
        {
          role: "user",
          content: `System: ${systemDescription}

          Architecture designed so far:
          ${pre_hitl_text}

          Decision asked: "${decision.question}"
          Human chose: "${chosenOption?.label}" — ${chosenOption?.description}

          Complete the architecture from here, incorporating this choice throughout.`,
        },
      ],
    });

    for await (const chunk of postHITLStream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        writer.emitTextChunk(runId, postMessageId, delta);
      }
    }

    // Signal that the text message is done, UI can stop waiting for more tokens
    // TEXT_MESSAGE_END tells the UI to stop the blinking cursor.
    // STEP_FINISHED tells the UI this agent is done — mark it complete.
    writer.emitTextEnd(runId, messageId);
    writer.emitStepFinished(runId, stepId);
}