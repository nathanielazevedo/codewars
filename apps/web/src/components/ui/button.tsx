import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_8px_24px_-6px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_10px_30px_-6px_hsl(var(--primary)/0.55)]',
        primary:
          'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_0_1px_hsl(var(--primary)/0.25),0_8px_24px_-6px_hsl(var(--primary)/0.4)]',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-[0_0_0_1px_hsl(var(--secondary)/0.25),0_8px_24px_-6px_hsl(var(--secondary)/0.4)]',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-border bg-card/40 backdrop-blur hover:border-primary/50 hover:bg-accent hover:text-foreground',
        ghost:
          'hover:bg-accent hover:text-foreground text-muted-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        neon:
          'bg-transparent border border-primary/50 text-primary hover:bg-primary/10 hover:border-primary shadow-[inset_0_0_16px_-4px_hsl(var(--primary)/0.25),0_0_20px_-6px_hsl(var(--primary)/0.4)] hover:shadow-[inset_0_0_16px_-4px_hsl(var(--primary)/0.4),0_0_32px_-6px_hsl(var(--primary)/0.6)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-8 text-base',
        xl: 'h-14 rounded-lg px-10 text-base font-semibold',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export { Button, buttonVariants }
