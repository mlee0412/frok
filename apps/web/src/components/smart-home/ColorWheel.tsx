'use client';
import React, { useEffect, useRef, useState } from 'react';

type Props = {
  size?: number;
  h?: number;
  s?: number;
  onChange?: (h: number, s: number) => void;
};

export default function ColorWheel({ size = 140, h = 0, s = 100, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drag, setDrag] = useState(false);
  const [valH, setValH] = useState(h);
  const [valS, setValS] = useState(s);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = size * dpr;
    const hgt = size * dpr;
    c.width = w;
    c.height = hgt;
    c.style.width = `${size}px`;
    c.style.height = `${size}px`;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(w, hgt);
    const cx = w / 2;
    const cy = hgt / 2;
    const rMax = Math.min(cx, cy);
    const setPx = (x: number, y: number, r: number, g: number, b: number, a: number) => {
      const idx = (y * w + x) * 4;
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = a;
    };
    for (let y = 0; y < hgt; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const rr = Math.sqrt(dx * dx + dy * dy);
        if (rr > rMax) {
          setPx(x, y, 0, 0, 0, 0);
          continue;
        }
        let hue = Math.atan2(dy, dx) * (180 / Math.PI);
        if (hue < 0) hue += 360;
        const sat = Math.min(1, rr / rMax);
        const [R, G, B] = hsv2rgb(hue, sat, 1);
        setPx(x, y, R, G, B, 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [size]);

  function setFromEvent(e: React.MouseEvent) {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    let hue = Math.atan2(dy, dx) * (180 / Math.PI);
    if (hue < 0) hue += 360;
    const r = Math.sqrt(dx * dx + dy * dy);
    const rMax = Math.min(cx, cy);
    const sat = Math.max(0, Math.min(1, r / rMax));
    const nh = Math.round(hue);
    const ns = Math.round(sat * 100);
    setValH(nh);
    setValS(ns);
    if (onChange) onChange(nh, ns);
  }

  const dotStyle: React.CSSProperties = (() => {
    const rad = ((valH % 360) / 180) * Math.PI;
    const r = (Math.min(size, size) / 2) * (Math.max(0, Math.min(valS, 100)) / 100);
    const cx = size / 2 + Math.cos(rad) * r;
    const cy = size / 2 + Math.sin(rad) * r;
    return { left: cx - 6, top: cy - 6 };
  })();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        className="rounded-full cursor-crosshair select-none shadow-[0_0_12px_rgba(34,211,238,0.3)]"
        onMouseDown={(e) => { setDrag(true); setFromEvent(e); }}
        onMouseMove={(e) => { if (drag) setFromEvent(e); }}
        onMouseUp={() => setDrag(false)}
        onMouseLeave={() => setDrag(false)}
      />
      <div className="absolute h-3 w-3 rounded-full ring-2 ring-cyan-300 bg-white pointer-events-none" style={dotStyle} />
    </div>
  );
}

function hsv2rgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (0 <= hp && hp < 1) { r = c; g = x; b = 0; }
  else if (1 <= hp && hp < 2) { r = x; g = c; b = 0; }
  else if (2 <= hp && hp < 3) { r = 0; g = c; b = x; }
  else if (3 <= hp && hp < 4) { r = 0; g = x; b = c; }
  else if (4 <= hp && hp < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const m = v - c;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
