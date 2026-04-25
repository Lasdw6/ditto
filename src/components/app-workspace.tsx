"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarRange,
  Check,
  LoaderCircle,
  MessageCircle,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createLocalTimestamp,
  extractProfileMemories,
} from "@/lib/chemistry";
import { currentUser, profilePersonaNotes } from "@/lib/demo-data";
import {
  guestProfileStorageKey,
  parseGuestProfile,
  serializeGuestProfile,
} from "@/lib/guest-profile";
import type { AgentRequestPayload, ChatMessage, Profile } from "@/lib/types";
import { LogoMark } from "@/components/logo-mark";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type AppTab = "discover" | "chats" | "profile";
type SwipeDecision = "like" | "pass";
type DeckIdea = Doc<"dateIdeas">;
type RoomSummary = {
  matchId: Id<"matches">;
  threadId: Id<"threads">;
  compatibility: number;
  rationale: string;
  status: "pending" | "active" | "archived";
  createdAt: number;
  conciergeSummary: string;
  lastMessageAt: number;
  latestMessage?: Doc<"messages">;
  dateIdea: DeckIdea;
  profile: Profile;
};
type ThreadDetail = {
  matchId: Id<"matches">;
  threadId: Id<"threads">;
  compatibility: number;
  rationale: string;
  conciergeSummary: string;
  dateIdea: DeckIdea;
  profile: Profile;
  messages: Doc<"messages">[];
};

const tabMeta: Array<{ id: AppTab; label: string; icon: typeof CalendarRange }> = [
  { id: "discover", label: "Discover", icon: CalendarRange },
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "profile", label: "Profile", icon: UserRound },
];

function createDraftFromProfile(profile: Profile) {
  return {
    name: profile.name,
    age: String(profile.age),
    location: profile.location,
    gender: profile.gender ?? "",
    interestedIn: (profile.interestedIn ?? []).join(", "),
    pronouns: profile.pronouns,
    occupation: profile.occupation,
    vibe: profile.vibe,
    bio: profile.bio,
    interests: profile.interests.join(", "),
  };
}

function buildSwipeMemory(profile: Profile, ideaTitle: string, note: string) {
  if (!note.trim()) {
    return profile;
  }

  const memory = `Swipe note for ${ideaTitle}: ${note.trim()}`;
  return {
    ...profile,
    chemistryNotes: [memory, ...profile.chemistryNotes].slice(0, 8),
  };
}

function formatMessageTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function renderHighlightedComposerText(
  value: string,
  matchMention?: string,
) {
  const source = value.length ? value : "Message the room...";
  const pattern = /(@chem|@[a-zA-Z0-9_-]+)/g;
  const parts = source.split(pattern);

  return parts.map((part, index) => {
    const normalizedMatch = matchMention ? matchMention.toLowerCase() : "";
    const isTag =
      part.toLowerCase() === "@chem" ||
      (normalizedMatch && part.toLowerCase() === normalizedMatch) ||
      /^@[a-zA-Z0-9_-]+$/.test(part);

    return (
        <span
          key={`${part}-${index}`}
          className={
            isTag
            ? "rounded-[4px] bg-neon/14 text-neon [box-shadow:inset_0_-1px_0_rgba(0,255,148,0.55)]"
            : value.length
              ? "text-white"
              : "text-zinc-500"
          }
        >
        {part}
      </span>
    );
  });
}

function createMatchMention(name: string) {
  return `@${name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

function getActiveMentionQuery(value: string, caretIndex: number) {
  const beforeCaret = value.slice(0, caretIndex);
  const match = beforeCaret.match(/(^|\s)@([a-zA-Z0-9_-]*)$/);

  if (!match || match.index === undefined) {
    return null;
  }

  const tokenStart = match.index + match[1].length;
  return {
    query: match[2].toLowerCase(),
    start: tokenStart,
    end: caretIndex,
  };
}

export function AppWorkspace() {
  const [activeTab, setActiveTab] = useState<AppTab>("discover");
  const [guestProfile, setGuestProfile] = useState<Profile | null>(null);
  const [profileDraft, setProfileDraft] = useState(createDraftFromProfile(currentUser));
  const [isReady, setIsReady] = useState(false);
  const [deckIndex, setDeckIndex] = useState(0);
  const [selectedMatchId, setSelectedMatchId] = useState<Id<"matches"> | null>(null);
  const [showMatchProfile, setShowMatchProfile] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [draftSwipeNote, setDraftSwipeNote] = useState("");
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [isMatchThinking, setIsMatchThinking] = useState(false);
  const [isSwipeAnimating, setIsSwipeAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDecision | null>(null);
  const [isSyncingVote, setIsSyncingVote] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [feedbackCue, setFeedbackCue] = useState<SwipeDecision | null>(null);
  const [hoverCue, setHoverCue] = useState<SwipeDecision | null>(null);
  const [composerCaret, setComposerCaret] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const seedDateIdeas = useMutation(api.dateIdeas.seedDefaults);
  const seedFakeProfiles = useMutation(api.profiles.seedFakeProfiles);
  const upsertGuest = useMutation(api.profiles.upsertGuest);
  const voteDateIdea = useMutation(api.dateIdeas.vote);
  const sendMessage = useMutation(api.messages.send);

  const liveDateIdeas = useQuery(api.dateIdeas.list, {}) as DeckIdea[] | undefined;
  const rooms = useQuery(
    api.matches.listRoomsForUser,
    guestProfile ? { userId: guestProfile.id } : "skip",
  ) as RoomSummary[] | undefined;
  const threadData = useQuery(
    api.matches.getThreadForMatch,
    guestProfile && selectedMatchId
      ? { userId: guestProfile.id, matchId: selectedMatchId }
      : "skip",
  ) as ThreadDetail | null | undefined;

  const currentIdea = liveDateIdeas?.length
    ? liveDateIdeas[deckIndex % liveDateIdeas.length]
    : null;
  const sortedMatches = useMemo(() => {
    const seenProfiles = new Set<string>();
    return (rooms ?? []).filter((room) => {
      if (seenProfiles.has(room.profile.id)) {
        return false;
      }
      seenProfiles.add(room.profile.id);
      return true;
    });
  }, [rooms]);
  const selectedRoom =
    selectedMatchId && sortedMatches.length
      ? sortedMatches.find((room) => room.matchId === selectedMatchId) ?? null
      : sortedMatches[0] ?? null;
  const activeMention = getActiveMentionQuery(draftMessage, composerCaret);
  const matchMention = threadData ? createMatchMention(threadData.profile.name) : "";
  const mentionOptions = useMemo(() => {
    if (!threadData || !activeMention) {
      return [];
    }

    const baseOptions = [
      {
        id: "chem",
        label: "@chem",
        value: "@chem",
        caption: "Chem concierge",
      },
      {
        id: "match",
        label: matchMention,
        value: matchMention,
        caption: threadData.profile.name,
      },
    ];

    return baseOptions.filter((option) =>
      option.value.toLowerCase().includes(`@${activeMention.query}`),
    );
  }, [activeMention, matchMention, threadData]);

  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [draftMessage, composerCaret, threadData]);

  useEffect(() => {
    const stored = parseGuestProfile(window.localStorage.getItem(guestProfileStorageKey));
    if (!stored) {
      setIsReady(true);
      return;
    }

    setGuestProfile(stored);
    setProfileDraft(createDraftFromProfile(stored));
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void seedDateIdeas();
    void seedFakeProfiles();
  }, [isReady, seedDateIdeas, seedFakeProfiles]);

  useEffect(() => {
    if (!guestProfile) {
      return;
    }

    void upsertGuest({
      userId: guestProfile.id,
      name: guestProfile.name,
      age: guestProfile.age,
      location: guestProfile.location,
      gender: guestProfile.gender,
      interestedIn: guestProfile.interestedIn,
      pronouns: guestProfile.pronouns,
      occupation: guestProfile.occupation,
      vibe: guestProfile.vibe,
      bio: guestProfile.bio,
      interests: guestProfile.interests,
      chemistryNotes: guestProfile.chemistryNotes,
      avatar: guestProfile.avatar,
    });
  }, [guestProfile, upsertGuest]);

  useEffect(() => {
    if (!sortedMatches.length) {
      setSelectedMatchId(null);
      return;
    }

    if (!selectedMatchId || !sortedMatches.some((room) => room.matchId === selectedMatchId)) {
      setSelectedMatchId(sortedMatches[0].matchId);
    }
  }, [selectedMatchId, sortedMatches]);

  useEffect(() => {
    setShowMatchProfile(false);
  }, [selectedMatchId]);

  function persistProfile(nextProfile: Profile) {
    setGuestProfile(nextProfile);
    window.localStorage.setItem(guestProfileStorageKey, serializeGuestProfile(nextProfile));
  }

  function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!guestProfile) {
      return;
    }

    const interests = profileDraft.interests
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const nextProfile: Profile = {
      ...guestProfile,
      name: profileDraft.name.trim() || guestProfile.name,
      age: Number(profileDraft.age) || guestProfile.age,
      location: profileDraft.location.trim() || guestProfile.location,
      gender: profileDraft.gender.trim() || guestProfile.gender,
      interestedIn: profileDraft.interestedIn
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      pronouns: profileDraft.pronouns.trim() || guestProfile.pronouns,
      occupation: profileDraft.occupation.trim() || guestProfile.occupation,
      vibe: profileDraft.vibe.trim() || guestProfile.vibe,
      bio: profileDraft.bio.trim() || guestProfile.bio,
      interests: interests.length ? interests : guestProfile.interests,
    };

    persistProfile(nextProfile);
  }

  function commitSwipe(decision: SwipeDecision) {
    if (!currentIdea || isSwipeAnimating || !guestProfile) {
      return;
    }

    const swipeNote = draftSwipeNote.trim();
    const profileSnapshot = buildSwipeMemory(guestProfile, currentIdea.title, swipeNote);

    if (profileSnapshot !== guestProfile) {
      persistProfile(profileSnapshot);
    }

    setIsSwipeAnimating(true);
    setSwipeDirection(decision);
    setFeedbackCue(decision);

    window.setTimeout(() => {
      setDeckIndex((index) =>
        liveDateIdeas?.length ? (index + 1) % liveDateIdeas.length : 0,
      );
      setDraftSwipeNote("");
      setSwipeDirection(null);
      setIsSwipeAnimating(false);
      setFeedbackCue(null);
    }, 180);

    setIsSyncingVote(true);

    void voteDateIdea({
      userId: profileSnapshot.id,
      dateIdeaId: currentIdea._id,
      decision,
      note: swipeNote || undefined,
    }).finally(() => {
      setIsSyncingVote(false);
    });
  }

  function handleIdeaCardClick(event: React.MouseEvent<HTMLDivElement>) {
    if (isSwipeAnimating) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const isRightHalf = event.clientX >= bounds.left + bounds.width / 2;

    commitSwipe(isRightHalf ? "like" : "pass");
  }

  function handleIdeaCardMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (isSwipeAnimating) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const isRightHalf = event.clientX >= bounds.left + bounds.width / 2;
    setHoverCue(isRightHalf ? "like" : "pass");
  }

  function handleIdeaCardMouseLeave() {
    setHoverCue(null);
  }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftMessage.trim() || !guestProfile || !threadData || isSendingMessage) {
      return;
    }

    setIsSendingMessage(true);
    setChatError(null);
    const message = draftMessage.trim();
    const mentionedAgent = message.toLowerCase().includes("@chem");
    const nextMemories = extractProfileMemories(message, guestProfile.chemistryNotes);
    const nextProfile = {
      ...guestProfile,
      chemistryNotes: nextMemories,
    };

    persistProfile(nextProfile);
    setDraftMessage("");

    try {
      await sendMessage({
        threadId: threadData.threadId,
        authorType: "user",
        authorId: guestProfile.id,
        body: message,
        mentionedAgent,
      });

      const transcript: ChatMessage[] = [
        ...threadData.messages.map((entry) => {
          const author: ChatMessage["author"] =
            entry.authorType === "user"
              ? "you"
              : entry.authorType === "match"
                ? "match"
                : "agent";

          return {
            id: entry._id,
            author,
            text: entry.body,
            createdAt: formatMessageTime(entry.createdAt),
          };
        }),
        {
          id: crypto.randomUUID(),
          author: "you" as const,
          text: message,
          createdAt: createLocalTimestamp(),
        },
      ];

      if (mentionedAgent) {
        setIsAgentThinking(true);

        const payload: AgentRequestPayload = {
          user: {
            name: nextProfile.name,
            interests: nextProfile.interests,
          },
          match: {
            name: threadData.profile.name,
            interests: threadData.profile.interests,
          },
          dateIdea: {
            title: threadData.dateIdea.title,
            city: threadData.dateIdea.city,
            category: threadData.dateIdea.category,
            whyItWorks: threadData.dateIdea.whyItWorks,
            tags: threadData.dateIdea.tags,
          },
          transcript,
          message,
          memories: nextMemories,
        };

        try {
          const response = await fetch("/api/chemistry", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          const data = (await response.json()) as { text?: string; error?: string };

          if (!response.ok || !data.text) {
            throw new Error(data.error ?? "Chem could not generate a reply.");
          }

          await sendMessage({
            threadId: threadData.threadId,
            authorType: "agent",
            body: data.text,
            mentionedAgent: false,
          });
        } finally {
          setIsAgentThinking(false);
        }

        return;
      }

      setIsMatchThinking(true);

      try {
        const response = await fetch("/api/match-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user: {
              name: nextProfile.name,
              interests: nextProfile.interests,
              vibe: nextProfile.vibe,
              bio: nextProfile.bio,
            },
            match: {
              id: threadData.profile.id,
              name: threadData.profile.name,
              interests: threadData.profile.interests,
              vibe: threadData.profile.vibe,
              bio: threadData.profile.bio,
              styleHint: profilePersonaNotes[threadData.profile.id],
            },
            dateIdea: {
              title: threadData.dateIdea.title,
              city: threadData.dateIdea.city,
              category: threadData.dateIdea.category,
              whyItWorks: threadData.dateIdea.whyItWorks,
              tags: threadData.dateIdea.tags,
            },
            transcript,
            message,
          }),
        });

        const data = (await response.json()) as { text?: string; error?: string };

        if (!response.ok || !data.text) {
          throw new Error(data.error ?? "The match could not generate a reply.");
        }

        await sendMessage({
          threadId: threadData.threadId,
          authorType: "match",
          authorId: threadData.profile.id,
          body: data.text,
          mentionedAgent: false,
        });
      } catch (error) {
        setChatError(
          error instanceof Error
            ? error.message
            : "The match could not generate a reply.",
        );
      } finally {
        setIsMatchThinking(false);
      }
    } finally {
      setIsSendingMessage(false);
    }
  }

  function applyMention(label: string) {
    if (!activeMention) {
      return;
    }

    const nextValue =
      `${draftMessage.slice(0, activeMention.start)}${label} ${draftMessage.slice(activeMention.end)}`;
    const nextCaret = activeMention.start + label.length + 1;

    setDraftMessage(nextValue);
    setComposerCaret(nextCaret);

    window.requestAnimationFrame(() => {
      composerRef.current?.focus();
      composerRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mentionOptions.length) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (draftMessage.trim() && !isSendingMessage) {
          event.currentTarget.form?.requestSubmit();
        }
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedMentionIndex((current) => (current + 1) % mentionOptions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedMentionIndex((current) =>
        current === 0 ? mentionOptions.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      applyMention(mentionOptions[selectedMentionIndex]?.value ?? mentionOptions[0].value);
      return;
    }

    if (event.key === "Escape") {
      setComposerCaret(0);
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (draftMessage.trim() && !isSendingMessage) {
        event.currentTarget.form?.requestSubmit();
      }
    }
  }

  if (!isReady || !guestProfile || !currentIdea) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-5 text-center">
            <LogoMark />
            <div className="flex items-center gap-3 text-sm tracking-[0.08em] text-zinc-300">
              <LoaderCircle className="size-4 animate-spin" />
              <span>Experimenting in the Lab &lt;3</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const discoverView = (
    <section className="grid h-full min-h-0 gap-6 overflow-hidden lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="relative h-full min-h-0 overflow-hidden rounded-[36px] border border-white/10 bg-black/40">
        {(feedbackCue === "pass" || (!feedbackCue && hoverCue === "pass")) ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.28 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(90deg,rgba(255,93,117,0.24)_0%,transparent_48%)]"
          />
        ) : null}
        {(feedbackCue === "like" || (!feedbackCue && hoverCue === "like")) ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.28 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(270deg,rgba(0,255,148,0.24)_0%,transparent_48%)]"
          />
        ) : null}

        <motion.div
          style={{ opacity: 0.24 }}
          className="absolute inset-x-[5%] top-7 h-full rounded-[32px] border border-white/6 bg-white/[0.02]"
        />
        <motion.div
          style={{ opacity: 0.12 }}
          className="absolute inset-x-[10%] top-14 h-full rounded-[32px] border border-white/6 bg-white/[0.02]"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentIdea._id}-${deckIndex}`}
            onClick={handleIdeaCardClick}
            onMouseMove={handleIdeaCardMouseMove}
            onMouseLeave={handleIdeaCardMouseLeave}
            initial={{ opacity: 0, x: 0, y: 28, rotate: 0, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
            exit={{
              opacity: 0,
              x: swipeDirection === "like" ? 320 : swipeDirection === "pass" ? -320 : 0,
              rotate: swipeDirection === "like" ? 16 : swipeDirection === "pass" ? -16 : 0,
              transition: { duration: 0.18, ease: "easeIn" },
            }}
            className="absolute inset-0 z-10 cursor-pointer overflow-hidden rounded-[36px] border border-white/10"
          >
            <Image
              src={currentIdea.image}
              alt={currentIdea.title}
              fill
              sizes="(max-width: 1024px) 100vw, 70vw"
              className="object-cover object-center"
              priority
            />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,3,0.12)_0%,rgba(3,3,3,0.32)_38%,rgba(3,3,3,0.88)_100%)]" />

            <div className="pointer-events-none absolute inset-y-0 left-0 w-28 border-r border-transparent bg-[linear-gradient(90deg,rgba(255,93,117,0.2)_0%,transparent_100%)]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-28 border-l border-transparent bg-[linear-gradient(270deg,rgba(0,255,148,0.2)_0%,transparent_100%)]" />

            <motion.div
              animate={{ opacity: feedbackCue === "pass" || (!feedbackCue && hoverCue === "pass") ? 1 : 0 }}
              className="absolute left-8 top-8 rounded-full border border-[#ff5d75] bg-[#1a080d]/92 px-5 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-[#ff8093] shadow-[0_0_40px_rgba(255,93,117,0.24)]"
            >
              Pass
            </motion.div>

            <motion.div
              animate={{ opacity: feedbackCue === "like" || (!feedbackCue && hoverCue === "like") ? 1 : 0 }}
              className="absolute right-8 top-8 rounded-full border border-neon/60 bg-[#07140e]/92 px-5 py-3 text-xs font-semibold uppercase tracking-[0.32em] text-neon shadow-[0_0_40px_rgba(0,255,148,0.2)]"
            >
              Save
            </motion.div>

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-zinc-300">
                  <span>{currentIdea.category}</span>
                  <span className="h-1 w-1 rounded-full bg-zinc-500" />
                  <span>{currentIdea.energy} energy</span>
                  <span className="h-1 w-1 rounded-full bg-zinc-500" />
                  <span>{currentIdea.budget}</span>
                </div>

                <h2 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">
                  {currentIdea.title}
                </h2>

                <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-200 sm:text-lg">
                  {currentIdea.intro}
                </p>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
                  {currentIdea.whyItWorks}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {currentIdea.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/14 bg-black/24 px-3 py-2 text-xs text-zinc-100 backdrop-blur"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-black/28 p-5">
        <div className="rounded-[24px] border border-white/10 bg-black/24 p-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.22em] text-zinc-500">
            <span>Deck</span>
            <span>{(deckIndex % liveDateIdeas!.length) + 1}/{liveDateIdeas!.length}</span>
          </div>
          <Label className="mt-4 block space-y-2">
            <span className="text-xs uppercase tracking-[0.22em] text-zinc-500">
              Optional note for the agent
            </span>
            <Textarea
              rows={5}
              value={draftSwipeNote}
              onChange={(event) => setDraftSwipeNote(event.target.value)}
              placeholder="Love this. Hate it. Bad knees. Too loud. More like this."
              className="w-full rounded-[20px] border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-neon"
            />
          </Label>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => commitSwipe("pass")}
            disabled={isSwipeAnimating}
            className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-4 text-sm font-medium text-white transition hover:border-white/30 disabled:opacity-40 ${
              feedbackCue === "pass"
                ? "border-[#ff5d75] bg-[#1a080d] shadow-[0_0_28px_rgba(255,93,117,0.22)]"
                : "border-white/12 hover:border-white/20"
            }`}
          >
            <X className="size-4" />
            Pass
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => commitSwipe("like")}
            disabled={isSwipeAnimating}
            className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-4 text-sm font-semibold text-[#111111] transition hover:shadow-[0_0_28px_rgba(255,234,0,0.4)] disabled:opacity-40 ${
              feedbackCue === "like"
                ? "bg-[#f4ff8a] shadow-[0_0_28px_rgba(255,234,0,0.35)]"
                : "bg-[#ffea00]"
            }`}
          >
            <Check className="size-4" />
            Save
          </motion.button>
        </div>

        {isSyncingVote ? (
          <div className="mt-5 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-neon">
            <LoaderCircle className="size-3.5 animate-spin" />
            saving
          </div>
        ) : null}
      </aside>
    </section>
  );

  const chatsView = (
    <section className="grid h-full min-h-0 gap-0 overflow-hidden rounded-3xl border border-white/10 bg-[#111111]/80 lg:grid-cols-[340px_1fr]">
      {/* Sidebar - Chat List */}
      <div className="flex min-h-0 flex-col border-b border-white/10 bg-[#0a0a0a]/50 lg:border-b-0 lg:border-r lg:border-white/10">
        <div className="flex-none p-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#00ff94]">
            Your Matches
          </p>
        </div>
        <div className="soft-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {sortedMatches.length ? (
            sortedMatches.map((room) => (
              <Button
                key={room.matchId}
                type="button"
                variant="ghost"
                onClick={() => setSelectedMatchId(room.matchId)}
                className={`h-auto w-full justify-start rounded-xl p-3 text-left transition-all ${
                  selectedRoom?.matchId === room.matchId
                    ? "bg-[#00ff94]/10 border border-[#00ff94]/30"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="relative">
                    <Image
                      src={room.profile.avatar}
                      alt={room.profile.name}
                      width={48}
                      height={48}
                      className="size-12 rounded-full object-cover ring-2 ring-white/10"
                    />
                    {selectedRoom?.matchId === room.matchId && (
                      <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-[#00ff94] ring-2 ring-[#111111]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-white">
                        {room.profile.name}
                      </p>
                      <span className="text-xs font-bold text-[#00ff94]">
                        {room.compatibility}%
                      </span>
                    </div>
                    <p className="truncate text-xs text-zinc-400 mt-0.5">
                      {room.latestMessage?.body ?? room.dateIdea.title}
                    </p>
                  </div>
                </div>
              </Button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="size-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <MessageCircle className="size-6 text-zinc-500" />
              </div>
              <p className="text-sm text-zinc-400">
                No matches yet. Save date ideas in Discover to get matched!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex min-h-0 flex-col bg-[#080808]/30">
        {threadData ? (
          <>
            {/* Header */}
            <div className="flex-none border-b border-white/10 bg-[#111111]/80 backdrop-blur-sm px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image
                    src={threadData.profile.avatar}
                    alt={threadData.profile.name}
                    width={48}
                    height={48}
                    className="size-12 rounded-full object-cover ring-2 ring-[#00ff94]/30"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {threadData.profile.name}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Matched on <span className="text-[#ffea00]">{threadData.dateIdea.title}</span>
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMatchProfile(true)}
                >
                  View Profile
                </Button>
              </div>
              {threadData.conciergeSummary && (
                <p className="mt-3 text-sm text-zinc-400 border-l-2 border-[#ffea00] pl-3">
                  {threadData.conciergeSummary}
                </p>
              )}
            </div>

            {/* Messages */}
            <div className="soft-scrollbar flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {threadData.messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex items-end gap-2 ${
                    message.authorType === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  {message.authorType === "user" ? (
                    <Image
                      src={guestProfile.avatar}
                      alt={guestProfile.name}
                      width={32}
                      height={32}
                      className="size-8 rounded-full object-cover ring-1 ring-white/10"
                    />
                  ) : message.authorType === "match" ? (
                    <Image
                      src={threadData.profile.avatar}
                      alt={threadData.profile.name}
                      width={32}
                      height={32}
                      className="size-8 rounded-full object-cover ring-1 ring-[#00ff94]/30"
                    />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-full bg-[#1c1c1c] ring-1 ring-[#ffea00]/30">
                      <Bot className="size-4 text-[#ffea00]" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                      message.authorType === "user"
                        ? "bg-[#ffea00] text-[#111111] rounded-br-md"
                        : message.authorType === "agent"
                          ? "bg-[#1c1c1c] border border-[#ffea00]/20 text-white rounded-bl-md"
                          : "bg-[#00ff94] text-[#111111] rounded-bl-md"
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider mb-1 ${
                      message.authorType === "user" || message.authorType === "match"
                        ? "text-black/60"
                        : "text-[#ffea00]/70"
                    }`}>
                      {message.authorType === "agent" ? (
                        <Bot className="size-3" />
                      ) : (
                        <MessageCircle className="size-3" />
                      )}
                      {message.authorType === "user"
                        ? "You"
                        : message.authorType === "match"
                          ? threadData.profile.name
                          : "Chem"}
                      <span className="opacity-60">{formatMessageTime(message.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-[15px] leading-7 tracking-[0.01em] [overflow-wrap:anywhere]">
                      {message.body}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing Indicators */}
              {isAgentThinking && (
                <div className="flex items-end gap-2">
                  <div className="flex size-8 items-center justify-center rounded-full bg-[#1c1c1c] ring-1 ring-[#ffea00]/30">
                    <Bot className="size-4 text-[#ffea00]" />
                  </div>
                  <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-[#1c1c1c] border border-white/10 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[#ffea00]/70 mb-1">
                      <Bot className="size-3" />
                      Chem
                    </div>
                    <div className="flex gap-1">
                      <span className="size-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="size-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="size-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {isMatchThinking && (
                <div className="flex items-end gap-2">
                  <Image
                    src={threadData.profile.avatar}
                    alt={threadData.profile.name}
                    width={32}
                    height={32}
                    className="size-8 rounded-full object-cover ring-1 ring-[#00ff94]/30"
                  />
                  <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-[#00ff94] text-[#111111] px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-black/60 mb-1">
                      <MessageCircle className="size-3" />
                      {threadData.profile.name}
                    </div>
                    <div className="flex gap-1">
                      <span className="size-2 rounded-full bg-black/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="size-2 rounded-full bg-black/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="size-2 rounded-full bg-black/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Panel */}
            {showMatchProfile && (
              <div className="absolute inset-y-0 right-0 z-20 w-full max-w-sm border-l border-white/10 bg-[#111111] shadow-2xl">
                <div className="flex h-full flex-col">
                  <div className="flex-none border-b border-white/10 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#00ff94]">Profile</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowMatchProfile(false)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="soft-scrollbar flex-1 overflow-y-auto p-4">
                    <Image
                      src={threadData.profile.avatar}
                      alt={threadData.profile.name}
                      width={300}
                      height={300}
                      className="w-full aspect-square rounded-2xl object-cover ring-2 ring-white/10"
                    />
                    <h4 className="mt-4 text-xl font-bold text-white">{threadData.profile.name}</h4>
                    <p className="text-sm text-zinc-400 mt-1">
                      {threadData.profile.age} · {threadData.profile.location} · {threadData.profile.occupation}
                    </p>
                    <p className="mt-4 text-sm text-zinc-300 leading-relaxed">
                      {threadData.profile.bio}
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-[#1c1c1c] border border-white/10 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Gender</p>
                        <p className="text-sm font-medium text-white mt-1">{threadData.profile.gender}</p>
                      </div>
                      <div className="rounded-xl bg-[#1c1c1c] border border-white/10 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Interested In</p>
                        <p className="text-sm font-medium text-white mt-1">{threadData.profile.interestedIn.join(", ")}</p>
                      </div>
                      <div className="col-span-2 rounded-xl bg-[#1c1c1c] border border-white/10 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Vibe</p>
                        <p className="text-sm font-medium text-white mt-1">{threadData.profile.vibe}</p>
                      </div>
                      <div className="col-span-2 rounded-xl bg-[#1c1c1c] border border-white/10 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Interests</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {threadData.profile.interests.map((interest) => (
                            <span key={interest} className="text-xs px-2 py-1 rounded-full bg-[#00ff94]/10 text-[#00ff94] border border-[#00ff94]/20">
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Composer */}
            <div className="flex-none border-t border-white/10 bg-[#111111]/80 backdrop-blur-sm px-6 py-4">
              {chatError ? (
                <p className="mb-2 text-xs text-[#ff8c69]">{chatError}</p>
              ) : null}
              <p className="mb-2 text-xs text-zinc-500">
                Type <span className="text-[#00ff94]">@chem</span> or <span className="text-[#ffea00]">@{threadData.profile.name.toLowerCase().replace(/\s+/g, '-')}</span> to mention
              </p>
              <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm leading-6 whitespace-pre-wrap break-words text-transparent">
                    {renderHighlightedComposerText(draftMessage, matchMention)}
                  </div>
                  <Textarea
                    ref={composerRef}
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    onSelect={(event) => setComposerCaret(event.currentTarget.selectionStart ?? 0)}
                    onKeyUp={(event) => setComposerCaret(event.currentTarget.selectionStart ?? 0)}
                    onClick={(event) => setComposerCaret(event.currentTarget.selectionStart ?? 0)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder="Message the room..."
                    rows={1}
                    className="relative z-10 min-h-[48px] w-full resize-none rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm leading-6 text-transparent caret-white outline-none placeholder:text-zinc-500 focus:border-[#00ff94] focus:ring-2 focus:ring-[#00ff94]/20"
                  />
                  {activeMention && mentionOptions.length > 0 && (
                    <div className="absolute inset-x-0 bottom-full mb-2 z-20 rounded-xl border border-white/10 bg-[#1c1c1c] p-2 shadow-2xl">
                      {mentionOptions.map((option, index) => (
                        <button
                          key={option.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyMention(option.value)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                            index === selectedMentionIndex ? "bg-[#00ff94]/10 text-white" : "text-zinc-300 hover:bg-white/5"
                          }`}
                        >
                          <div>
                            <span className="text-[#00ff94]">{option.label}</span>
                            <span className="text-xs text-zinc-500 ml-2">{option.caption}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  variant="neon"
                  size="icon"
                  disabled={isSendingMessage || !draftMessage.trim()}
                  className="size-10 rounded-full"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="size-16 rounded-full bg-[#ffea00]/10 flex items-center justify-center mb-4">
              <MessageCircle className="size-8 text-[#ffea00]" />
            </div>
            <h3 className="text-xl font-semibold text-white">Select a match to start chatting</h3>
            <p className="mt-2 text-sm text-zinc-400 max-w-xs">
              Your matches will appear here. Swipe on date ideas in Discover to get matched!
            </p>
          </div>
        )}
      </div>
    </section>
  );

  const profileView = (
    <section className="h-full overflow-hidden rounded-3xl border border-white/10 bg-[#111111]/80">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex-none border-b border-white/10 px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ffea00]">Your Profile</p>
              <h3 className="text-2xl font-bold text-white">Edit your profile</h3>
            </div>
            <Button type="submit" variant="default" size="lg">
              <Check className="size-5 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Full Page Content */}
        <form onSubmit={handleSaveProfile} className="flex-1 p-8">
          <div className="grid h-full gap-8 lg:grid-cols-[1fr_380px]">
            {/* Left - Form Fields */}
            <div className="flex flex-col justify-center space-y-6">
              {/* Section: Basic Info */}
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Basic Info</p>
                <div className="grid grid-cols-2 gap-4">
                  <Label>
                    <span className="text-sm text-zinc-400">Name</span>
                    <Input
                      value={profileDraft.name}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
                      className="h-14 text-lg"
                    />
                  </Label>
                  <Label>
                    <span className="text-sm text-zinc-400">Age</span>
                    <Input
                      value={profileDraft.age}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, age: event.target.value }))}
                      className="h-14 text-lg"
                    />
                  </Label>
                  <Label>
                    <span className="text-sm text-zinc-400">Location</span>
                    <Input
                      value={profileDraft.location}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, location: event.target.value }))}
                      className="h-14 text-lg"
                    />
                  </Label>
                  <Label>
                    <span className="text-sm text-zinc-400">Work</span>
                    <Input
                      value={profileDraft.occupation}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, occupation: event.target.value }))}
                      className="h-14 text-lg"
                    />
                  </Label>
                </div>
              </div>

              {/* Section: Identity */}
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Identity</p>
                <div className="grid grid-cols-3 gap-4">
                  <Label>
                    <span className="text-sm text-zinc-400">Gender</span>
                    <Input
                      value={profileDraft.gender}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, gender: event.target.value }))}
                      className="h-14 text-lg"
                    />
                  </Label>
                  <Label>
                    <span className="text-sm text-zinc-400">Pronouns</span>
                    <Input
                      value={profileDraft.pronouns}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, pronouns: event.target.value }))}
                      className="h-14 text-lg"
                    />
                  </Label>
                  <Label>
                    <span className="text-sm text-zinc-400">Interested In</span>
                    <Input
                      value={profileDraft.interestedIn}
                      onChange={(event) => setProfileDraft((current) => ({ ...current, interestedIn: event.target.value }))}
                      className="h-14 text-lg"
                    />
                  </Label>
                </div>
              </div>

              {/* Section: About */}
              <div className="grid grid-cols-2 gap-4">
                <Label>
                  <span className="text-sm text-zinc-400">Your Vibe</span>
                  <Input
                    value={profileDraft.vibe}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, vibe: event.target.value }))}
                    className="h-14 text-lg"
                  />
                </Label>
                <Label>
                  <span className="text-sm text-zinc-400">Interests (comma separated)</span>
                  <Input
                    value={profileDraft.interests}
                    onChange={(event) => setProfileDraft((current) => ({ ...current, interests: event.target.value }))}
                    className="h-14 text-lg"
                  />
                </Label>
              </div>

              {/* Bio - Full Width */}
              <Label>
                <span className="text-sm text-zinc-400">Bio</span>
                <Textarea
                  rows={3}
                  value={profileDraft.bio}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))}
                  className="resize-none text-base"
                />
              </Label>
            </div>

            {/* Right - Large Preview */}
            <div className="flex flex-col justify-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#00ff94] mb-4">Profile Preview</p>
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#1c1c1c] shadow-2xl">
                {/* Cover */}
                <div className="h-32 bg-gradient-to-r from-[#ffea00]/30 via-[#00ff94]/20 to-[#1b3a2e]" />
                {/* Content */}
                <div className="relative px-6 pb-6">
                  <div className="-mt-16 mb-4">
                    <Image
                      src={guestProfile.avatar}
                      alt={guestProfile.name}
                      width={120}
                      height={120}
                      className="size-28 rounded-full object-cover ring-4 ring-[#1c1c1c]"
                    />
                  </div>
                  <h4 className="text-2xl font-bold text-white">{guestProfile.name}</h4>
                  <p className="text-sm text-zinc-400">{guestProfile.age} years old · {guestProfile.location}</p>
                  <p className="mt-1 text-sm font-medium text-[#ffea00]">{guestProfile.occupation}</p>

                  {guestProfile.vibe && (
                    <div className="mt-4">
                      <span className="inline-flex items-center rounded-full bg-[#ffea00]/10 px-4 py-1.5 text-sm font-medium text-[#ffea00] ring-1 ring-[#ffea00]/20">
                        {guestProfile.vibe}
                      </span>
                    </div>
                  )}

                  {guestProfile.bio && (
                    <p className="mt-4 text-sm text-zinc-300 leading-relaxed">{guestProfile.bio}</p>
                  )}

                  {/* Stats Grid */}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-[#111111]/50 p-3">
                      <p className="text-xs uppercase tracking-wider text-zinc-500">Gender</p>
                      <p className="mt-1 text-sm text-white">{guestProfile.gender}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#111111]/50 p-3">
                      <p className="text-xs uppercase tracking-wider text-zinc-500">Pronouns</p>
                      <p className="mt-1 text-sm text-white">{guestProfile.pronouns}</p>
                    </div>
                  </div>

                  {/* Interests */}
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {guestProfile.interests.map((interest) => (
                        <span key={interest} className="rounded-full bg-white/5 px-3 py-1 text-sm text-zinc-300 ring-1 ring-white/10">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </section>
  );

  return (
    <main className="h-[100svh] overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex h-full w-full max-w-[1480px] flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex flex-none items-center justify-between rounded-[28px] border border-white/10 bg-black/34 px-4 py-3">
          <div className="flex items-center gap-4">
            <LogoMark compact />
            <div className="hidden md:block">
              <p className="text-sm font-medium text-white">{guestProfile.name}</p>
            </div>
          </div>

          <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 p-1">
            {tabMeta.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                type="button"
                variant={activeTab === id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                  activeTab === id ? "" : "text-zinc-300 hover:text-white"
                }`}
              >
                <Icon className="size-4" />
                {label}
                {id === "chats" && sortedMatches.length ? (
                  <span className="rounded-full bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white">
                    {sortedMatches.length}
                  </span>
                ) : null}
              </Button>
            ))}
          </nav>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === "discover" ? (
            <motion.div
              key="discover"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="min-h-0 flex-1 overflow-hidden"
            >
              {discoverView}
            </motion.div>
          ) : null}

          {activeTab === "chats" ? (
            <motion.div
              key="chats"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="min-h-0 flex-1 overflow-hidden"
            >
              {chatsView}
            </motion.div>
          ) : null}

          {activeTab === "profile" ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="min-h-0 flex-1 overflow-hidden"
            >
              {profileView}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}
