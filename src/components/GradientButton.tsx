import { IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { motion } from "framer-motion";

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  "aria-label"?: string;
}

const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  onClick,
  className = "",
  disabled = false,
  loading = false,
  type = "button",
  variant = "primary",
  size = "md",
  "aria-label": ariaLabel,
}) => {
  const sizeClasses = {
    sm: "px-4 py-2 text-subhead min-h-11",
    md: "px-6 py-3 text-body min-h-11",
    lg: "px-8 py-[13px] text-body min-h-12",
  };

  const variantClasses = {
    primary: "gradient-primary text-primary-foreground font-semibold shadow-fab",
    secondary: "bg-background-secondary text-foreground font-medium",
    ghost: "bg-transparent text-primary font-medium",
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileTap={isDisabled ? undefined : { scale: TAP_SCALE.primary }}
      transition={IOS_SPRING.precise}
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      aria-label={ariaLabel}
      className={`
        rounded-[14px] ${sizeClasses[size]} ${variantClasses[variant]}
        transition-colors duration-150 disabled:opacity-35 disabled:pointer-events-none
        active:brightness-95
        ${className}
      `}
    >
      {children}
    </motion.button>
  );
};

export default GradientButton;
