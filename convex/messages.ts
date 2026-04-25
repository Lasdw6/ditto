import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listForThread = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, { threadId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect();
  },
});

export const send = mutation({
  args: {
    threadId: v.id("threads"),
    authorType: v.union(
      v.literal("user"),
      v.literal("match"),
      v.literal("agent"),
    ),
    authorId: v.optional(v.string()),
    body: v.string(),
    mentionedAgent: v.boolean(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      ...args,
      createdAt: Date.now(),
    });

    const thread = await ctx.db.get(args.threadId);

    if (thread) {
      await ctx.db.patch(args.threadId, {
        lastMessageAt: Date.now(),
      });
    }

    return messageId;
  },
});
