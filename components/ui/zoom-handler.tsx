'use client';

import { useEffect } from 'react';

export function ZoomHandler() {
  useEffect(() => {
    // Start at 100% zoom (same as navbar default)
    let currentZoom = 100;
    const minZoom = 25;  // Same as navbar minimum
    const maxZoom = 100; // Same as navbar maximum
    const zoomStep = 25; // Same as navbar step (25%)

    const handleWheel = (e: WheelEvent) => {
      // Check if Alt (Windows/Linux) or Meta/Command (macOS) key is pressed
      if (e.altKey || e.metaKey) {
        e.preventDefault();

        // Determine zoom direction based on scroll direction
        // Scroll down = zoom out (decrease), Scroll up = zoom in (increase)
        const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
        currentZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + delta));

        // Dispatch custom event to sync with dashboard zoom state
        window.dispatchEvent(new CustomEvent('zoomChange', { detail: currentZoom }));
      }
    };

    // Add wheel event listener with passive: false to allow preventDefault
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return null;
}
