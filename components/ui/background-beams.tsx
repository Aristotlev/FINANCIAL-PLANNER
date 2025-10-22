"use client";
import { cn } from "@/lib/utils";
import React, { useRef, useEffect } from "react";

export const BackgroundBeams = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useRef<number>(0);
  const mouseY = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    // Set canvas size
    const resizeCanvas = () => {
      // Set canvas to match viewport size
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.current = e.clientX;
      mouseY.current = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Beam class
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
        this.x = Math.random() * (canvas?.width || window.innerWidth);
        this.y = Math.random() * (canvas?.height || window.innerHeight);
        this.angle = Math.random() * Math.PI * 2;
        this.length = Math.random() * 200 + 100;
        this.speed = Math.random() * 2 + 1;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.fadeSpeed = Math.random() * 0.01 + 0.005;
        
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
          this.y = (canvas?.height || window.innerHeight) + this.length;
          this.x = Math.random() * (canvas?.width || window.innerWidth);
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

    // Create beams
    const beams: Beam[] = [];
    for (let i = 0; i < 20; i++) {
      beams.push(new Beam());
    }

    // Animation loop
    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      beams.forEach((beam) => {
        beam.update();
        beam.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

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
