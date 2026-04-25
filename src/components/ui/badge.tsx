import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-all [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-[#ffea00]/15 text-[#ffea00] border-[#ffea00]/30",
        secondary: "bg-[#2a2a2a] text-white border-white/10",
        destructive: "bg-[#ff5d75]/10 text-[#ff5d75] border-[#ff5d75]/30",
        outline: "border-white/20 text-white bg-transparent",
        ghost: "bg-transparent text-zinc-400 hover:text-white",
        neon: "bg-[#00ff94]/15 text-[#00ff94] border-[#00ff94]/30",
        acid: "bg-[#ffea00] text-[#111111] border-[#ffea00] font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
