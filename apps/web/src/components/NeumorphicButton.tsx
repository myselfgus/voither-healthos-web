import { cn } from "@/lib/utils"
import { ArrowDown } from "@phosphor-icons/react"

interface NeumorphicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  showIcon?: boolean
}

export function NeumorphicButton({ 
  children, 
  className, 
  showIcon = false,
  ...props 
}: NeumorphicButtonProps) {
  return (
    <button
      className={cn(
        "neumorphic rounded-[--radius-md] px-6 py-4",
        "font-medium text-foreground transition-all duration-300",
        "hover:shadow-[6px_6px_12px_rgba(163,177,198,0.2),-6px_-6px_12px_rgba(255,255,255,0.8)]",
        "active:shadow-[inset_4px_4px_8px_rgba(163,177,198,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.7)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "flex items-center gap-2",
        className
      )}
      {...props}
    >
      {children}
      {showIcon && <ArrowDown className="w-4 h-4" />}
    </button>
  )
}
