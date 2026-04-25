import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] focus-visible:ring-[#00ff94] active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#ffea00] text-[#111111] hover:bg-[#fff25b] font-semibold",
        outline:
          "border-white/10 bg-transparent text-white hover:bg-white/10 hover:border-white/20",
        secondary:
          "bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]",
        ghost:
          "hover:bg-white/10 hover:text-white text-zinc-300",
        destructive:
          "bg-[#ff5d75]/10 text-[#ff5d75] hover:bg-[#ff5d75]/20 border-[#ff5d75]/30",
        link: "text-[#00ff94] underline-offset-4 hover:underline",
        neon: "bg-[#00ff94] text-[#111111] hover:bg-[#52ffb6] font-semibold",
        acid: "bg-[#ffea00] text-[#111111] hover:bg-[#fff25b] font-semibold shadow-[0_0_20px_rgba(255,234,0,0.3)]",
      },
      size: {
        default: "h-10 gap-2 px-5",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs",
        sm: "h-8 gap-1.5 rounded-md px-3 text-xs",
        lg: "h-12 gap-2 rounded-xl px-6 text-base",
        xl: "h-14 gap-3 rounded-xl px-8 text-base",
        icon: "size-10",
        "icon-xs": "size-7 rounded-md",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
