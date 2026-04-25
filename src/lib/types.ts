export type ChatAuthor = "you" | "match" | "agent";

export type Profile = {
  id: string;
  name: string;
  age: number;
  location: string;
  gender: string;
  interestedIn: string[];
  pronouns: string;
  occupation: string;
  vibe: string;
  bio: string;
  interests: string[];
  chemistryNotes: string[];
  avatar: string;
};

export type DateIdea = {
  id: string;
  title: string;
  city: string;
  category: string;
  image: string;
  energy: "Low" | "Medium" | "High";
  budget: string;
  intro: string;
  whyItWorks: string;
  tags: string[];
};

export type ChatMessage = {
  id: string;
  author: ChatAuthor;
  text: string;
  createdAt: string;
};

export type LiveMatch = {
  id: string;
  profile: Profile;
  dateIdea: DateIdea;
  compatibility: number;
  rationale: string;
  starter: string;
  venueSuggestions: string[];
  transcript: ChatMessage[];
};

export type AgentRequestPayload = {
  user: Pick<Profile, "name" | "interests">;
  match: Pick<Profile, "name" | "interests">;
  dateIdea: Pick<DateIdea, "title" | "city" | "category" | "whyItWorks" | "tags">;
  transcript: ChatMessage[];
  message: string;
  memories: string[];
};

export type MatchmakeRequestPayload = {
  user: Pick<
    Profile,
    | "id"
    | "name"
    | "age"
    | "location"
    | "gender"
    | "interestedIn"
    | "pronouns"
    | "occupation"
    | "vibe"
    | "bio"
    | "interests"
    | "chemistryNotes"
    | "avatar"
  >;
  dateIdea: DateIdea;
  candidates: Profile[];
  memories: string[];
  swipeNote?: string;
  excludedProfileIds?: string[];
};
