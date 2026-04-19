import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-border bg-muted text-foreground',
        primary: 'border-primary/40 bg-primary/10 text-primary',
        secondary: 'border-secondary/40 bg-secondary/10 text-secondary',
        amber: 'border-arena-amber/40 bg-arena-amber/10 text-arena-amber',
        rose: 'border-arena-rose/40 bg-arena-rose/10 text-arena-rose',
        emerald: 'border-arena-emerald/40 bg-arena-emerald/10 text-arena-emerald',
        outline: 'border-border text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
