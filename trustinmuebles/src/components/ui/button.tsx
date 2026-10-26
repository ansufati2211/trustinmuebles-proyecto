import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg:last-child:not(:first-child)]:translate-x-0.5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/35",
        destructive:
          "bg-danger text-danger-foreground shadow-md shadow-danger/20 hover:-translate-y-0.5 hover:bg-danger/90 hover:shadow-lg hover:shadow-danger/30",
        outline:
          "border-2 border-border bg-card text-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary hover:bg-secondary hover:text-primary",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/25",
        ghost:
          "text-tinta-2 hover:bg-primary/10 hover:text-primary",
        link:
          "h-auto rounded-none p-0 text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 rounded-lg px-3.5 text-xs",
        lg: "h-14 rounded-2xl px-8 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }