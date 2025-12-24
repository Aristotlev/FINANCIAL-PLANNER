"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface BeamProps {
  delay: number;
  duration: number;
  left: number;
  color: string;
  width: number;
  height: number;
}

const Beam = ({ delay, duration, left, color, width, height }: BeamProps) => (
  <div
    className="absolute top-0 -translate-y-full animate-beam will-change-transform"
    style={{
      left: `${left}%`,
      width: `${width}px`,
      height: `${height}px`,
      background: `linear-gradient(180deg, ${color}00) 0%, ${color}40) 50%, ${color}00) 100%)`,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
      opacity: 0,
    }}
  />
);

export const BackgroundBeams = React.memo(() => {
  const [beams, setBeams] = useState<BeamProps[]>([]);

  useEffect(() => {
    // Generate static beams on mount to avoid re-renders
    const colors = ['#8b5cf6', '#3b82f6', '#22d3ee'];
    const newBeams: BeamProps[] = [];
    
    // Create 15 beams with random properties (more beams because CSS is cheaper)
    for (let i = 0; i < 15; i++) {
      newBeams.push({
        delay: Math.random() * 5,
        duration: Math.random() * 5 + 5, // 5-10 seconds
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        width: Math.random() * 2 + 1, // 1-3px width
        height: Math.random() * 300 + 100, // 100-400px length
      });
    }
    
    setBeams(newBeams);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {beams.map((beam, i) => (
        <Beam key={i} {...beam} />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
    </div>
  );
});

BackgroundBeams.displayName = "BackgroundBeams";
