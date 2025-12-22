"use client";

import React, { useState, useEffect, useRef } from 'react';

import { cn } from "@/lib/utils";

interface LazyCardWrapperProps {
  children: React.ReactNode;
  threshold?: number;
  minHeight?: string;
  className?: string;
}

export function CardSkeleton({ minHeight = "380px" }: { minHeight?: string }) {
  return (
    <div 
      className="w-full rounded-xl border border-gray-200/10 dark:border-gray-800/50 bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
      style={{ height: minHeight }}
    >
      <div className="w-12 h-12 rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-blue-500 animate-spin" />
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
    </div>
  );
}

export function LazyCardWrapper({ 
  children, 
  threshold = 0,
  minHeight = "380px",
  className
}: LazyCardWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '800px', // Load 2 viewports ahead to prevent pop-in
        threshold
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return (
    <div 
      ref={ref} 
      className={cn(
        "w-full sm:w-[356px] relative transition-all duration-500", 
        className
      )}
      style={{ minHeight: isVisible ? 'auto' : minHeight }}
    >
      {isVisible ? (
        <div className="animate-in fade-in zoom-in-95 duration-500 fill-mode-forwards">
          {children}
        </div>
      ) : (
        <CardSkeleton minHeight={minHeight} />
      )}
    </div>
  );
}
