import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    userId: v.string(),
    name: v.string(),
    age: v.number(),
    location: v.string(),
    gender: v.optional(v.string()),
    interestedIn: v.optional(v.array(v.string())),
    pronouns: v.string(),
    occupation: v.string(),
    vibe: v.string(),
    bio: v.string(),
    interests: v.array(v.string()),
    chemistryNotes: v.array(v.string()),
    avatar: v.string(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  dateIdeas: defineTable({
    slug: v.string(),
    title: v.string(),
    city: v.string(),
    category: v.string(),
    image: v.string(),
    energy: v.string(),
    budget: v.string(),
    intro: v.string(),
    whyItWorks: v.string(),
    tags: v.array(v.string()),
  }).index("by_slug", ["slug"]),

  dateVotes: defineTable({
    userId: v.string(),
    dateIdeaId: v.id("dateIdeas"),
    decision: v.union(v.literal("like"), v.literal("pass")),
    note: v.optional(v.string()),
    votedAt: v.number(),
    processedAt: v.optional(v.number()),
    matchId: v.optional(v.id("matches")),
  })
    .index("by_user", ["userId"])
    .index("by_date_idea", ["dateIdeaId"])
    .index("by_user_date_idea", ["userId", "dateIdeaId"]),

  matches: defineTable({
    userId: v.string(),
    matchUserId: v.string(),
    dateIdeaId: v.id("dateIdeas"),
    compatibility: v.number(),
    rationale: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("archived"),
    ),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_match_user", ["matchUserId"]),

  threads: defineTable({
    matchId: v.id("matches"),
    conciergeSummary: v.string(),
    lastMessageAt: v.number(),
  }).index("by_match", ["matchId"]),

  messages: defineTable({
    threadId: v.id("threads"),
    authorType: v.union(
      v.literal("user"),
      v.literal("match"),
      v.literal("agent"),
    ),
    authorId: v.optional(v.string()),
    body: v.string(),
    mentionedAgent: v.boolean(),
    createdAt: v.number(),
  }).index("by_thread", ["threadId"]),

  profileMemories: defineTable({
    userId: v.string(),
    memory: v.string(),
    sourceThreadId: v.optional(v.id("threads")),
    confidence: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
