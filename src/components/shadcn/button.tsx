import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// shadcn/ui Button (Radix Slot), with Dasta's shapes: pill buttons, 44 px tall by default.
// The `.btn` classes in globals.css draw the same button for plain links and form buttons.
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full text-[15px] font-medium whitespace-nowrap transition-colors duration-200 select-none disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "bg-background text-foreground ring-1 ring-inset ring-input hover:bg-card",
        dark: "bg-foreground text-background hover:bg-foreground/85",
        onDark: "bg-white text-primary hover:bg-white/90",
        ghost: "hover:bg-card",
        destructive: "bg-background text-danger ring-1 ring-inset ring-danger hover:bg-danger-bg",
        link: "text-primary underline underline-offset-4",
      },
      size: {
        default: "min-h-11 px-5 py-2",
        sm: "min-h-10 px-4 text-[14px]",
        md: "min-h-12 px-5 text-base",
        lg: "min-h-13 px-7 text-[17px]",
        icon: "size-11",
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
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
