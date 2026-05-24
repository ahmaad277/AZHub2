"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  frontClassName?: string;
  backClassName?: string;
}

export function FlipCard({ front, back, className, frontClassName, backClassName }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePressStart = () => {
    if (isFlipped) return;
    timerRef.current = setTimeout(() => {
      setIsFlipped(true);
    }, 500);
  };

  const handlePressEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleFlipBack = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
  };

  return (
    <div
      className={cn("group relative [perspective:1000px]", className)}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressEnd}
      onContextMenu={(e) => {
        // Prevent context menu from appearing on long press, especially on mobile
        if (isFlipped) e.preventDefault();
      }}
    >
      <div
        className={cn(
          "relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]",
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        )}
      >
        {/* Front */}
        <div
          className={cn(
            "h-full w-full [backface-visibility:hidden]",
            frontClassName
          )}
        >
          {front}
        </div>

        {/* Back */}
        <div
          className={cn(
            "absolute inset-0 h-full w-full [backface-visibility:hidden] [transform:rotateY(180deg)] cursor-pointer",
            backClassName
          )}
          onClick={handleFlipBack}
        >
          {back}
        </div>
      </div>
    </div>
  );
}
