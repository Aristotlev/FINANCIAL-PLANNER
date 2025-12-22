"use client";
import { cn } from "@/lib/utils";
import React, { useRef, useEffect, useState } from "react";

export const BackgroundBeams = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useRef<number>(0);
  const mouseY = useRef<number>(0);
  const [isVisible, setIsVisible] = useState(true);
  const frameCountRef = useRef(0);

  // Pause animation when tab is not visible to save CPU
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;

    // Set canvas size with devicePixelRatio for crisp rendering
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };
    resizeCanvas();
    
    // Debounced resize handler
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 150);
    };
    window.addEventListener("resize", handleResize);

    // Throttled mouse move handler
    let lastMouseUpdate = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastMouseUpdate > 50) { // Max 20 updates per second
        mouseX.current = e.clientX;
        mouseY.current = e.clientY;
        lastMouseUpdate = now;
      }
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // Beam class - reduced count for better performance
    class Beam {
      x: number;
      y: number;
      angle: number;
      length: number;
      speed: number;
      opacity: number;
      fadeSpeed: number;
      color: string;

      constructor() {
        this.x = Math.random() * window.innerWidth;
        this.y = Math.random() * window.innerHeight;
        this.angle = Math.random() * Math.PI * 2;
        this.length = Math.random() * 200 + 100;
        this.speed = Math.random() * 1.5 + 0.5; // Slightly slower for smoother feel
        this.opacity = Math.random() * 0.5 + 0.2;
        this.fadeSpeed = Math.random() * 0.008 + 0.004; // Slower fade
        
        // Random colors for beams
        const colors = ['rgba(139, 92, 246, ', 'rgba(59, 130, 246, ', 'rgba(34, 211, 238, '];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        // Move beam
        this.y -= this.speed;
        
        // Fade in and out
        this.opacity += this.fadeSpeed;
        if (this.opacity >= 0.7 || this.opacity <= 0.1) {
          this.fadeSpeed *= -1;
        }

        // Reset if beam goes off screen
        if (this.y + this.length < 0) {
          this.y = window.innerHeight + this.length;
          this.x = Math.random() * window.innerWidth;
        }
      }

      draw() {
        if (!ctx) return;

        const gradient = ctx.createLinearGradient(
          this.x,
          this.y,
          this.x,
          this.y + this.length
        );
        
        gradient.addColorStop(0, this.color + '0)');
        gradient.addColorStop(0.5, this.color + this.opacity + ')');
        gradient.addColorStop(1, this.color + '0)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
        ctx.stroke();
      }
    }

    // Create fewer beams for better performance (8 instead of 12)
    const beams: Beam[] = [];
    for (let i = 0; i < 8; i++) {
      beams.push(new Beam());
    }

    // Animation loop with frame skipping for performance
    const animate = () => {
      frameCountRef.current++;
      
      // Skip frames for 20fps instead of 60fps - still smooth, significantly less CPU
      if (frameCountRef.current % 3 === 0) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        beams.forEach((beam) => {
          beam.update();
          beam.draw();
        });
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      clearTimeout(resizeTimeout);
    };
  }, [isVisible]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ 
        background: "transparent",
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        transform: 'none',
        transformOrigin: 'center center',
        willChange: 'auto',
      }}
    />
  );
});

BackgroundBeams.displayName = "BackgroundBeams";
