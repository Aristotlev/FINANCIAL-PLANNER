"use client";

import React, { createContext, useState, useContext, useRef, useEffect, useCallback } from "react";

type MouseEnterContextType = [
  boolean,
  React.Dispatch<React.SetStateAction<boolean>>
];

const MouseEnterContext = createContext<MouseEnterContextType | undefined>(
  undefined
);

interface CardContainerProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export const CardContainer = ({
  children,
  className,
  containerClassName,
}: CardContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);
  const isDraggingRef = useRef(false);

  // Listen for drag events to disable 3D effects during dragging
  useEffect(() => {
    const handleDragStart = () => {
      isDraggingRef.current = true;
      // Reset transform immediately when drag starts
      if (containerRef.current) {
        containerRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)';
      }
      setIsMouseEntered(false);
    };
    const handleDragEnd = () => {
      isDraggingRef.current = false;
    };
    
    window.addEventListener('cardDragStart', handleDragStart);
    window.addEventListener('cardDragEnd', handleDragEnd);
    
    return () => {
      window.removeEventListener('cardDragStart', handleDragStart);
      window.removeEventListener('cardDragEnd', handleDragEnd);
    };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Skip all processing if dragging - this is the key performance fix
    if (!containerRef.current || isDraggingRef.current) return;
    
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 8; // Enhanced sensitivity for more dramatic 3D tilt
    const y = (e.clientY - top - height / 2) / 8;
    
    // Apply transform directly without requestAnimationFrame for immediate response
    containerRef.current.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!isDraggingRef.current) {
      setIsMouseEntered(true);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!containerRef.current) return;
    setIsMouseEntered(false);
    containerRef.current.style.transform = 'rotateY(0deg) rotateX(0deg)';
  }, []);

  return (
    <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
      <div
        className={containerClassName}
        style={{
          perspective: "2000px", // Enhanced perspective for dramatic 3D depth
          perspectiveOrigin: "50% 50%",
        }}
      >
        <div
          ref={containerRef}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`relative ${className || ""}`}
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 0.15s ease-out", // Smooth transitions
            willChange: "transform",
          }}
        >
          {children}
        </div>
      </div>
    </MouseEnterContext.Provider>
  );
};

interface CardItemProps {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  translateX?: number;
  translateY?: number;
  translateZ?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  [key: string]: any;
}

export const CardItem = ({
  as: Tag = "div",
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}: CardItemProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isMouseEntered] = useMouseEnter();

  useEffect(() => {
    handleAnimations();
  }, [isMouseEntered]);

  const handleAnimations = () => {
    if (!ref.current) return;
    if (isMouseEntered) {
      ref.current.style.transform = `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
    } else {
      ref.current.style.transform = `translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
    }
  };

  return (
    <Tag
      ref={ref}
      className={`${className || ""}`}
      style={{
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        transition: "transform 0.25s cubic-bezier(0.23, 1, 0.32, 1)",
        willChange: "transform",
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

// Hook to use the mouse enter context
export const useMouseEnter = () => {
  const context = useContext(MouseEnterContext);
  if (context === undefined) {
    throw new Error("useMouseEnter must be used within a MouseEnterProvider");
  }
  return context;
};
