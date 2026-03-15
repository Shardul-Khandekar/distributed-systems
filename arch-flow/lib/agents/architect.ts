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
}: ArchitectAgentInput): Promise<string>{

    // Signal that agent has started
    const stepId = writer.emitStepStarted(runId, "ArchitectAgent");

    // Signal that a new text message is starting, UI creates a message container tied with messageId
    const messageId = writer.emitTextStart(runId, "ArchitectAgent");

    // Stream openai response
    const stream = await client.chat.completions.create({
    model: "gpt-4o",
    stream: true,
    messages: [
      {
        role: "system",
        content: `
            You are a Senior Software Architect with 15 years of experience 
            designing large-scale distributed systems. Given a system description, produce 
            a clear high-level architecture covering:
            1. Core components and responsibilities
            2. Data flow between components
            3. Technology recommendations with brief rationale
            4. Scalability approach
            5. Key risks to address

            Be specific and practical. Use clear sections and bullet points.`,
      },
      {
        role: "user",
        content: `Design the architecture for: ${systemDescription}`,
      },
    ],
  });

  // Translate OpenAI token stream into AG-UI chunk
  let fullText = "";

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    // delta is undefined for first and last chunks
    if (delta) {
      fullText += delta;
      writer.emitTextChunk(runId, messageId, delta);
    }
  }

    // Signal that the text message is done, UI can stop waiting for more tokens
    // TEXT_MESSAGE_END tells the UI to stop the blinking cursor.
    // STEP_FINISHED tells the UI this agent is done — mark it complete.
    writer.emitTextEnd(runId, messageId);
    writer.emitStepFinished(runId, stepId);

    return fullText;
}