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
  }),
  match: z.object({
    name: z.string(),
    interests: z.array(z.string()),
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
  memories: z.array(z.string()),
});

function extractSourceLabel(source: unknown) {
  if (!source || typeof source !== "object") {
    return "";
  }

  if ("url" in source && typeof source.url === "string") {
    return source.url;
  }

  if ("name" in source && typeof source.name === "string") {
    return source.name;
  }

  return "";
}

export async function POST(request: Request) {
  const payload = payloadSchema.parse(await request.json());
  const transcript = payload.transcript
    .slice(-6)
    .map((entry) => `${entry.author}: ${entry.text}`)
    .join("\n");
  const prompt = `
User profile: ${payload.user.name}
User interests: ${payload.user.interests.join(", ")}
Match profile: ${payload.match.name}
Match interests: ${payload.match.interests.join(", ")}
Chosen date idea: ${payload.dateIdea.title}
Why the idea works: ${payload.dateIdea.whyItWorks}
Saved memory notes: ${payload.memories.join(" | ")}
Recent transcript:
${transcript}

Latest tagged request:
${payload.message}
`;
  const system =
    "You are Chem, the concierge inside a shared dating chat. Sound like a sharp, socially fluent friend in the room, not a support bot. Be concise, warm, and specific. Answer the tagged request directly in 2 to 5 sentences. If you suggest a plan, make it feel easy and real. If you explain the match, do it naturally, without talking about profiles, signals, memory notes, or how the system works. A little charm is good; canned enthusiasm is not. If the user is asking for a real place, current venue, availability, event, neighborhood recommendation, or anything that depends on up-to-date local information, use web search before answering and ground the answer in what you found.";

  const context = {
    route: "/api/chemistry",
    user: payload.user.name,
    match: payload.match.name,
    dateIdea: payload.dateIdea.title,
    transcriptLength: payload.transcript.length,
    taggedMessage: payload.message,
  };

  if (!process.env.OPENAI_API_KEY) {
    logAiTrace({
      agent: "Chem",
      stage: "error",
      context,
      system,
      prompt,
      error: new Error("missing_openai_api_key"),
    });
    return NextResponse.json({
      error: "Chem is unavailable because OPENAI_API_KEY is not configured.",
    }, { status: 503 });
  }

  logAiTrace({
    agent: "Chem",
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
      tools: {
        web_search: openai.tools.webSearch({
          externalWebAccess: true,
          searchContextSize: "medium",
          userLocation: {
            type: "approximate",
            city: payload.dateIdea.city,
          },
        }),
      },
    });
    const output = result.text.trim();
    const sources = (result.sources ?? [])
      .map(extractSourceLabel)
      .filter(Boolean);

    logAiTrace({
      agent: "Chem",
      stage: "success",
      context: {
        ...context,
        sources,
      },
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
      agent: "Chem",
      stage: "error",
      context,
      system,
      prompt,
      error,
    });
    return NextResponse.json({
      error: "Chem could not generate a reply.",
    }, { status: 502 });
  }
}
