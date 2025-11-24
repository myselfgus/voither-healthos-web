import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-morphism rounded-[--radius-lg] p-10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
