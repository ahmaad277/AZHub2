import { useEffect, useRef } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
  edgeThreshold?: number;
  enabled?: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  minSwipeDistance = 50,
  edgeThreshold = 50,
  enabled = true,
}: SwipeGestureOptions) {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const isSwipeFromEdge = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      touchEndX.current = touchStartX.current;
      touchEndY.current = touchStartY.current;
      
      const isRtl = document.documentElement.dir === "rtl";
      const windowWidth = window.innerWidth;
      const startedFromRightEdge = touchStartX.current > windowWidth - edgeThreshold;
      const startedFromLeftEdge = touchStartX.current < edgeThreshold;
      const startedFromEdge = isRtl ? startedFromRightEdge : startedFromLeftEdge;
      
      isSwipeFromEdge.current = startedFromEdge;
      
      // Debug logging
      if (import.meta.env.DEV) {
        console.log('[SwipeGesture] Touch start:', {
          x: touchStartX.current,
          windowWidth,
          edgeThreshold,
          isFromEdge: startedFromEdge,
          rightEdgeStart: windowWidth - edgeThreshold,
          leftEdgeEnd: edgeThreshold,
          isRtl,
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      const deltaX = touchStartX.current - touchEndX.current;
      const deltaY = Math.abs(touchStartY.current - touchEndY.current);
      
      // Debug logging
      if (import.meta.env.DEV) {
        console.log('[SwipeGesture] Touch end:', {
          startX: touchStartX.current,
          endX: touchEndX.current,
          deltaX,
          deltaY,
          isFromEdge: isSwipeFromEdge.current,
          minSwipeDistance
        });
      }

      // Must start from edge
      if (!isSwipeFromEdge.current) {
        // Reset flag
        isSwipeFromEdge.current = false;
        return;
      }

      // Check if this is a horizontal swipe (not vertical scroll)
      if (deltaY > 50) {
        isSwipeFromEdge.current = false;
        return;
      }

      // Swipe left (from right edge to left)
      if (deltaX > minSwipeDistance && onSwipeLeft) {
        onSwipeLeft();
      }
      // Swipe right (from left to right)
      else if (deltaX < -minSwipeDistance && onSwipeRight) {
        onSwipeRight();
      }

      // Reset
      isSwipeFromEdge.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, minSwipeDistance, edgeThreshold, enabled]);
}
