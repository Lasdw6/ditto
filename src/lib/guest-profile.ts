import { currentUser } from "@/lib/demo-data";
import type { Profile } from "@/lib/types";

export const guestProfileStorageKey = "ycr-guest-profile";

export type GuestProfileInput = {
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
  avatar: string;
};

export function createGuestProfile(input?: Partial<GuestProfileInput>): Profile {
  const guestId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `guest-${crypto.randomUUID()}`
      : `guest-${Date.now()}`;

  return {
    ...currentUser,
    ...input,
    id: guestId,
    interests: input?.interests?.length ? input.interests : currentUser.interests,
    chemistryNotes: currentUser.chemistryNotes,
    avatar: `https://picsum.photos/seed/${guestId}/200/200`,
  };
}

export function serializeGuestProfile(profile: Profile) {
  return JSON.stringify(profile);
}

export function parseGuestProfile(raw: string | null): Profile | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Profile>;

    return {
      ...currentUser,
      ...parsed,
      gender: parsed.gender ?? currentUser.gender,
      interestedIn:
        parsed.interestedIn && parsed.interestedIn.length
          ? parsed.interestedIn
          : currentUser.interestedIn,
      interests:
        parsed.interests && parsed.interests.length
          ? parsed.interests
          : currentUser.interests,
      chemistryNotes:
        parsed.chemistryNotes && parsed.chemistryNotes.length
          ? parsed.chemistryNotes
          : currentUser.chemistryNotes,
    };
  } catch {
    return null;
  }
}
