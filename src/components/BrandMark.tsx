"use client";

import type { LucideIcon } from "lucide-react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type BrandMarkSize = "sm" | "md" | "lg";

const sizeMap: Record<BrandMarkSize, string> = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-14 w-14",
};

const radiusMap: Record<BrandMarkSize, string> = {
  sm: "rounded-[1.05rem]",
  md: "rounded-[1.6rem]",
  lg: "rounded-[1.9rem]",
};

const iconSizeMap: Record<BrandMarkSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-7 w-7",
};

const glowMap: Record<BrandMarkSize, string> = {
  sm: "blur-[14px]",
  md: "blur-[18px]",
  lg: "blur-[22px]",
};

type BrandMarkProps = {
  size?: BrandMarkSize;
  icon?: LucideIcon;
  className?: string;
};

/**
 * Matches the rounded-square lightning badge referenced by the user. Uses a
 * soft outer glow and interior highlight with a Lucide lightning icon.
 */
export function BrandMark({
  size = "md",
  icon: Icon = Zap,
  className,
}: BrandMarkProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center",
          sizeMap[size],
          radiusMap[size]
        )}
      >
        <span
          className={cn(
            "absolute inset-0 -z-10 bg-gradient-to-br from-sky-400/40 via-indigo-500/35 to-teal-500/35 opacity-80",
            glowMap[size],
            radiusMap[size]
          )}
        />
        <div
          className={cn(
            "relative flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-400 via-sky-600 to-cyan-700 shadow-[0_16px_22px_rgba(22,73,168,0.28)]",
            radiusMap[size]
          )}
        >
          <div
            className={cn(
              "absolute inset-[9%] bg-white/12 backdrop-blur-sm",
              radiusMap[size]
            )}
          />
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-tr from-white/25 via-white/8 to-transparent opacity-60",
              radiusMap[size]
            )}
          />
          <Icon
            strokeWidth={2.3}
            className={cn(
              "relative text-white drop-shadow-[0_3px_6px_rgba(30,64,175,0.35)]",
              iconSizeMap[size]
            )}
          />
        </div>
      </div>
    </div>
  );
}
