import * as React from "react"
import { cn } from "cn"

// shadcn/ui Input with Dasta's field: 48 px tall, a visible edge (3:1 against the page), 16 px text
// so phones do not zoom on focus.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "block min-h-12 w-full min-w-0 rounded-xl border border-input bg-background px-4 py-2 text-base text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
