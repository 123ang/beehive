"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HexagonGridProps {
  className?: string;
  rows?: number;
  cols?: number;
  animated?: boolean;
}

export function HexagonGrid({
  className,
  rows = 5,
  cols = 8,
  animated = true,
}: HexagonGridProps) {
  const hexagons = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offset = row % 2 === 0 ? 0 : 30;
      hexagons.push({
        id: `${row}-${col}`,
        x: col * 60 + offset,
        y: row * 52,
        delay: (row + col) * 0.1,
      });
    }
  }

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
      <svg
        className="w-full h-full opacity-10"
        viewBox={`0 0 ${cols * 60 + 30} ${rows * 52 + 30}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {hexagons.map((hex) => (
          <motion.path
            key={hex.id}
            d="M30 0 L60 17.32 L60 51.96 L30 69.28 L0 51.96 L0 17.32 Z"
            transform={`translate(${hex.x}, ${hex.y}) scale(0.45)`}
            fill="none"
            stroke="#FBBF24"
            strokeWidth="1"
            initial={animated ? { opacity: 0, scale: 0 } : false}
            animate={animated ? { opacity: 1, scale: 1 } : false}
            transition={{
              duration: 0.5,
              delay: hex.delay,
              ease: "easeOut",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

// Single animated hexagon component
interface AnimatedHexagonProps {
  size?: number;
  color?: string;
  className?: string;
  animate?: boolean;
}

export function AnimatedHexagon({
  size = 100,
  color = "#FBBF24",
  className,
  animate = true,
}: AnimatedHexagonProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      style={{ width: size, height: size * 1.15 }}
      animate={
        animate
          ? {
              rotate: [0, 360],
            }
          : undefined
      }
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <svg viewBox="0 0 100 115" className="w-full h-full">
        <defs>
          <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path
          d="M50 0 L100 28.87 L100 86.60 L50 115.47 L0 86.60 L0 28.87 Z"
          fill="url(#hexGradient)"
          stroke={color}
          strokeWidth="2"
          strokeOpacity="0.5"
        />
      </svg>
    </motion.div>
  );
}



