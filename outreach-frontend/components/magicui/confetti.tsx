import confetti from "canvas-confetti";

export interface ConfettiOptions {
  particleCount?: number;
  angle?: number;
  spread?: number;
  startVelocity?: number;
  decay?: number;
  gravity?: number;
  drift?: number;
  flat?: boolean;
  ticks?: number;
  origin?: { x: number; y: number };
  colors?: string[];
  shapes?: ("square" | "circle" | "star")[];
  zIndex?: number;
  disableForReducedMotion?: boolean;
  useWorker?: boolean;
  resize?: boolean;
  canvas?: HTMLCanvasElement | null;
  scalar?: number;
}

const defaultOptions: ConfettiOptions = {
  particleCount: 50,
  angle: 90,
  spread: 45,
  startVelocity: 45,
  decay: 0.9,
  gravity: 1,
  drift: 0,
  flat: false,
  ticks: 200,
  origin: { x: 0.5, y: 0.5 },
  colors: ['#26ccff', '#a25afd', '#ff5e7e', '#88ff5a', '#fcff42', '#ffa62d', '#ff36ff'],
  shapes: ['square', 'circle'],
  zIndex: 100,
  disableForReducedMotion: false,
  useWorker: true,
  resize: true,
  canvas: null,
  scalar: 1,
};

export function fireConfetti(options: ConfettiOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  // Check for reduced motion preference
  if (opts.disableForReducedMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  // Map shapes to canvas-confetti format
  const shapeMap: Record<string, confetti.Shape> = {
    square: 'square',
    circle: 'circle',
    star: 'star',
  };

  const shapes = opts.shapes?.map(shape => shapeMap[shape]).filter(Boolean) as confetti.Shape[] | undefined;

  confetti({
    particleCount: opts.particleCount,
    angle: opts.angle,
    spread: opts.spread,
    startVelocity: opts.startVelocity,
    decay: opts.decay,
    gravity: opts.gravity,
    drift: opts.drift,
    flat: opts.flat,
    ticks: opts.ticks,
    origin: opts.origin,
    colors: opts.colors,
    shapes: shapes,
    zIndex: opts.zIndex,
    scalar: opts.scalar,
    ...(opts.canvas && { canvas: opts.canvas }),
  });
}

export default fireConfetti;
