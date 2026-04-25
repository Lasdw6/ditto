import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const defaultDateIdeas = [
  {
    slug: "warehouse-rave",
    title: "Warehouse rave + late-night tacos",
    city: "Toronto",
    category: "High energy",
    image: "https://picsum.photos/seed/ycr-rave/960/1200",
    energy: "High",
    budget: "$$",
    intro: "Industrial lights, a stacked lineup, then one greasy perfect bite at 1:30 AM.",
    whyItWorks:
      "Best for people who flirt through momentum, music, and a second plan after midnight.",
    tags: ["electronic", "dancing", "spontaneous", "late night"],
  },
  {
    slug: "vinyl-cocktails",
    title: "Vinyl listening bar + martinis",
    city: "Toronto",
    category: "Taste chemistry",
    image: "https://picsum.photos/seed/ycr-vinyl/960/1200",
    energy: "Medium",
    budget: "$$$",
    intro: "Low light, a deep cut on the speakers, and enough quiet to say something that matters.",
    whyItWorks:
      "Built for people who bond through taste, details, and small pockets of intensity.",
    tags: ["vinyl", "cocktails", "conversation", "music nerds"],
  },
  {
    slug: "sunrise-hike",
    title: "Sunrise hike + brutalist coffee run",
    city: "Toronto",
    category: "Soft launch",
    image: "https://picsum.photos/seed/ycr-hike/960/1200",
    energy: "Low",
    budget: "$",
    intro: "Wake up early, trade playlists, then land somewhere with clean concrete and very good espresso.",
    whyItWorks:
      "Great for people who open up slowly and want a date that feels grounded, not performative.",
    tags: ["outdoors", "coffee", "walks", "morning"],
  },
  {
    slug: "pottery-wine",
    title: "Pottery wheel class + natural wine",
    city: "Toronto",
    category: "Creative chemistry",
    image: "https://picsum.photos/seed/ycr-pottery/960/1200",
    energy: "Medium",
    budget: "$$",
    intro: "Hands busy, laughs easy, and a glass of orange wine after both bowls collapse.",
    whyItWorks:
      "Ideal for tactile people who want an instant shared memory instead of interview energy.",
    tags: ["creative", "wine", "hands-on", "playful"],
  },
  {
    slug: "bookstore-jazz",
    title: "Bookstore browse + basement jazz set",
    city: "Toronto",
    category: "Slow burn",
    image: "https://picsum.photos/seed/ycr-jazz/960/1200",
    energy: "Medium",
    budget: "$$",
    intro: "Trade titles, judge each other's margins, then disappear into a room that smells like brass and old wood.",
    whyItWorks:
      "For pairs that connect through taste, conversation, and a little dramatic atmosphere.",
    tags: ["jazz", "books", "conversation", "culture"],
  },
  {
    slug: "night-market",
    title: "Night market photo walk",
    city: "Toronto",
    category: "Wandering",
    image: "https://picsum.photos/seed/ycr-market/960/1200",
    energy: "Medium",
    budget: "$",
    intro: "Street snacks, roaming, and a camera roll full of tiny things you both noticed.",
    whyItWorks:
      "A strong fit for people who click while moving, pointing, and sharing little reactions in real time.",
    tags: ["photo walk", "food", "markets", "explore"],
  },
  {
    slug: "gallery-after-dark",
    title: "After-dark gallery + natural wine",
    city: "Toronto",
    category: "Visual chemistry",
    image: "https://picsum.photos/seed/ycr-gallery/960/1200",
    energy: "Medium",
    budget: "$$",
    intro: "A quiet room with strong taste, then one very good glass somewhere nearby.",
    whyItWorks:
      "Best for people who flirt through observation, aesthetics, and slow-building conversation.",
    tags: ["gallery", "wine", "design", "conversation"],
  },
  {
    slug: "cooking-class",
    title: "Late cooking class + market dessert stop",
    city: "Toronto",
    category: "Hands-on",
    image: "https://picsum.photos/seed/ycr-cooking/960/1200",
    energy: "Medium",
    budget: "$$",
    intro: "Make something together, laugh when it goes slightly sideways, then keep the night moving with dessert.",
    whyItWorks:
      "Great for people who open up faster when they are doing something together instead of sitting across from each other.",
    tags: ["cooking", "hands-on", "food", "playful"],
  },
  {
    slug: "comedy-speakeasy",
    title: "Basement comedy set + speakeasy",
    city: "Toronto",
    category: "Loose and funny",
    image: "https://picsum.photos/seed/ycr-comedy/960/1200",
    energy: "Medium",
    budget: "$$",
    intro: "A little chaos, a dark room, and enough laughter to skip the awkward part.",
    whyItWorks:
      "A strong fit for people who need the pressure lowered before the flirtation gets better.",
    tags: ["comedy", "bar", "humor", "night out"],
  },
  {
    slug: "rooftop-cinema",
    title: "Rooftop cinema + midnight noodles",
    city: "Toronto",
    category: "Soft romance",
    image: "https://picsum.photos/seed/ycr-cinema/960/1200",
    energy: "Low",
    budget: "$$",
    intro: "A city view, a shared movie, then noodles while you decide whether the night should keep going.",
    whyItWorks:
      "Ideal for people who like a built-in structure before the conversation opens up after.",
    tags: ["cinema", "city view", "food", "romantic"],
  },
];

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("dateIdeas").collect();
    return rows.sort((a, b) => a.slug.localeCompare(b.slug));
  },
});

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    for (const idea of defaultDateIdeas) {
      const existing = await ctx.db
        .query("dateIdeas")
        .withIndex("by_slug", (q) => q.eq("slug", idea.slug))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, idea);
      } else {
        await ctx.db.insert("dateIdeas", idea);
      }
    }

    return { seeded: defaultDateIdeas.length };
  },
});

export const vote = mutation({
  args: {
    userId: v.string(),
    dateIdeaId: v.id("dateIdeas"),
    decision: v.union(v.literal("like"), v.literal("pass")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dateVotes")
      .withIndex("by_user_date_idea", (q) =>
        q.eq("userId", args.userId).eq("dateIdeaId", args.dateIdeaId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        decision: args.decision,
        note: args.note,
        votedAt: Date.now(),
        processedAt: undefined,
        matchId: undefined,
      });

      return {
        queuedMatchmaking: args.decision === "like",
        voteId: existing._id,
      };
    }

    const voteId = await ctx.db.insert("dateVotes", {
      ...args,
      votedAt: Date.now(),
    });

    return {
      queuedMatchmaking: args.decision === "like",
      voteId,
    };
  },
});
