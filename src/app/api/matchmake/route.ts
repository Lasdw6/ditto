import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAiTrace } from "@/lib/ai-trace";
import { createMessage } from "@/lib/chemistry";
import type { LiveMatch, Profile } from "@/lib/types";

export const maxDuration = 60;

const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  location: z.string(),
  gender: z.string(),
  interestedIn: z.array(z.string()),
  pronouns: z.string(),
  occupation: z.string(),
  vibe: z.string(),
  bio: z.string(),
  interests: z.array(z.string()),
  chemistryNotes: z.array(z.string()),
  avatar: z.string(),
});

const payloadSchema = z.object({
  user: profileSchema,
  dateIdea: z.object({
    id: z.string(),
    title: z.string(),
    city: z.string(),
    category: z.string(),
    image: z.string(),
    energy: z.enum(["Low", "Medium", "High"]),
    budget: z.string(),
    intro: z.string(),
    whyItWorks: z.string(),
    tags: z.array(z.string()),
  }),
  candidates: z.array(profileSchema),
  memories: z.array(z.string()),
  swipeNote: z.string().optional(),
  excludedProfileIds: z.array(z.string()).optional(),
});

const matchResultSchema = z.object({
  selectedProfileId: z.string(),
  compatibility: z.number().int().min(68).max(98),
  rationale: z.string().min(20).max(320),
  starter: z.string().min(20).max(320),
  agentIntro: z.string().min(20).max(320),
  firstMatchMessage: z.string().min(10).max(280),
  venueSuggestions: z.array(z.string()).min(2).max(3),
});

export async function POST(request: Request) {
  const payload = payloadSchema.parse(await request.json());
  const excluded = new Set(payload.excludedProfileIds ?? []);
  const viableCandidates = payload.candidates.filter(
    (candidate) => candidate.id !== payload.user.id && !excluded.has(candidate.id),
  );

  if (!viableCandidates.length) {
    return NextResponse.json({
      mode: "demo" as const,
      match: null,
    });
  }

  const candidateSummary = viableCandidates
    .map(
      (candidate) =>
        `${candidate.id}: ${candidate.name}, ${candidate.age}, ${candidate.location}. Vibe: ${candidate.vibe}. Bio: ${candidate.bio}. Interests: ${candidate.interests.join(", ")}. Memory notes: ${candidate.chemistryNotes.join(" | ")}`,
    )
    .join("\n\n");

  const system =
    "You are Chem, the concierge and matchmaker for Your Chemical Romance. Choose exactly one candidate using only the provided inputs, then open the room in the same voice you would later use in chat. Do not invent facts. Prefer the candidate whose energy, interests, and overall fit make the chosen first date feel easy and exciting. Write like a smart human host introducing two people who might actually hit it off. Never mention profile data, memories, signals, algorithms, or how the system works. The writing should feel conversational, confident, and socially fluent.";
  const prompt = `Current user:
Name: ${payload.user.name}
Age: ${payload.user.age}
Location: ${payload.user.location}
Pronouns: ${payload.user.pronouns}
Occupation: ${payload.user.occupation}
Vibe: ${payload.user.vibe}
Bio: ${payload.user.bio}
Interests: ${payload.user.interests.join(", ")}
Profile memories: ${payload.memories.join(" | ")}
Swipe note: ${payload.swipeNote?.trim() || "none"}

Chosen date idea:
${payload.dateIdea.title} in ${payload.dateIdea.city}
Category: ${payload.dateIdea.category}
Energy: ${payload.dateIdea.energy}
Budget: ${payload.dateIdea.budget}
Intro: ${payload.dateIdea.intro}
Why it works: ${payload.dateIdea.whyItWorks}
Tags: ${payload.dateIdea.tags.join(", ")}

Candidates:
${candidateSummary}

Return the single best match.
- rationale: one short internal-sounding read on why this pairing works, but still natural
- starter: the room-opening blurb, like Chem setting the scene
- agentIntro: Chem's first actual chat message
- firstMatchMessage: what the matched person would plausibly say back first

Avoid technical phrasing like "based on your profiles", "memory notes", "signals", or "data". Avoid stiff lines like "this match came together around". Prefer language that sounds like an intuitive social read.`;
  const context = {
    route: "/api/matchmake",
    user: payload.user.name,
    userId: payload.user.id,
    dateIdea: payload.dateIdea.title,
    candidateCount: viableCandidates.length,
    excludedProfileIds: payload.excludedProfileIds ?? [],
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
      error: "Matchmaking is unavailable because OPENAI_API_KEY is not configured.",
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
    const result = await Promise.race([
      generateObject({
        model: openai("gpt-5.4-mini"),
        schema: matchResultSchema,
        system,
        prompt,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("matchmake_timeout")), 8000);
      }),
    ]);

    const chosen = viableCandidates.find(
      (candidate) => candidate.id === result.object.selectedProfileId,
    );

    if (!chosen) {
      logAiTrace({
        agent: "Chem",
        stage: "error",
        context,
        system,
        prompt,
        error: new Error("selected_profile_not_found"),
      });
      return NextResponse.json({
        error: "Chem returned an invalid match candidate.",
      }, { status: 502 });
    }

    const liveMatch: LiveMatch = {
      id: `match-${payload.dateIdea.id}-${chosen.id}-${Date.now()}`,
      profile: chosen as Profile,
      dateIdea: payload.dateIdea,
      compatibility: result.object.compatibility,
      rationale: result.object.rationale,
      starter: result.object.starter,
      venueSuggestions: result.object.venueSuggestions,
      transcript: [
        createMessage("agent", result.object.agentIntro),
        createMessage("match", result.object.firstMatchMessage),
      ],
    };

    logAiTrace({
      agent: "Chem",
      stage: "success",
      context: {
        ...context,
        selectedProfileId: chosen.id,
        compatibility: result.object.compatibility,
      },
      system,
      prompt,
      output: JSON.stringify(result.object),
    });

    return NextResponse.json({
      mode: "openai" as const,
      match: liveMatch,
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
      error: "Chem could not generate a match.",
    }, { status: 502 });
  }
}
