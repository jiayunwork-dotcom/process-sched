export const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF7F50', '#9370DB', '#20B2AA'
];

export function getColor(index: number): string {
  return COLORS[index % COLORS.length];
}

export function generateProcessName(pid: number): string {
  return `P${pid}`;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function niceToWeight(nice: number): number {
  return Math.round(1024 * Math.pow(0.8, nice));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
