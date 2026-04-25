import { v } from "convex/values";
import { mutation } from "./_generated/server";

const fakeProfiles = [
  {
    userId: "rio",
    name: "Rio",
    age: 30,
    location: "Toronto",
    gender: "man",
    interestedIn: ["women"],
    pronouns: "he/him",
    occupation: "Motion designer",
    vibe: "Playful extrovert",
    bio: "I say yes to rave basements, rooftop sets, and random side quests if the soundtrack is right.",
    interests: ["drums", "warehouse sets", "street food", "cycling", "sneaker design"],
    chemistryNotes: [
      "Always has one more plan in the chamber.",
      "Most engaged when the energy is loud, social, and a little unplanned.",
    ],
    avatar: "https://picsum.photos/seed/ycr-rio/200/200",
  },
  {
    userId: "maeve",
    name: "Maeve",
    age: 27,
    location: "Toronto",
    gender: "woman",
    interestedIn: ["men", "women"],
    pronouns: "she/her",
    occupation: "Ceramics teacher",
    vibe: "Warm and tactile",
    bio: "I like creative dates, slow drinks, and people who notice details.",
    interests: ["pottery", "natural wine", "interiors", "film photography", "indie playlists"],
    chemistryNotes: [
      "Shows affection through thoughtful planning.",
      "Gets animated when making something with her hands.",
    ],
    avatar: "https://picsum.photos/seed/ycr-maeve/200/200",
  },
  {
    userId: "zion",
    name: "Zion",
    age: 29,
    location: "Toronto",
    gender: "other",
    interestedIn: ["women", "other"],
    pronouns: "they/them",
    occupation: "Music journalist",
    vibe: "Sharp and magnetic",
    bio: "Bookstore afternoons and smoky jazz rooms are my native language.",
    interests: ["jazz", "bookstores", "writing", "vinyl", "small concerts"],
    chemistryNotes: [
      "Connects through taste and conversation depth.",
      "Likes dates that shift from browsing to talking without forcing it.",
    ],
    avatar: "https://picsum.photos/seed/ycr-zion/200/200",
  },
  {
    userId: "noa",
    name: "Noa",
    age: 31,
    location: "Toronto",
    gender: "woman",
    interestedIn: ["men"],
    pronouns: "she/her",
    occupation: "Product designer",
    vibe: "Calm with a hidden wild streak",
    bio: "Sunrise hikes, architecture walks, and one very good coffee usually beat loud rooms for me.",
    interests: ["hiking", "coffee", "brutalist architecture", "pilates", "travel journals"],
    chemistryNotes: [
      "Prefers momentum that starts calm and opens up later.",
      "Very responsive to curiosity and grounded humor.",
    ],
    avatar: "https://picsum.photos/seed/ycr-noa/200/200",
  },
  {
    userId: "cass",
    name: "Cass",
    age: 26,
    location: "Toronto",
    gender: "other",
    interestedIn: ["women", "other", "men"],
    pronouns: "he/they",
    occupation: "Community producer",
    vibe: "Social and sweet",
    bio: "Give me a night market, a camera, and someone who likes wandering more than scheduling.",
    interests: ["photo walks", "night markets", "ramen", "street style", "design fairs"],
    chemistryNotes: [
      "Feels natural in open-ended dates with lots to point at.",
      "Conversation gets stronger while walking side by side.",
    ],
    avatar: "https://picsum.photos/seed/ycr-cass/200/200",
  },
  {
    userId: "imani",
    name: "Imani",
    age: 32,
    location: "Toronto",
    gender: "woman",
    interestedIn: ["men", "women"],
    pronouns: "she/her",
    occupation: "Architect",
    vibe: "Grounded and sharp",
    bio: "I like dates with style, strong conversation, and at least one small surprise built in.",
    interests: ["galleries", "design", "cocktails", "city walks", "photography"],
    chemistryNotes: [
      "Responds to visually strong spaces and thoughtful plans.",
      "More likely to click when the date has atmosphere without trying too hard.",
    ],
    avatar: "https://picsum.photos/seed/ycr-imani/200/200",
  },
  {
    userId: "miles",
    name: "Miles",
    age: 29,
    location: "Toronto",
    gender: "man",
    interestedIn: ["women"],
    pronouns: "he/him",
    occupation: "Chef",
    vibe: "Warm and curious",
    bio: "Give me a cooking class, a market, or one great low-key bar and I’m fully in.",
    interests: ["cooking", "food crawls", "wine", "comedy", "farmers markets"],
    chemistryNotes: [
      "Likes hands-on dates where conversation happens while doing something.",
      "Food is a stronger signal than pure nightlife.",
    ],
    avatar: "https://picsum.photos/seed/ycr-miles/200/200",
  },
  {
    userId: "aria",
    name: "Aria",
    age: 27,
    location: "Toronto",
    gender: "other",
    interestedIn: ["women", "other"],
    pronouns: "she/they",
    occupation: "Playlist editor",
    vibe: "Magnetic and low-key",
    bio: "I tend to like nights with music, rooms with mood, and people who notice details.",
    interests: ["live sets", "indie nights", "vinyl", "zines", "late bars"],
    chemistryNotes: [
      "Connects through music taste and little moments of intensity.",
      "Prefers dates with a little darkness and a strong soundtrack.",
    ],
    avatar: "https://picsum.photos/seed/ycr-aria/200/200",
  },
];

const fallbackProfileFields = {
  you: {
    gender: "woman",
    interestedIn: ["men", "women"],
  },
  rio: {
    gender: "man",
    interestedIn: ["women"],
  },
  maeve: {
    gender: "woman",
    interestedIn: ["men", "women"],
  },
  zion: {
    gender: "other",
    interestedIn: ["women", "other"],
  },
  noa: {
    gender: "woman",
    interestedIn: ["men"],
  },
  cass: {
    gender: "other",
    interestedIn: ["women", "other", "men"],
  },
  imani: {
    gender: "woman",
    interestedIn: ["men", "women"],
  },
  miles: {
    gender: "man",
    interestedIn: ["women"],
  },
  aria: {
    gender: "other",
    interestedIn: ["women", "other"],
  },
} satisfies Record<string, { gender: string; interestedIn: string[] }>;

export const upsertGuest = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    age: v.number(),
    location: v.string(),
    gender: v.string(),
    interestedIn: v.array(v.string()),
    pronouns: v.string(),
    occupation: v.string(),
    vibe: v.string(),
    bio: v.string(),
    interests: v.array(v.string()),
    chemistryNotes: v.array(v.string()),
    avatar: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("profiles", {
        ...args,
        updatedAt: Date.now(),
      });
    }

    const currentMemories = await ctx.db
      .query("profileMemories")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const existingMemorySet = new Set(currentMemories.map((entry) => entry.memory));

    for (const memory of args.chemistryNotes) {
      if (!existingMemorySet.has(memory)) {
        await ctx.db.insert("profileMemories", {
          userId: args.userId,
          memory,
          confidence: 0.76,
          createdAt: Date.now(),
        });
      }
    }

    return { ok: true };
  },
});

export const seedFakeProfiles = mutation({
  args: {},
  handler: async (ctx) => {
    for (const profile of fakeProfiles) {
      const existing = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", profile.userId))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...profile,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("profiles", {
          ...profile,
          updatedAt: Date.now(),
        });
      }

      const existingMemories = await ctx.db
        .query("profileMemories")
        .withIndex("by_user", (q) => q.eq("userId", profile.userId))
        .collect();

      const memorySet = new Set(existingMemories.map((entry) => entry.memory));

      for (const memory of profile.chemistryNotes) {
        if (!memorySet.has(memory)) {
          await ctx.db.insert("profileMemories", {
            userId: profile.userId,
            memory,
            confidence: 0.82,
            createdAt: Date.now(),
          });
        }
      }
    }

    return { seeded: fakeProfiles.length };
  },
});

export const backfillProfileIdentity = mutation({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    let updated = 0;

    for (const profile of profiles) {
      const fallback = fallbackProfileFields[profile.userId as keyof typeof fallbackProfileFields];
      const nextGender = profile.gender ?? fallback?.gender ?? "other";
      const nextInterestedIn =
        profile.interestedIn && profile.interestedIn.length
          ? profile.interestedIn
          : fallback?.interestedIn ?? ["women", "men", "other"];

      if (
        profile.gender !== nextGender ||
        JSON.stringify(profile.interestedIn ?? []) !== JSON.stringify(nextInterestedIn)
      ) {
        await ctx.db.patch(profile._id, {
          gender: nextGender,
          interestedIn: nextInterestedIn,
          updatedAt: Date.now(),
        });
        updated += 1;
      }
    }

    return {
      scanned: profiles.length,
      updated,
    };
  },
});
