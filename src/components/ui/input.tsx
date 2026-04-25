import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white placeholder:text-zinc-500 focus-visible:border-[#00ff94] focus-visible:ring-2 focus-visible:ring-[#00ff94]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-black/20 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
