import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white transition-all outline-none placeholder:text-zinc-500 focus-visible:border-[#00ff94] focus-visible:ring-2 focus-visible:ring-[#00ff94]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-black/20 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
