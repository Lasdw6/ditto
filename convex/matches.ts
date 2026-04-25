import { v } from "convex/values";
import {
  internalMutation,
  query,
} from "./_generated/server";

const ONE_HOUR_MS = 60 * 60 * 1000;

export const listRoomsForUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, { userId }) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const rooms = await Promise.all(
      matches.map(async (match) => {
        const thread = await ctx.db
          .query("threads")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .unique();

        const dateIdea = await ctx.db.get(match.dateIdeaId);
        const matchProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", match.matchUserId))
          .unique();

        if (!thread || !dateIdea || !matchProfile) {
          return null;
        }

        const latestMessage = (
          await ctx.db
            .query("messages")
            .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
            .collect()
        )
          .sort((a, b) => b.createdAt - a.createdAt)
          .at(0);

        return {
          matchId: match._id,
          threadId: thread._id,
          compatibility: match.compatibility,
          rationale: match.rationale,
          status: match.status,
          createdAt: match.createdAt,
          conciergeSummary: thread.conciergeSummary,
          lastMessageAt: thread.lastMessageAt,
          latestMessage,
          dateIdea,
          profile: {
            id: matchProfile.userId,
            name: matchProfile.name,
            age: matchProfile.age,
            location: matchProfile.location,
            gender: matchProfile.gender ?? "",
            interestedIn: matchProfile.interestedIn ?? [],
            pronouns: matchProfile.pronouns,
            occupation: matchProfile.occupation,
            vibe: matchProfile.vibe,
            bio: matchProfile.bio,
            interests: matchProfile.interests,
            chemistryNotes: matchProfile.chemistryNotes,
            avatar: matchProfile.avatar,
          },
        };
      }),
    );

    return rooms
      .filter((room): room is NonNullable<typeof room> => room !== null)
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  },
});

export const getThreadForMatch = query({
  args: {
    userId: v.string(),
    matchId: v.id("matches"),
  },
  handler: async (ctx, { userId, matchId }) => {
    const match = await ctx.db.get(matchId);

    if (!match || match.userId !== userId) {
      return null;
    }

    const thread = await ctx.db
      .query("threads")
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .unique();

    const dateIdea = await ctx.db.get(match.dateIdeaId);
    const matchProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", match.matchUserId))
      .unique();

    if (!thread || !dateIdea || !matchProfile) {
      return null;
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
      .collect();

    return {
      matchId: match._id,
      threadId: thread._id,
      compatibility: match.compatibility,
      rationale: match.rationale,
      conciergeSummary: thread.conciergeSummary,
      dateIdea,
      profile: {
        id: matchProfile.userId,
        name: matchProfile.name,
        age: matchProfile.age,
        location: matchProfile.location,
        gender: matchProfile.gender ?? "",
        interestedIn: matchProfile.interestedIn ?? [],
        pronouns: matchProfile.pronouns,
        occupation: matchProfile.occupation,
        vibe: matchProfile.vibe,
        bio: matchProfile.bio,
        interests: matchProfile.interests,
        chemistryNotes: matchProfile.chemistryNotes,
        avatar: matchProfile.avatar,
      },
      messages: messages.sort((a, b) => a.createdAt - b.createdAt),
    };
  },
});

export const createFromAgent = internalMutation({
  args: {
    userId: v.string(),
    matchUserId: v.string(),
    dateIdeaId: v.id("dateIdeas"),
    compatibility: v.number(),
    rationale: v.string(),
    conciergeSummary: v.string(),
    agentIntro: v.string(),
    firstMatchMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existingMatches = await ctx.db
      .query("matches")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const activeRoom = existingMatches.find((match) => match.status !== "archived");

    if (activeRoom) {
      const existingThread = await ctx.db
        .query("threads")
        .withIndex("by_match", (q) => q.eq("matchId", activeRoom._id))
        .unique();

      return {
        matchId: activeRoom._id,
        threadId: existingThread?._id ?? null,
      };
    }

    const latestMatch = existingMatches.sort((a, b) => b.createdAt - a.createdAt)[0];

    if (latestMatch && now - latestMatch.createdAt < ONE_HOUR_MS) {
      return {
        matchId: null,
        threadId: null,
      };
    }

    const matchId = await ctx.db.insert("matches", {
      userId: args.userId,
      matchUserId: args.matchUserId,
      dateIdeaId: args.dateIdeaId,
      compatibility: args.compatibility,
      rationale: args.rationale,
      status: "active",
      createdAt: now,
    });

    const threadId = await ctx.db.insert("threads", {
      matchId,
      conciergeSummary: args.conciergeSummary,
      lastMessageAt: now,
    });

    await ctx.db.insert("messages", {
      threadId,
      authorType: "agent",
      body: args.agentIntro,
      mentionedAgent: false,
      createdAt: now,
    });

    await ctx.db.insert("messages", {
      threadId,
      authorType: "match",
      authorId: args.matchUserId,
      body: args.firstMatchMessage,
      mentionedAgent: false,
      createdAt: now + 1,
    });

    return {
      matchId,
      threadId,
    };
  },
});
