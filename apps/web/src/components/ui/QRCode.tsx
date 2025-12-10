"use client";

import { useEffect, useRef } from "react";

interface QRCodeCanvasProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
}

// Simple QR Code implementation using Canvas
export function QRCodeCanvas({
  value,
  size = 150,
  bgColor = "#FFFFFF",
  fgColor = "#000000",
}: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate QR code data
    const qrData = generateQRData(value);
    const moduleSize = size / qrData.length;

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // Draw QR modules
    ctx.fillStyle = fgColor;
    for (let row = 0; row < qrData.length; row++) {
      for (let col = 0; col < qrData[row].length; col++) {
        if (qrData[row][col]) {
          ctx.fillRect(
            col * moduleSize,
            row * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }
  }, [value, size, bgColor, fgColor]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}

// Simplified QR code generation (for demo - use qrcode library in production)
function generateQRData(text: string): boolean[][] {
  // Create a simple visual pattern for demo
  // In production, use a proper QR code library like 'qrcode'
  const size = 25;
  const matrix: boolean[][] = [];

  // Initialize matrix
  for (let i = 0; i < size; i++) {
    matrix[i] = [];
    for (let j = 0; j < size; j++) {
      matrix[i][j] = false;
    }
  }

  // Add finder patterns (corners)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, size - 7, 0);
  addFinderPattern(matrix, 0, size - 7);

  // Add timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Add some data modules based on text hash
  const hash = simpleHash(text);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (!isReserved(i, j, size)) {
        matrix[i][j] = ((hash + i * j) % 3) === 0;
      }
    }
  }

  return matrix;
}

function addFinderPattern(matrix: boolean[][], startX: number, startY: number) {
  // 7x7 finder pattern
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      if (
        i === 0 || i === 6 || j === 0 || j === 6 || // Outer border
        (i >= 2 && i <= 4 && j >= 2 && j <= 4) // Inner square
      ) {
        matrix[startY + i][startX + j] = true;
      }
    }
  }
}

function isReserved(x: number, y: number, size: number): boolean {
  // Check if position is part of finder patterns or timing patterns
  if ((x < 9 && y < 9) || (x < 9 && y >= size - 8) || (x >= size - 8 && y < 9)) {
    return true;
  }
  if (x === 6 || y === 6) {
    return true;
  }
  return false;
}

function simpleHash(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}



