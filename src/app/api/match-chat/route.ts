import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAiTrace } from "@/lib/ai-trace";

export const maxDuration = 60;

const payloadSchema = z.object({
  user: z.object({
    name: z.string(),
    interests: z.array(z.string()),
    vibe: z.string(),
    bio: z.string(),
  }),
  match: z.object({
    id: z.string().optional(),
    name: z.string(),
    interests: z.array(z.string()),
    vibe: z.string(),
    bio: z.string(),
    styleHint: z.string().optional(),
  }),
  dateIdea: z.object({
    title: z.string(),
    city: z.string(),
    category: z.string(),
    whyItWorks: z.string(),
    tags: z.array(z.string()),
  }),
  transcript: z.array(
    z.object({
      author: z.enum(["you", "match", "agent"]),
      text: z.string(),
      createdAt: z.string(),
      id: z.string(),
    }),
  ),
  message: z.string(),
});

export async function POST(request: Request) {
  const payload = payloadSchema.parse(await request.json());
  const system = `You are ${payload.match.name}, a believable dating-app user in a chat room started by Chem. Stay consistent with this persona:

Vibe: ${payload.match.vibe}
Bio: ${payload.match.bio}
Interests: ${payload.match.interests.join(", ")}
Texting style: ${payload.match.styleHint || "Natural, human, and specific."}

Reply like a real person. Keep responses to 1 to 4 sentences most of the time. Be warm, specific, conversational, and actually responsive.

Important:
- Have an actual point of view.
- Do not sound endlessly agreeable or over-polished.
- Do not recap the whole premise unless it is natural.
- Let the personality show in rhythm, humor, and what details this person notices.
- Avoid generic dating-app filler like "that sounds fun" unless you add something specific.
- Actually answer what the other person just said.
- If they asked a question, answer it clearly before adding anything else.
- Use the transcript to maintain continuity.
- Only bring up details that logically follow from your persona, the date idea, or the conversation so far.
- Prefer one concrete reaction, one specific detail, and sometimes one question back.
- It is fine to tease lightly, be a little dry, or disagree gently if that fits the persona.
- Do not send random standalone lines that could fit any conversation.`;

  if (!process.env.OPENAI_API_KEY) {
    logAiTrace({
      agent: payload.match.name,
      stage: "error",
      context: {
        route: "/api/match-chat",
        user: payload.user.name,
        match: payload.match.name,
        dateIdea: payload.dateIdea.title,
        transcriptLength: payload.transcript.length,
        latestMessage: payload.message,
      },
      system,
      prompt: payload.message,
      error: new Error("missing_openai_api_key"),
    });
    return NextResponse.json({
      error: "Match chat is unavailable because OPENAI_API_KEY is not configured.",
    }, { status: 503 });
  }

  const transcript = payload.transcript
    .slice(-8)
    .map((entry) => `${entry.author}: ${entry.text}`)
    .join("\n");
  const prompt = `Date idea: ${payload.dateIdea.title}
Why it works: ${payload.dateIdea.whyItWorks}
Other person: ${payload.user.name}
Other person's vibe: ${payload.user.vibe}
Other person's bio: ${payload.user.bio}
Other person's interests: ${payload.user.interests.join(", ")}
Recent transcript:
${transcript}

Latest message to respond to:
${payload.message}

Write the next message ${payload.match.name} would actually send in this conversation.`;
  const context = {
    route: "/api/match-chat",
    user: payload.user.name,
    match: payload.match.name,
    matchId: payload.match.id,
    dateIdea: payload.dateIdea.title,
    transcriptLength: payload.transcript.length,
    latestMessage: payload.message,
  };

  logAiTrace({
    agent: payload.match.name,
    stage: "start",
    context,
    system,
    prompt,
  });

  try {
    const result = await generateText({
      model: openai("gpt-5.4-mini"),
      system,
      prompt,
    });
    const output = result.text.trim();

    logAiTrace({
      agent: payload.match.name,
      stage: "success",
      context,
      system,
      prompt,
      output,
    });

    return NextResponse.json({
      mode: "openai" as const,
      text: output,
    });
  } catch (error) {
    logAiTrace({
      agent: payload.match.name,
      stage: "error",
      context,
      system,
      prompt,
      error,
    });
    return NextResponse.json({
      error: "The match could not generate a reply.",
    }, { status: 502 });
  }
}
