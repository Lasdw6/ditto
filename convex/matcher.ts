import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";

const matchResultSchema = z.object({
  selectedProfileUserId: z.string(),
  compatibility: z.number().int().min(68).max(98),
  rationale: z.string().min(20).max(320),
  conciergeSummary: z.string().min(20).max(320),
  agentIntro: z.string().min(20).max(320),
  firstMatchMessage: z.string().min(10).max(280),
});

const ONE_HOUR_MS = 60 * 60 * 1000;

function logAiTrace(payload: {
  agent: string;
  stage: "start" | "success" | "fallback" | "error";
  context: Record<string, unknown>;
  system?: string;
  prompt?: string;
  output?: string;
  error?: unknown;
}) {
  const safeError =
    payload.error instanceof Error
      ? {
          name: payload.error.name,
          message: payload.error.message,
          stack: payload.error.stack,
        }
      : payload.error;

  console.log("[AI_TRACE]", {
    timestamp: new Date().toISOString(),
    ...payload,
    error: safeError,
  });
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 2);
}

function collectSharedThemes(userInterests: string[], candidateInterests: string[]) {
  const exact = new Set<string>();
  const thematic = new Set<string>();

  for (const userInterest of userInterests) {
    const userLower = userInterest.toLowerCase();
    const userTokens = tokenize(userInterest);

    for (const candidateInterest of candidateInterests) {
      const candidateLower = candidateInterest.toLowerCase();
      const candidateTokens = tokenize(candidateInterest);

      if (
        userLower === candidateLower ||
        userLower.includes(candidateLower) ||
        candidateLower.includes(userLower)
      ) {
        exact.add(candidateInterest);
        continue;
      }

      for (const token of userTokens) {
        if (candidateTokens.includes(token)) {
          thematic.add(token);
        }
      }
    }
  }

  return {
    exact: Array.from(exact),
    thematic: Array.from(thematic),
  };
}

function scoreCandidate(
  user: {
    interests: string[];
    chemistryNotes: string[];
    location: string;
    gender?: string;
    interestedIn?: string[];
  },
  candidate: {
    userId: string;
    interests: string[];
    chemistryNotes: string[];
    location: string;
    gender?: string;
    interestedIn?: string[];
    vibe: string;
    bio: string;
  },
  dateIdea: {
    category: string;
    energy: string;
    tags: string[];
    whyItWorks: string;
  },
  swipeNote?: string,
) {
  const note = (swipeNote ?? "").toLowerCase();
  const memoryBlob = user.chemistryNotes.join(" ").toLowerCase();
  const sharedThemes = collectSharedThemes(user.interests, candidate.interests);
  const sharedInterests = [...sharedThemes.exact, ...sharedThemes.thematic];

  let score = sharedThemes.exact.length * 14 + sharedThemes.thematic.length * 8;

  for (const tag of dateIdea.tags) {
    const loweredTag = tag.toLowerCase();
    if (candidate.interests.some((interest) => interest.toLowerCase().includes(loweredTag))) {
      score += 10;
    }
    if (candidate.chemistryNotes.some((memory) => memory.toLowerCase().includes(loweredTag))) {
      score += 8;
    }
    if (memoryBlob.includes(loweredTag)) {
      score += 8;
    }
    if (note.includes(loweredTag)) {
      score += 10;
    }
  }

  if (candidate.location === user.location) {
    score += 5;
  }

  const userInterestedIn = (user.interestedIn ?? []).map((value) => value.toLowerCase());
  const candidateInterestedIn = (candidate.interestedIn ?? []).map((value) => value.toLowerCase());
  const candidateGender = candidate.gender?.toLowerCase();
  const userGender = user.gender?.toLowerCase();

  if (candidateGender && userInterestedIn.includes(candidateGender)) {
    score += 10;
  }

  if (userGender && candidateInterestedIn.includes(userGender)) {
    score += 10;
  }

  if (candidate.vibe.toLowerCase().includes(dateIdea.energy.toLowerCase())) {
    score += 3;
  }

  if (candidate.bio.toLowerCase().includes(dateIdea.category.toLowerCase())) {
    score += 4;
  }

  return { score, sharedInterests };
}

function buildFallbackMatch(job: {
  user: {
    name: string;
    location: string;
    interests: string[];
    chemistryNotes: string[];
    gender?: string;
    interestedIn?: string[];
  };
  dateIdea: {
    title: string;
    category: string;
    energy: string;
    whyItWorks: string;
    tags: string[];
  };
  swipeNote?: string;
  candidates: Array<{
    userId: string;
    name: string;
    interests: string[];
    chemistryNotes: string[];
    location: string;
    gender?: string;
    interestedIn?: string[];
    vibe: string;
    bio: string;
  }>;
}) {
  const ranked = job.candidates
    .map((candidate) => ({
      candidate,
      ...scoreCandidate(job.user, candidate, job.dateIdea, job.swipeNote),
    }))
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0];

  if (!winner) {
    return null;
  }

  const shared = winner.sharedInterests.slice(0, 3).join(", ");

  return {
    selectedProfileUserId: winner.candidate.userId,
    compatibility: Math.max(72, Math.min(96, 72 + winner.score)),
    rationale: `${winner.candidate.name} feels right here. The overlap is in ${shared || "pace, tone, and the kind of night that lets conversation happen without forcing it"}.`,
    conciergeSummary: `I liked this pairing for ${job.dateIdea.title.toLowerCase()}. It feels easy, a little charged, and like the date would give the conversation something real to build on.`,
    agentIntro: `I put you two together for ${job.dateIdea.title.toLowerCase()}. It feels like the kind of plan where the room does a little work for you and the conversation can open up on its own.`,
    firstMatchMessage: `${job.dateIdea.title} honestly sounds like a strong first date. I like plans that give us something real to react to right away.`,
  };
}

export const getPendingLikes = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const votes = await ctx.db.query("dateVotes").collect();
    const now = Date.now();
    const pendingLikes = votes
      .filter((vote) => vote.decision === "like" && vote.processedAt === undefined)
      .sort((a, b) => a.votedAt - b.votedAt)
      .slice(0, limit ?? 12);

    const profiles = await ctx.db.query("profiles").collect();
    const matches = await ctx.db.query("matches").collect();
    const usersWithLiveRooms = new Set(
      matches
        .filter((match) => match.status !== "archived")
        .map((match) => match.userId),
    );
    const usersOnCooldown = new Set(
      matches
        .filter((match) => now - match.createdAt < ONE_HOUR_MS)
        .map((match) => match.userId),
    );
    const firstPendingLikeByUser = new Map<string, (typeof pendingLikes)[number]>();

    for (const vote of pendingLikes) {
      if (!firstPendingLikeByUser.has(vote.userId)) {
        firstPendingLikeByUser.set(vote.userId, vote);
      }
    }

    return (
      await Promise.all(
        Array.from(firstPendingLikeByUser.values()).map(async (vote) => {
          if (usersWithLiveRooms.has(vote.userId) || usersOnCooldown.has(vote.userId)) {
            return null;
          }

          const user = profiles.find((profile) => profile.userId === vote.userId);
          const dateIdea = await ctx.db.get(vote.dateIdeaId);
          const memories = await ctx.db
            .query("profileMemories")
            .withIndex("by_user", (q) => q.eq("userId", vote.userId))
            .collect();
          const existingMatches = matches.filter((match) => match.userId === vote.userId);
          const excluded = new Set(existingMatches.map((match) => match.matchUserId));

          if (!user || !dateIdea) {
            return null;
          }

          const candidates = profiles.filter(
            (profile) =>
              profile.userId !== vote.userId && !excluded.has(profile.userId),
          );

          return {
            voteId: vote._id,
            voteNote: vote.note,
            user: {
              userId: user.userId,
              name: user.name,
              age: user.age,
              location: user.location,
              gender: user.gender,
              interestedIn: user.interestedIn,
              pronouns: user.pronouns,
              occupation: user.occupation,
              vibe: user.vibe,
              bio: user.bio,
              interests: user.interests,
              chemistryNotes: user.chemistryNotes,
              avatar: user.avatar,
            },
            dateIdea,
            memories: memories.map((entry) => entry.memory),
            candidates: candidates.map((candidate) => ({
              userId: candidate.userId,
              name: candidate.name,
              age: candidate.age,
              location: candidate.location,
              gender: candidate.gender,
              interestedIn: candidate.interestedIn,
              pronouns: candidate.pronouns,
              occupation: candidate.occupation,
              vibe: candidate.vibe,
              bio: candidate.bio,
              interests: candidate.interests,
              chemistryNotes: candidate.chemistryNotes,
              avatar: candidate.avatar,
            })),
          };
        }),
      )
    ).filter((job): job is NonNullable<typeof job> => job !== null);
  },
});

export const markVoteProcessed = internalMutation({
  args: {
    voteId: v.id("dateVotes"),
    matchId: v.optional(v.id("matches")),
  },
  handler: async (ctx, { voteId, matchId }) => {
    await ctx.db.patch(voteId, {
      processedAt: Date.now(),
      matchId,
    });
  },
});

export const runPendingLikes = internalAction({
  args: {},
  handler: async (ctx) => {
    if (!process.env.OPENAI_API_KEY) {
      logAiTrace({
        agent: "Chem",
        stage: "error",
        context: {
          source: "convex_cron_matcher",
        },
        error: new Error("missing_openai_api_key"),
      });
      return { processed: 0, created: 0 };
    }

    const jobs = await ctx.runQuery(internal.matcher.getPendingLikes, {
      limit: 12,
    });
    const reservedByUser = new Map<string, Set<string>>();

    let processed = 0;
    let created = 0;

    for (const job of jobs) {
      const reserved = reservedByUser.get(job.user.userId) ?? new Set<string>();
      const availableCandidates = job.candidates.filter(
        (candidate) => !reserved.has(candidate.userId),
      );

      if (!availableCandidates.length) {
        await ctx.runMutation(internal.matcher.markVoteProcessed, {
          voteId: job.voteId,
        });
        processed += 1;
        continue;
      }

      const system =
        "You are Chem, the concierge and matchmaker for Your Chemical Romance. You choose exactly one candidate using only the provided inputs, then open the room in the same voice you would later use in chat. Do not invent facts. Write like a smart human host introducing two people who might actually hit it off. Keep it conversational, confident, and socially fluent. Never mention profile data, memories, algorithms, signals, or how the system works.";
      const prompt = `Current user:
Name: ${job.user.name}
Age: ${job.user.age}
Location: ${job.user.location}
Pronouns: ${job.user.pronouns}
Occupation: ${job.user.occupation}
Vibe: ${job.user.vibe}
Bio: ${job.user.bio}
Interests: ${job.user.interests.join(", ")}
Durable memories: ${(job.memories.length ? job.memories : job.user.chemistryNotes).join(" | ")}
Swipe note: ${job.voteNote?.trim() || "none"}

Chosen date idea:
${job.dateIdea.title} in ${job.dateIdea.city}
Category: ${job.dateIdea.category}
Energy: ${job.dateIdea.energy}
Budget: ${job.dateIdea.budget}
Intro: ${job.dateIdea.intro}
Why it works: ${job.dateIdea.whyItWorks}
Tags: ${job.dateIdea.tags.join(", ")}

Candidates:
${availableCandidates
  .map(
    (candidate) =>
      `${candidate.userId}: ${candidate.name}, ${candidate.age}, ${candidate.location}. Vibe: ${candidate.vibe}. Bio: ${candidate.bio}. Interests: ${candidate.interests.join(", ")}. Memory notes: ${candidate.chemistryNotes.join(" | ")}`,
  )
  .join("\n\n")}

Return the single best match.
- rationale: one short natural read on why this pairing works
- conciergeSummary: the room-opening blurb
- agentIntro: Chem's first actual message in the chat
- firstMatchMessage: what the matched person would plausibly say first

Avoid technical phrasing like "based on your profiles", "memory notes", "signals", or "data". Avoid stiff lines like "this match came together around". Prefer language that sounds like an intuitive social read.`;
      const context = {
        source: "convex_cron_matcher",
        userId: job.user.userId,
        user: job.user.name,
        dateIdea: job.dateIdea.title,
        voteId: job.voteId,
        candidateCount: availableCandidates.length,
      };

      logAiTrace({
        agent: "Chem",
        stage: "start",
        context,
        system,
        prompt,
      });

      let decision: z.infer<typeof matchResultSchema>;

      try {
        const generated = await Promise.race([
          generateObject({
            model: openai("gpt-5.4-mini"),
            schema: matchResultSchema,
            system,
            prompt,
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("matcher_timeout")), 8000);
          }),
        ]);

        decision = generated.object;
        logAiTrace({
          agent: "Chem",
          stage: "success",
          context: {
            ...context,
            selectedProfileUserId: decision.selectedProfileUserId,
            compatibility: decision.compatibility,
          },
          system,
          prompt,
          output: JSON.stringify(decision),
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
        continue;
      }

      const chosen = availableCandidates.find(
        (candidate) => candidate.userId === decision.selectedProfileUserId,
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
        continue;
      }

      const createdMatch = await ctx.runMutation(internal.matches.createFromAgent, {
        userId: job.user.userId,
        matchUserId: chosen.userId,
        dateIdeaId: job.dateIdea._id,
        compatibility: decision.compatibility,
        rationale: decision.rationale,
        conciergeSummary: decision.conciergeSummary,
        agentIntro: decision.agentIntro,
        firstMatchMessage: decision.firstMatchMessage,
      });

      if (createdMatch.matchId) {
        if (!reservedByUser.has(job.user.userId)) {
          reservedByUser.set(job.user.userId, new Set<string>());
        }
        reservedByUser.get(job.user.userId)?.add(chosen.userId);
      }

      await ctx.runMutation(internal.matcher.markVoteProcessed, {
        voteId: job.voteId,
        matchId: createdMatch.matchId ?? undefined,
      });

      processed += 1;
      if (createdMatch.matchId) {
        created += 1;
      }
    }

    return { processed, created };
  },
});
