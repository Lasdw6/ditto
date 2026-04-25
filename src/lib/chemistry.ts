import type {
  AgentRequestPayload,
  ChatMessage,
  LiveMatch,
  MatchmakeRequestPayload,
  Profile,
} from "@/lib/types";

const memoryRules = [
  {
    pattern: /\bdrums?|drummer\b/i,
    note: "Mentioned playing drums and gravitates toward live rhythm-heavy dates.",
  },
  {
    pattern: /\bvinyl|record(s)?|crate dig\b/i,
    note: "Has a real music-collector streak and uses taste as a chemistry filter.",
  },
  {
    pattern: /\bphoto|camera|film\b/i,
    note: "Keeps bringing visual details into conversation and notices small moments.",
  },
  {
    pattern: /\bhike|trail|sunrise\b/i,
    note: "Responds well to dates with movement, scenery, and lower social noise.",
  },
  {
    pattern: /\bpottery|ceramic|clay\b/i,
    note: "Seems to like tactile creative activities over static sit-down plans.",
  },
  {
    pattern: /\bcoffee|espresso|latte\b/i,
    note: "Returns to coffee rituals when imagining comfortable first dates.",
  },
];

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

      const sharedTokens = userTokens.filter((token) => candidateTokens.includes(token));
      for (const token of sharedTokens) {
        thematic.add(token);
      }
    }
  }

  return {
    exact: Array.from(exact),
    thematic: Array.from(thematic),
  };
}

function scoreCandidate(
  user: MatchmakeRequestPayload["user"],
  candidate: Profile,
  dateIdea: MatchmakeRequestPayload["dateIdea"],
  swipeNote: string,
) {
  const note = swipeNote.toLowerCase();
  const memoryBlob = user.chemistryNotes.join(" ").toLowerCase();
  const sharedThemes = collectSharedThemes(user.interests, candidate.interests);
  const sharedInterests = [...sharedThemes.exact, ...sharedThemes.thematic];

  let score = sharedThemes.exact.length * 14 + sharedThemes.thematic.length * 8;

  for (const tag of dateIdea.tags) {
    const loweredTag = tag.toLowerCase();
    if (candidate.interests.some((interest) => interest.toLowerCase().includes(loweredTag))) {
      score += 10;
    }
    if (memoryBlob.includes(loweredTag)) {
      score += 7;
    }
    if (note.includes(loweredTag)) {
      score += 8;
    }
  }

  if (candidate.vibe.toLowerCase().includes(dateIdea.energy.toLowerCase())) {
    score += 4;
  }

  if (candidate.bio.toLowerCase().includes(dateIdea.category.toLowerCase())) {
    score += 6;
  }

  if (candidate.location === user.location) {
    score += 5;
  }

  return { score, sharedInterests };
}

function buildDynamicReasoning(
  user: MatchmakeRequestPayload["user"],
  candidate: Profile,
  dateIdea: MatchmakeRequestPayload["dateIdea"],
  sharedInterests: string[],
  swipeNote: string,
) {
  const sharedList = sharedInterests.slice(0, 3).join(", ");
  const noteLine = swipeNote.trim()
    ? ` ${candidate.name} also feels right for the version of the night you were hinting at.`
    : "";
  const overlap =
    sharedList || "the same pace, the same kind of curiosity, and a date that gives the conversation something to grab onto";

  return {
    rationale: `${candidate.name} feels right here. The chemistry reads like ${overlap}.${noteLine}`,
    starter: `I liked this one for you two. ${dateIdea.title} feels like the kind of first date where this could click without either of you forcing it.`,
    agentIntro: `I put you two together for ${dateIdea.title.toLowerCase()}. It feels like the kind of plan where the room does a little work for you and the conversation can open up on its own.`,
    firstMatchMessage: `${dateIdea.title} is honestly a strong opener. I like first dates that give us something to react to right away instead of pretending small talk is enough.`,
  };
}

export function buildOfflineMatchFromSignals(
  payload: MatchmakeRequestPayload,
): LiveMatch | null {
  const excluded = new Set(payload.excludedProfileIds ?? []);
  const candidates = payload.candidates
    .filter((candidate) => candidate.id !== payload.user.id && !excluded.has(candidate.id))
    .map((candidate) => ({
      candidate,
      ...scoreCandidate(payload.user, candidate, payload.dateIdea, payload.swipeNote ?? ""),
    }))
    .sort((a, b) => b.score - a.score);

  const winner = candidates[0];

  if (!winner) {
    return null;
  }

  const copy = buildDynamicReasoning(
    payload.user,
    winner.candidate,
    payload.dateIdea,
    winner.sharedInterests,
    payload.swipeNote ?? "",
  );

  return {
    id: `match-${payload.dateIdea.id}-${winner.candidate.id}`,
    profile: winner.candidate,
    dateIdea: payload.dateIdea,
    compatibility: Math.max(72, Math.min(97, 72 + winner.score)),
    rationale: copy.rationale,
    starter: copy.starter,
    venueSuggestions: [
      payload.dateIdea.title,
      `${payload.dateIdea.city} spot with ${payload.dateIdea.tags[0] ?? "good atmosphere"}`,
      `Low-pressure second stop for ${payload.dateIdea.category.toLowerCase()} energy`,
    ],
    transcript: [
      createMessage("agent", copy.agentIntro),
      createMessage("match", copy.firstMatchMessage),
    ],
  };
}

export function extractProfileMemories(
  message: string,
  existingMemories: string[],
): string[] {
  const next = [...existingMemories];

  for (const rule of memoryRules) {
    if (rule.pattern.test(message) && !next.includes(rule.note)) {
      next.unshift(rule.note);
    }
  }

  return next.slice(0, 8);
}

export function buildOfflineChemistryReply(payload: AgentRequestPayload): string {
  const prompt = payload.message.toLowerCase();
  const isPlanningRequest =
    /plan|place|spot|where|date|restaurant|bar|find|book|venue/.test(prompt);
  const recentTopic = payload.transcript.at(-1)?.text ?? "";
  const sharedInterests = payload.match.interests
    .filter((interest) => payload.user.interests.includes(interest))
    .slice(0, 2);

  if (isPlanningRequest) {
    const suggestions = payload.dateIdea.tags
      .slice(0, 2)
      .concat(payload.match.interests.slice(0, 1))
      .join(", ");

    return `Chem here. I’d keep this close to ${payload.dateIdea.title.toLowerCase()} energy and make the first stop easy to settle into. In ${payload.dateIdea.city}, look for somewhere that supports ${suggestions}. If it’s going well, give yourselves a simple second stop instead of overplanning it.`;
  }

  return `My read is that this works best if it stays specific. ${payload.user.name} and ${payload.match.name} both seem to light up around ${payload.dateIdea.category.toLowerCase()} dates where ${payload.dateIdea.whyItWorks.toLowerCase()} If you want a next move, I’d keep it simple and easy to say yes to.${recentTopic ? ` Also, the thread already has a thread worth pulling on: "${recentTopic}"` : ""}`;
}

export function buildOfflineMatchReply(payload: {
  user: { name: string; interests: string[]; vibe: string; bio: string };
  match: { name: string; interests: string[]; vibe: string; bio: string };
  dateIdea: {
    title: string;
    city: string;
    category: string;
    whyItWorks: string;
    tags: string[];
  };
  transcript: ChatMessage[];
  message: string;
}) {
  const prompt = payload.message.toLowerCase();
  const lastMatchMessage = [...payload.transcript]
    .reverse()
    .find((entry) => entry.author === "match")?.text;
  const sharedInterests = payload.match.interests
    .filter((interest) =>
      payload.user.interests.some(
        (userInterest) =>
          userInterest.toLowerCase() === interest.toLowerCase() ||
          userInterest.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(userInterest.toLowerCase()),
      ),
    )
    .slice(0, 2);
  const askedQuestion = /\?/.test(payload.message);
  const favoriteComedianMatch = payload.message.match(/favo?u?rite comedian/i);

  if (/music|playlist|song|set|dj|vinyl/.test(prompt)) {
    return `That definitely lands for me. ${payload.dateIdea.title} feels better when the soundtrack is doing some of the work, and ${sharedInterests[0] ? `${sharedInterests[0]} is already a good sign.` : "I can usually tell a lot from someone off music taste."}${askedQuestion ? " What are you putting on first?" : ""}`;
  }

  if (favoriteComedianMatch) {
    return `Right now? Probably someone a little dry and slightly mean in a smart way. I like comics who sound like they noticed one weird thing in the room and refused to let it go. What about you?`;
  }

  if (/drink|coffee|wine|cocktail|taco|food/.test(prompt)) {
    return `Yes, but I’m picky about the first stop. I want enough atmosphere that we’re not doing all the work immediately, then somewhere easy nearby if the night still has legs.`;
  }

  if (/when|friday|saturday|weekend|time/.test(prompt)) {
    return `I could make that work. I’m better with one clear first move and a loose rest-of-night plan than something that feels over-engineered.`;
  }

  if (/where|spot|place|bar|restaurant/.test(prompt)) {
    return `I’d vote for somewhere that matches ${payload.dateIdea.title.toLowerCase()} energy instead of forcing it. A good first room matters more to me than doing the absolute most.`;
  }

  if (/book|reading|store|bookstore|jazz|gallery|museum|walk/.test(prompt)) {
    return `That’s more my speed than something hyper-scripted. I like dates where there’s something to notice together first, then the conversation can open up naturally.`;
  }

  if (askedQuestion) {
    return `Honestly, yes. ${payload.dateIdea.title} feels like the kind of plan where I’d actually get to know someone instead of doing generic first-date theater.${sharedInterests[0] ? ` The ${sharedInterests[0]} overlap helps too.` : ""} What part of it feels most like you?`;
  }

  if (lastMatchMessage && /easy|good way|fits the vibe|sounds like my kind/.test(lastMatchMessage.toLowerCase())) {
    return `You’re already making this feel less fake, which I appreciate. ${sharedInterests[0] ? `I can tell we’d have opinions about ${sharedInterests[0]}.` : "I like that you’re giving me something specific to react to."}`;
  }

  return `That actually gives me something to work with. I’m into ${payload.dateIdea.title.toLowerCase()} energy when it feels a little specific and lived-in, not just technically a date idea.`;
}

export function createLocalTimestamp() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

export function createMessage(
  author: ChatMessage["author"],
  text: string,
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    author,
    text,
    createdAt: createLocalTimestamp(),
  };
}
