import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";

const researchPoints = [
  {
    label: "Novelty matters",
    body: "Shared novel experiences are linked to more closeness, less boredom, and stronger relationship quality.",
  },
  {
    label: "Dynamics beat stats",
    body: "What grows between two people tends to matter more than static profile traits alone.",
  },
];

const supportPoints = [
  {
    label: "Swipe on the date",
    body: "The first signal is the kind of night you would genuinely want, not a face card.",
  },
  {
    label: "Chem opens the room",
    body: "When the fit is strong, the concierge starts the intro and gets the conversation moving.",
  },
  {
    label: "Taste gets sharper",
    body: "What you save, reject, and talk about gradually improves the next match.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,234,0,0.2),transparent_22%),radial-gradient(circle_at_82%_54%,rgba(0,255,148,0.11),transparent_24%),linear-gradient(135deg,#030303_0%,#080808_48%,#0d1714_100%)]" />

        <div className="absolute inset-y-0 right-0 w-[52vw] min-w-[360px] opacity-40">
          <Image
            src="https://picsum.photos/seed/ycr-research-landing/1600/1900"
            alt="Atmospheric first date"
            fill
            priority
            sizes="52vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#050505_6%,rgba(5,5,5,0.88)_36%,rgba(5,5,5,0.28)_100%)]" />
        </div>

        <div className="relative z-10 flex min-h-[100svh] flex-col px-5 py-6 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-[1480px]">
            <div className="max-w-[28rem] sm:max-w-[32rem] lg:max-w-[36rem]">
              <LogoMark />
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-[1480px] flex-1 items-center py-8 sm:py-10 lg:py-12">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.34em] text-neon">
                Date-first dating
              </p>
              <h1 className="mt-6 text-5xl font-semibold tracking-[-0.07em] text-white sm:text-[4.4rem] lg:max-w-[10ch] lg:text-[5.8rem] lg:leading-[0.92]">
                Fun first dates
                <br />
                are how better
                <br />
                relationships start.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 sm:text-xl">
                You swipe on date ideas, not faces. Tell us what feels right, what feels off, and Chem matches you with someone you would actually have fun meeting.
              </p>

              <div className="mt-9">
                <Link
                  href="/app/setup"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ffea00] px-7 py-4 text-sm font-semibold text-[#111111] transition-all hover:bg-[#fff25b] hover:shadow-[0_0_30px_rgba(255,234,0,0.4)]"
                >
                  Start the setup
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/8 bg-[#050505]">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-10 px-5 py-14 sm:px-8 sm:py-16 lg:gap-12 lg:py-18">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-neon">
              Why this works
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-[2.45rem]">
              Better first dates create better openings.
            </h2>
            <p className="mt-4 text-base leading-8 text-zinc-300 sm:text-lg">
              The point is not to optimize static compatibility trivia. It is to start two people inside a setting that already gives the conversation momentum.
            </p>
          </div>

          {researchPoints.map((point) => (
            <div key={point.label} className="border-t border-white/10 pt-6">
              <div className="max-w-2xl">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-acid">
                  {point.label}
                </p>
                <p className="mt-3 text-base leading-8 text-zinc-300">
                  {point.body}
                </p>
              </div>
            </div>
          ))}

          <div className="border-t border-white/10 pt-6">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-neon">
                How it works
              </p>
              <p className="mt-3 text-base leading-8 text-zinc-300">
                Save the dates that feel right. Chem reads your profile, your reactions, and the details that show up over time, then opens a room with someone who fits the same kind of night.
              </p>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {supportPoints.map((point) => (
                <div key={point.label}>
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-400">
                    {point.label}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-zinc-300">
                    {point.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
