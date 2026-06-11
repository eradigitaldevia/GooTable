/**
 * Utilidades puras para o tema do cardápio.
 * - Converte hex em valor CSS aceito por var() (mantemos hex; navegador resolve).
 * - Calcula foreground (#000 ou #fff) baseado em luminância (WCAG).
 * - Verifica contraste WCAG AA (>= 4.5:1 para texto pequeno).
 */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function srgbChannel(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const r = srgbChannel(rgb.r);
  const g = srgbChannel(rgb.g);
  const b = srgbChannel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function foregroundOn(hex: string): "#ffffff" | "#0a0a0a" {
  return luminance(hex) > 0.5 ? "#0a0a0a" : "#ffffff";
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [lo, hi] = la < lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function passesAA(fg: string, bg: string): boolean {
  return contrastRatio(fg, bg) >= 4.5;
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex.trim());
}