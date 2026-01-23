import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
                secondary:
                    "border-transparent bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
                destructive:
                    "border-transparent bg-[var(--error)] text-white hover:bg-[var(--error)]/80",
                outline: "text-[var(--text-primary)] border-[var(--border)]",
                success:
                    "border-transparent bg-[var(--success)]/20 text-[var(--success)] hover:bg-[var(--success)]/30",
                warning:
                    "border-transparent bg-[var(--warning)]/20 text-[var(--warning)] hover:bg-[var(--warning)]/30",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={badgeVariants({ variant, className })} {...props} />
    )
}

export { Badge, badgeVariants }
