import { useState, useEffect } from "react";
import { AppId } from "@/config/appRegistry";

interface SwipeNavigationOptions {
  threshold?: number; // Minimum swipe distance to trigger navigation
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  currentAppId: AppId;
  isActive: boolean;
}

export function useSwipeNavigation({
  threshold = 100,
  onSwipeLeft,
  onSwipeRight,
  currentAppId,
  isActive,
}: SwipeNavigationOptions) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null
  );

  // Reset swipe state when the currentAppId changes
  useEffect(() => {
    setTouchStartX(null);
    setTouchEndX(null);
    setIsSwiping(false);
    setSwipeDirection(null);
  }, [currentAppId]);

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (!isActive) return;
    setTouchStartX(e.touches[0].clientX);
    setIsSwiping(true);
    setSwipeDirection(null);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (!isActive || touchStartX === null) return;

    const currentX = e.touches[0].clientX;
    setTouchEndX(currentX);

    // Calculate direction for visual feedback
    const diff = touchStartX - currentX;
    if (Math.abs(diff) > 20) {
      // Small threshold for visual feedback
      setSwipeDirection(diff > 0 ? "left" : "right");
    } else {
      setSwipeDirection(null);
    }
  };

  const handleTouchEnd = () => {
    if (!isActive || touchStartX === null || touchEndX === null) {
      setIsSwiping(false);
      return;
    }

    const diff = touchStartX - touchEndX;
    const absDiff = Math.abs(diff);

    if (absDiff > threshold) {
      if (diff > 0) {
        // Swiped left
        onSwipeLeft?.();
      } else {
        // Swiped right
        onSwipeRight?.();
      }
    }

    // Reset touch coordinates
    setTouchStartX(null);
    setTouchEndX(null);
    setIsSwiping(false);
    setSwipeDirection(null);
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isSwiping,
    swipeDirection,
  };
}
