import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { v } from "convex/values";
import { action } from "./_generated/server";

export const createConciergeIntro = action({
  args: {
    profileSummary: v.string(),
    matchSummary: v.string(),
    dateIdea: v.string(),
  },
  handler: async (_ctx, args) => {
    const result = await generateText({
      model: openai("gpt-5.4-mini"),
      system:
        "You are Chem, a dating concierge. Explain why two people feel like a fit in 2 short, conversational sentences. Sound socially fluent and specific, like a sharp host making an introduction, not a bot describing a pairing.",
      prompt: `Profile A: ${args.profileSummary}\nProfile B: ${args.matchSummary}\nShared date idea: ${args.dateIdea}`,
    });

    return result.text.trim();
  },
});

export const extractProfileMemory = action({
  args: {
    threadSummary: v.string(),
  },
  handler: async (_ctx, args) => {
    const result = await generateText({
      model: openai("gpt-5.4-mini"),
      system:
        "Extract one durable profile fact from the chat summary. Reply with a single concise natural-language sentence that could live in a lightweight memory store.",
      prompt: args.threadSummary,
    });

    return result.text.trim();
  },
});
