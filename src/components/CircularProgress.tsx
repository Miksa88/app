import React from "react";

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  className?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max,
  size = 80,
  strokeWidth = 6,
  color = "url(#gradient)",
  trackColor,
  children,
  className = "",
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference - progress * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="gradient-pink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(325, 82%, 51%)" />
            <stop offset="100%" stopColor="hsl(289, 63%, 42%)" />
          </linearGradient>
          <linearGradient id="gradient-red" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(0, 85%, 55%)" />
            <stop offset="100%" stopColor="hsl(340, 80%, 50%)" />
          </linearGradient>
          <linearGradient id="gradient-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(45, 100%, 51%)" />
            <stop offset="100%" stopColor="hsl(32, 95%, 50%)" />
          </linearGradient>
          <linearGradient id="gradient-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(145, 65%, 45%)" />
            <stop offset="100%" stopColor="hsl(160, 60%, 40%)" />
          </linearGradient>
          <linearGradient id="gradient-orange" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(32, 95%, 50%)" />
            <stop offset="100%" stopColor="hsl(25, 100%, 55%)" />
          </linearGradient>
          <linearGradient id="gradient-blue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(211, 100%, 50%)" />
            <stop offset="100%" stopColor="hsl(260, 60%, 55%)" />
          </linearGradient>
          <linearGradient id="gradient-pastel-purple" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(270, 50%, 65%)" />
            <stop offset="100%" stopColor="hsl(280, 45%, 60%)" />
          </linearGradient>
          <linearGradient id="gradient-pastel-pink" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(340, 55%, 65%)" />
            <stop offset="100%" stopColor="hsl(350, 50%, 62%)" />
          </linearGradient>
          <linearGradient id="gradient-pastel-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(38, 55%, 58%)" />
            <stop offset="100%" stopColor="hsl(30, 50%, 55%)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor || "hsl(var(--muted))"}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-xslow ease-out"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
};

export default CircularProgress;
