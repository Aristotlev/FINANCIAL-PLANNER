"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function Preloader() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Prevent scrolling while preloader is active
    document.body.style.overflow = 'hidden';

    // Start fading out after 2 seconds
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 2000);

    // Remove from DOM after fade completes
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
      document.body.style.overflow = '';
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      document.body.style.overflow = '';
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#000000] transition-opacity duration-500 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Logo Container with Glow */}
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
          <Image
            src="/images/logo.png"
            alt="OmniFolio"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain relative z-10 drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]"
            priority
          />
        </div>
        
        {/* Loading Bar */}
        <div className="h-1 w-48 bg-gray-900 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-blue-500 animate-[loading_2s_ease-in-out_infinite]" 
               style={{ width: '100%', transformOrigin: 'left' }} 
          />
        </div>
        
        {/* Text */}
        <h1 className="mt-6 text-3xl font-bold bg-gradient-to-r from-cyan-500 via-purple-500 to-blue-500 bg-clip-text text-transparent animate-pulse tracking-wider">
          OmniFolio
        </h1>
      </div>
    </div>
  );
}
