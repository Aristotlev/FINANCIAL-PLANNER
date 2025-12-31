"use client";

import React from 'react';
import Image from 'next/image';

interface OmnifolioLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
}

export function OmnifolioLogo({ 
  className = '', 
  size = 'md', 
  showText = true,
  textClassName = ''
}: OmnifolioLogoProps) {
  const sizeMap = {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 56, height: 56 },
    xl: { width: 72, height: 72 }
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  const { width, height } = sizeMap[size];

  return (
    <div className={`flex items-center ${className}`}>
      {/* Logo Image */}
      <div className="relative drop-shadow-lg" style={{ width, height }}>
        <Image
          src="/images/logo.png"
          alt="OmniFolio Logo"
          width={width}
          height={height}
          className="object-contain"
          priority
        />
      </div>

      {/* Text */}
      {showText && (
        <span className={`ml-2 font-bold bg-gradient-to-r from-green-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent ${textSizes[size]} ${textClassName}`}>
          OmniFolio
        </span>
      )}
    </div>
  );
}

// Simple icon-only version for favicons and small spaces
export function OmnifolioIcon({ className = '', size = 24 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/images/logo.png"
      alt="OmniFolio"
      width={size}
      height={size}
      className={`object-contain drop-shadow-lg ${className}`}
    />
  );
}
