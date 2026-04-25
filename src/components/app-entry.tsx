"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppWorkspace } from "@/components/app-workspace";
import { guestProfileStorageKey, parseGuestProfile } from "@/lib/guest-profile";

export function AppEntry() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready">("checking");

  useEffect(() => {
    const profile = parseGuestProfile(window.localStorage.getItem(guestProfileStorageKey));

    if (!profile) {
      router.replace("/app/setup");
      return;
    }

    setStatus("ready");
  }, [router]);

  if (status === "checking") {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center text-sm uppercase tracking-[0.24em] text-zinc-500">
          Loading profile
        </div>
      </main>
    );
  }

  return <AppWorkspace />;
}
