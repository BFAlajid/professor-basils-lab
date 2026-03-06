"use client";

import { useEffect, useRef } from "react";
import type { WeatherType } from "@/types/explore";

interface WeatherOverlayProps {
  weather: WeatherType;
}

interface Particle {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
}

const PARTICLE_COUNT = 60;

export default function WeatherOverlay({ weather }: WeatherOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);

  useEffect(() => {
    if (weather === "none") {
      cancelAnimationFrame(rafRef.current);
      particlesRef.current = [];
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, 240, 160);
      return;
    }

    // Initialize particles
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(weather, true)
    );

    function loop() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, 240, 160);
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        drawParticle(ctx, p, weather);
        updateParticle(p, weather);

        // Reset if off-screen
        if (p.y > 165 || p.x > 245 || p.x < -5) {
          particles[i] = createParticle(weather, false);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [weather]);

  if (weather === "none") return null;

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={160}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ imageRendering: "pixelated" }}
      aria-hidden="true"
    />
  );
}

function createParticle(weather: WeatherType, randomY: boolean): Particle {
  const y = randomY ? Math.random() * 160 : -2;
  switch (weather) {
    case "rain":
      return {
        x: Math.random() * 260 - 20,
        y,
        speed: 3 + Math.random() * 2,
        size: 1,
        opacity: 0.4 + Math.random() * 0.3,
      };
    case "snow":
      return {
        x: Math.random() * 240,
        y,
        speed: 0.3 + Math.random() * 0.5,
        size: 1 + Math.floor(Math.random() * 2),
        opacity: 0.5 + Math.random() * 0.4,
      };
    case "sandstorm":
      return {
        x: -2,
        y: Math.random() * 160,
        speed: 2 + Math.random() * 3,
        size: 1,
        opacity: 0.2 + Math.random() * 0.3,
      };
    case "fog":
      return {
        x: Math.random() * 240,
        y: Math.random() * 160,
        speed: 0.1 + Math.random() * 0.2,
        size: 20 + Math.random() * 30,
        opacity: 0.05 + Math.random() * 0.08,
      };
    default:
      return { x: 0, y: 0, speed: 0, size: 0, opacity: 0 };
  }
}

function updateParticle(p: Particle, weather: WeatherType) {
  switch (weather) {
    case "rain":
      p.y += p.speed;
      p.x -= p.speed * 0.3;
      break;
    case "snow":
      p.y += p.speed;
      p.x += Math.sin(p.y * 0.02) * 0.3;
      break;
    case "sandstorm":
      p.x += p.speed;
      p.y += Math.sin(p.x * 0.05) * 0.5;
      break;
    case "fog":
      p.x += p.speed;
      if (p.x > 260) p.x = -p.size;
      break;
  }
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  weather: WeatherType
) {
  ctx.globalAlpha = p.opacity;
  switch (weather) {
    case "rain":
      ctx.strokeStyle = "#a0c0e0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 1, p.y + 3);
      ctx.stroke();
      break;
    case "snow":
      ctx.fillStyle = "#e8e8f0";
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      break;
    case "sandstorm":
      ctx.fillStyle = "#c8a860";
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
      break;
    case "fog":
      ctx.fillStyle = "#d0d0d8";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.globalAlpha = 1;
}
