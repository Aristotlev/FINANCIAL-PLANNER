"use client";

import { cn } from "@/lib/utils";
import React, { useRef, useState, useEffect, useCallback } from "react";

let highestZIndex = 100; // Unclicked cards: 100-999, hovered: 5000-9999, dropdowns: 10000-19999, dragged: 20000+

export const DraggableCardBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zIndex, setZIndex] = useState(100);
  const [isHovering, setIsHovering] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const animationFrameId = useRef<number | null>(null);
  const lastPosition = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't drag if clicking on interactive elements or the visual area
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input') || 
        target.closest('textarea') || target.closest('select') || 
        target.closest('[data-visual-click]') || target.closest('[data-no-drag]')) {
      return;
    }
    
    // DON'T prevent default - it blocks HTML5 dragstart events!
    // Text selection is prevented via CSS user-select: none
    
    // Bring this card to the ABSOLUTE TOP when dragging - use 20000+ range
    // This puts them above everything: unclicked cards (100-999), hovered cards (5000-9999), 
    // and even dropdowns/modals (10000-19999)
    const dragZIndex = 20000 + Date.now() % 1000; // Ensures each drag gets unique high z-index
    setZIndex(dragZIndex);
    
    hasMoved.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    
    // Get zoom level from the dashboard container's transform scale
    const dashboardContainer = document.querySelector('[data-dashboard-zoom-container]') as HTMLElement;
    let zoomLevel = 1;
    if (dashboardContainer) {
      const transform = dashboardContainer.style.transform;
      const scaleMatch = transform.match(/scale\(([0-9.]+)\)/);
      if (scaleMatch) {
        zoomLevel = parseFloat(scaleMatch[1]);
      }
    }
    
    // Store zoom level for use in other handlers
    (dragRef.current as any)._zoomLevel = zoomLevel;
    
    // Account for zoom level when setting start position
    startPos.current = {
      x: e.clientX / zoomLevel - position.x,
      y: e.clientY / zoomLevel - position.y,
    };
    
    // Force immediate z-index update on the DOM element
    if (dragRef.current) {
      dragRef.current.style.zIndex = String(dragZIndex);
    }
  }, [position.x, position.y]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Use requestAnimationFrame for smooth 60fps updates
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    
    animationFrameId.current = requestAnimationFrame(() => {
      // Check if mouse has moved more than 5px (threshold for drag vs click)
      const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
      const deltaY = Math.abs(e.clientY - dragStartPos.current.y);
      
      if (deltaX > 5 || deltaY > 5) {
        hasMoved.current = true;
      }
      
      // Get the stored zoom level from when drag started
      const zoomLevel = (dragRef.current as any)?._zoomLevel || 1;
      
      // Account for zoom level when calculating new position
      const newX = e.clientX / zoomLevel - startPos.current.x;
      const newY = e.clientY / zoomLevel - startPos.current.y;
      
      // Only update if position actually changed (avoid unnecessary renders)
      if (newX !== lastPosition.current.x || newY !== lastPosition.current.y) {
        lastPosition.current = { x: newX, y: newY };
        setPosition({ x: newX, y: newY });
      }
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    setIsDragging(false);
    // After drag ends, lower z-index back to hover range (5000+) so dropdowns can appear above
    highestZIndex = Math.max(highestZIndex + 1, 5000);
    setZIndex(highestZIndex);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    // Bring card forward when hovering, but keep in clicked card range (5000+) for hologram visibility
    // This ensures it's above unclicked cards but still below dropdowns
    if (!isDragging) {
      highestZIndex = Math.max(highestZIndex + 1, 5000);
      setZIndex(highestZIndex);
      // Force immediate z-index update on the DOM element
      if (dragRef.current) {
        dragRef.current.style.zIndex = String(highestZIndex);
      }
    }
  }, [isDragging]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  // Listen for reset event
  useEffect(() => {
    const handleReset = () => {
      setPosition({ x: 0, y: 0 });
      setZIndex(100);
      highestZIndex = 5000; // Reset to start of hover range
    };

    window.addEventListener('resetCardPositions', handleReset);
    return () => {
      window.removeEventListener('resetCardPositions', handleReset);
    };
  }, []);

  useEffect(() => {
    if (isDragging) {
      // Use passive: false for better performance on touch devices
      document.addEventListener("mousemove", handleMouseMove, { passive: true });
      document.addEventListener("mouseup", handleMouseUp, { passive: true });
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      
      // Disable pointer events on other cards to prevent hover effects
      if (dragRef.current) {
        const allCards = document.querySelectorAll('[data-card]');
        allCards.forEach((card) => {
          if (card !== dragRef.current?.closest('[data-card]')) {
            (card as HTMLElement).style.pointerEvents = 'none';
          }
        });
      }
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      
      // Re-enable pointer events on all cards
      const allCards = document.querySelectorAll('[data-card]');
      allCards.forEach((card) => {
        (card as HTMLElement).style.pointerEvents = '';
      });
    }
    
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={dragRef}
      data-card
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "cursor-grab active:cursor-grabbing select-none",
        className
      )}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: zIndex,
        position: "relative",
        isolation: "isolate", // Creates a new stacking context
        willChange: isDragging ? "transform" : "auto",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        WebkitTransform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
    >
      {children}
    </div>
  );
};

