import OpenAI from "openai";
import type { AGUIStreamWriter } from "@/lib/agui/events";

const client = new OpenAI();

// Agent Input
export interface ArchitectAgentInput {
  systemDescription: string;
  runId: string;
  writer: AGUIStreamWriter;
}

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