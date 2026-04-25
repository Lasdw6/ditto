"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ImagePlus, SkipForward, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { LogoMark } from "@/components/logo-mark";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createGuestProfile,
  guestProfileStorageKey,
  parseGuestProfile,
  serializeGuestProfile,
} from "@/lib/guest-profile";

type StepKey =
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
  | "avatar";

type Step = {
  key: StepKey;
  eyebrow: string;
  title: string;
  description: string;
  placeholder?: string;
  multiline?: boolean;
  optional?: boolean;
};

type IntroStep = {
  eyebrow: string;
  title: string;
  description: string;
};

const introSteps: IntroStep[] = [
  {
    eyebrow: "Welcome",
    title: "Welcome to\nYour Chemical\nRomance.",
    description: "",
  },
  {
    eyebrow: "How it works",
    title: "You swipe on\n date ideas\nyou like.",
    description:
      "Rate the kinds of dates you would actually want to go on.",
  },
  {
    eyebrow: "Chem",
    title: "Chem sets you up\nfor a fun date.",
    description:
      "Our agent matches you with someone it thinks you will actually have fun with. Are you ready?",
  },
];

const steps: Step[] = [
  {
    key: "name",
    eyebrow: "Profile setup",
    title: "What should people call you?",
    description: "Use the name you want the match agent and the chat rooms to use.",
    placeholder: "Sloane",
  },
  {
    key: "age",
    eyebrow: "Profile setup",
    title: "How old are you?",
    description: "Keep it simple. This is just part of your matching context.",
    placeholder: "28",
  },
  {
    key: "location",
    eyebrow: "Profile setup",
    title: "What city are you in?",
    description: "The agent uses this to keep date ideas and matches local.",
    placeholder: "Toronto",
  },
  {
    key: "gender",
    eyebrow: "Profile setup",
    title: "How do you identify?",
    description: "Keep it simple for dating context.",
    placeholder: "woman, man, or other",
  },
  {
    key: "interestedIn",
    eyebrow: "Profile setup",
    title: "Who are you into?",
    description: "You can include one or more options, separated by commas.",
    placeholder: "men, women, other",
  },
  {
    key: "pronouns",
    eyebrow: "Profile setup",
    title: "What pronouns should we use?",
    description: "This shows up in your profile and helps the app speak correctly.",
    placeholder: "she/they",
  },
  {
    key: "occupation",
    eyebrow: "Profile setup",
    title: "What do you do?",
    description: "A short work or role label is enough.",
    placeholder: "Art director",
  },
  {
    key: "vibe",
    eyebrow: "Profile setup",
    title: "How would you describe your vibe?",
    description: "A short line works better than a paragraph here.",
    placeholder: "Electric but intentional",
  },
  {
    key: "bio",
    eyebrow: "Profile setup",
    title: "What kind of first dates feel like you?",
    description: "Write one or two lines. This becomes part of your matching context.",
    placeholder: "Live music, tactile classes, strange little bars, and people open to the second stop.",
    multiline: true,
  },
  {
    key: "interests",
    eyebrow: "Profile setup",
    title: "What are you into?",
    description: "Comma-separated is fine. Think taste, hobbies, scenes, or rituals.",
    placeholder: "live music, vinyl, bookstores, night markets",
  },
  {
    key: "avatar",
    eyebrow: "Optional",
    title: "Add a photo if you want.",
    description: "You can upload one now or skip it. The app will still work without it.",
    optional: true,
  },
];

const ageOptions = Array.from({ length: 43 }, (_, index) => String(index + 18));
const genderOptions = ["woman", "man", "other"];
const interestedInOptions = ["women", "men", "other"];
const pronounOptions = ["she/her", "he/him", "they/them", "she/they", "he/they"];
const vibeOptions = [
  "Electric but intentional",
  "Warm and playful",
  "Low-key and magnetic",
  "Sharp and social",
  "Calm with a wild streak",
  "Soft-spoken but funny",
];

export function ProfileSetupFlow() {
  const router = useRouter();
  const [introIndex, setIntroIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [customGender, setCustomGender] = useState("");
  const [form, setForm] = useState({
    name: "",
    age: "",
    location: "",
    gender: "",
    interestedIn: "",
    pronouns: "",
    occupation: "",
    vibe: "",
    bio: "",
    interests: "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const currentStep = steps[stepIndex];
  const showIntro = introIndex < introSteps.length;
  const currentIntro = introSteps[introIndex];

  useEffect(() => {
    const existing = parseGuestProfile(window.localStorage.getItem(guestProfileStorageKey));

    if (existing) {
      router.replace("/app");
    }
  }, [router]);

  const canContinue = useMemo(() => {
    if (currentStep.key === "avatar") {
      return true;
    }
    if (currentStep.key === "gender") {
      return form.gender === "other"
        ? customGender.trim().length > 0
        : form.gender.trim().length > 0;
    }
    return form[currentStep.key].trim().length > 0;
  }, [currentStep.key, customGender, form]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleNext() {
    if (stepIndex === steps.length - 1) {
      const profile = createGuestProfile({
        name: form.name.trim(),
        age: Number(form.age) || 25,
        location: form.location.trim(),
        gender: form.gender === "other" ? customGender.trim() || "other" : form.gender.trim(),
        interestedIn: form.interestedIn
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        pronouns: form.pronouns.trim(),
        occupation: form.occupation.trim(),
        vibe: form.vibe.trim(),
        bio: form.bio.trim(),
        interests: form.interests
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        avatar: avatarPreview ?? undefined,
      });

      const nextProfile = avatarPreview ? { ...profile, avatar: avatarPreview } : profile;
      window.localStorage.setItem(
        guestProfileStorageKey,
        serializeGuestProfile(nextProfile),
      );
      router.push("/app");
      return;
    }

    setStepIndex((index) => index + 1);
  }

  function handleBack() {
    if (showIntro) {
      if (introIndex === 0) {
        router.push("/");
        return;
      }

      setIntroIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (stepIndex === 0) {
      setIntroIndex(introSteps.length - 1);
      return;
    }

    setStepIndex((index) => Math.max(0, index - 1));
  }

  function handleContinue() {
    if (showIntro) {
      setIntroIndex((index) =>
        index < introSteps.length - 1 ? index + 1 : introSteps.length,
      );
      return;
    }

    if (canContinue) {
      handleNext();
    }
  }

  function handleStepKeyDown(
    event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleContinue();
  }

  function handleIntroKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleContinue();
  }

  function toggleInterestedIn(option: string) {
    const selected = form.interestedIn
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const next = selected.includes(option)
      ? selected.filter((value) => value !== option)
      : [...selected, option];

    setForm((current) => ({
      ...current,
      interestedIn: next.join(", "),
    }));
  }

  const selectedInterestedIn = form.interestedIn
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative isolate min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,234,0,0.18),transparent_20%),radial-gradient(circle_at_82%_62%,rgba(0,255,148,0.1),transparent_24%),linear-gradient(135deg,#040404_0%,#090909_48%,#0f1614_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-5 py-6 sm:px-8 lg:px-10">
          <div className="pt-2">
            <LogoMark compact />
          </div>

          <div
            className="grid flex-1 items-center gap-14 py-10 lg:grid-cols-[0.92fr_1.08fr]"
            onKeyDown={showIntro ? handleIntroKeyDown : undefined}
          >
            <div className="max-w-xl">
              {showIntro ? (
                <>
                  <motion.p
                    key={`${introIndex}-eyebrow`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="font-mono text-xs uppercase tracking-[0.34em] text-neon"
                  >
                    {currentIntro.eyebrow}
                  </motion.p>
                  <motion.h1
                    key={`${introIndex}-title`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.05 }}
                    className="mt-8"
                  >
                    {introIndex === 0 ? (
                      <Image
                        src="/brand-extracted/logo-wordmark-tight-transparent.png"
                        alt="Your Chemical Romance"
                        width={460}
                        height={300}
                        className="h-auto w-full max-w-[22rem] sm:max-w-[26rem] lg:max-w-[30rem]"
                        priority
                      />
                    ) : (
                      <span className="text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl lg:text-[5.25rem] lg:leading-[0.92]">
                        {currentIntro.title.split("\n").map((line, index) => (
                          <span key={`${line}-${index}`}>
                            {line}
                            {index < currentIntro.title.split("\n").length - 1 ? <br /> : null}
                          </span>
                        ))}
                      </span>
                    )}
                  </motion.h1>
                  <motion.p
                    key={`${introIndex}-description`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.12 }}
                    className="mt-6 max-w-lg text-lg leading-8 text-zinc-300"
                  >
                    {currentIntro.description}
                  </motion.p>

                  <div className="mt-8 flex items-center gap-2 pt-2">
                    {introSteps.map((_, index) => (
                      <span
                        key={`intro-dot-${index}`}
                        className={`h-1.5 rounded-full transition-all ${
                          index === introIndex ? "w-8 bg-acid" : "w-2 bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="font-mono text-xs uppercase tracking-[0.34em] text-neon">
                    {currentStep.eyebrow}
                  </p>
                  <h1 className="mt-8 text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl lg:text-[5.25rem] lg:leading-[0.92]">
                    {currentStep.title}
                  </h1>
                  <p className="mt-6 text-lg leading-8 text-zinc-300">
                    {currentStep.description}
                  </p>

                  <div className="mt-10 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#ffe600_0%,#00ff94_100%)] transition-all duration-300"
                      style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.28em] text-zinc-500">
                    Step {stepIndex + 1} / {steps.length}
                  </p>
                </>
              )}
            </div>

            <div className="rounded-[34px] border border-white/10 bg-black/32 p-6 sm:p-8 lg:p-10">
              {showIntro ? (
                <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_50%_20%,rgba(255,230,0,0.08),transparent_30%),radial-gradient(circle_at_70%_80%,rgba(0,255,148,0.08),transparent_34%),rgba(255,255,255,0.02)] p-8">
                  {introIndex === 0 ? (
                    <div className="text-center">
                      <Image
                        src="/brand-extracted/logo-icon-transparent.png"
                        alt="Your Chemical Romance icon"
                        width={160}
                        height={180}
                        className="mx-auto h-auto w-32 sm:w-36"
                        priority
                      />
                    </div>
                  ) : introIndex === 1 ? (
                    <div className="text-center">
                      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-acid">
                        Swipe
                      </p>
                      <p className="mt-5 text-lg leading-8 text-zinc-300">
                        Save the date ideas that feel right.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-neon">
                        Chem
                      </p>
                      <p className="mt-5 text-lg leading-8 text-zinc-300">
                        Chem opens the room when the match feels worth meeting.
                      </p>
                    </div>
                  )}
                </div>
              ) : currentStep.key === "avatar" ? (
                <div className="space-y-6">
                  <div className="flex min-h-[320px] items-center justify-center rounded-3xl border-2 border-dashed border-white/10 bg-black/30 p-6 transition-colors hover:border-[#00ff94]/30 hover:bg-black/40">
                    {avatarPreview ? (
                      <div className="text-center">
                        <div className="relative mx-auto">
                          <Image
                            src={avatarPreview}
                            alt="Profile preview"
                            width={240}
                            height={240}
                            className="mx-auto size-44 rounded-full object-cover ring-2 ring-[#00ff94] shadow-[0_0_30px_rgba(0,255,148,0.3)]"
                          />
                          <button
                            type="button"
                            onClick={() => setAvatarPreview(null)}
                            className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-[#ff5d75] text-white shadow-lg"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                        <p className="mt-5 text-sm text-[#00ff94]">Photo added</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="mx-auto flex size-20 items-center justify-center rounded-full border-2 border-white/10 bg-black/50">
                          <ImagePlus className="size-8 text-[#00ff94]" />
                        </div>
                        <p className="mt-5 text-lg font-medium text-white">Upload a profile photo</p>
                        <p className="mt-2 text-sm text-zinc-400">
                          JPG, PNG, or WEBP. This step is optional.
                        </p>
                      </div>
                    )}
                  </div>

                  <label className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-[#ffea00]/30 bg-[#ffea00]/10 px-6 py-3 text-sm font-medium text-[#ffea00] transition-all hover:border-[#ffea00] hover:bg-[#ffea00]/20 hover:shadow-[0_0_20px_rgba(255,234,0,0.2)]">
                    <ImagePlus className="size-4 transition-transform group-hover:scale-110" />
                    {avatarPreview ? "Change photo" : "Choose a photo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              ) : currentStep.key === "age" ? (
                <Select
                  value={form.age}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, age: value || "" }))
                  }
                >
                  <SelectTrigger size="lg" className="w-full">
                    <SelectValue placeholder="Select your age" />
                  </SelectTrigger>
                  <SelectContent>
                    {ageOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : currentStep.key === "gender" ? (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    {genderOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({ ...current, gender: option }))
                        }
                        className={`flex h-16 items-center justify-between rounded-2xl border px-6 text-xl font-medium transition-all ${
                          form.gender === option
                            ? "border-[#ffea00] bg-[#ffea00] text-[#111111] shadow-[0_0_20px_rgba(255,234,0,0.3)]"
                            : "border-white/10 bg-black/40 text-white hover:border-white/20"
                        }`}
                      >
                        <span className="capitalize">{option}</span>
                        {form.gender === option && (
                          <Check className="size-5" />
                        )}
                      </button>
                    ))}
                  </div>
                  {form.gender === "other" ? (
                    <Input
                      value={customGender}
                      onChange={(event) => setCustomGender(event.target.value)}
                      onKeyDown={handleStepKeyDown}
                      placeholder="Tell us how you identify"
                      className="h-16"
                      autoFocus
                    />
                  ) : null}
                </div>
              ) : currentStep.key === "interestedIn" ? (
                <div className="grid gap-3">
                  {interestedInOptions.map((option) => {
                    const selected = selectedInterestedIn.includes(option);

                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => toggleInterestedIn(option)}
                        className={`flex h-16 items-center justify-between rounded-2xl border px-6 text-xl font-medium capitalize transition-all ${
                          selected
                            ? "border-[#00ff94] bg-[#00ff94] text-[#111111] shadow-[0_0_20px_rgba(0,255,148,0.3)]"
                            : "border-white/10 bg-black/40 text-white hover:border-white/20"
                        }`}
                      >
                        <span>{option}</span>
                        {selected && <Check className="size-5" />}
                      </button>
                    );
                  })}
                </div>
              ) : currentStep.key === "pronouns" ? (
                <div className="grid gap-3">
                  {pronounOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({ ...current, pronouns: option }))
                      }
                      className={`flex h-16 items-center justify-between rounded-2xl border px-6 text-xl font-medium transition-all ${
                        form.pronouns === option
                          ? "border-[#ffea00] bg-[#ffea00] text-[#111111] shadow-[0_0_20px_rgba(255,234,0,0.3)]"
                          : "border-white/10 bg-black/40 text-white hover:border-white/20"
                      }`}
                    >
                      <span>{option}</span>
                      {form.pronouns === option && <Check className="size-5" />}
                    </button>
                  ))}
                </div>
              ) : currentStep.key === "vibe" ? (
                <div className="grid gap-3">
                  {vibeOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({ ...current, vibe: option }))
                      }
                      className={`flex h-16 items-center justify-between rounded-2xl border px-6 text-lg font-medium transition-all ${
                        form.vibe === option
                          ? "border-[#00ff94] bg-[#00ff94] text-[#111111] shadow-[0_0_20px_rgba(0,255,148,0.3)]"
                          : "border-white/10 bg-black/40 text-white hover:border-white/20"
                      }`}
                    >
                      <span>{option}</span>
                      {form.vibe === option && <Check className="size-5" />}
                    </button>
                  ))}
                </div>
              ) : currentStep.multiline ? (
                <Textarea
                  rows={6}
                  value={form[currentStep.key]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [currentStep.key]: event.target.value,
                    }))
                  }
                  placeholder={currentStep.placeholder}
                  className="min-h-[280px] text-lg"
                  autoFocus
                />
              ) : (
                <Input
                  value={form[currentStep.key]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [currentStep.key]: event.target.value,
                    }))
                  }
                  onKeyDown={handleStepKeyDown}
                  placeholder={currentStep.placeholder}
                  className="h-20 text-2xl"
                  autoFocus
                />
              )}

              <div className="mt-8 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="rounded-full"
                >
                  <ArrowLeft className="size-4" />
                  {showIntro && introIndex === 0 ? "Back home" : "Back"}
                </Button>

                <div className="flex items-center gap-3">
                  {!showIntro && currentStep.optional ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleNext}
                      className="rounded-full"
                    >
                      <SkipForward className="size-4" />
                      Skip
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    variant="default"
                    onClick={handleContinue}
                    disabled={showIntro ? false : !canContinue}
                    className="rounded-full"
                  >
                    {showIntro ? (
                      <>
                        {introIndex === introSteps.length - 1 ? "Start profile" : "Continue"}
                        <ArrowRight className="size-4" />
                      </>
                    ) : stepIndex === steps.length - 1 ? (
                      <>
                        <Check className="size-4" />
                        Finish setup
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
