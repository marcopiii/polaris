import type { PolarCoordinates, CartesianCoordinates } from '../types';

export function polarToCartesian(polar: PolarCoordinates): CartesianCoordinates {
  return {
    x: polar.r * Math.cos(polar.theta),
    y: polar.r * Math.sin(polar.theta),
  };
}

export function cartesianToPolar(coords: CartesianCoordinates): PolarCoordinates {
  return {
    r: Math.sqrt(coords.x * coords.x + coords.y * coords.y),
    theta: Math.atan2(coords.y, coords.x),
  };
}

export function normalizeAngle(theta: number): number {
  let normalized = theta % (2 * Math.PI);
  if (normalized < 0) {
    normalized += 2 * Math.PI;
  }
  return normalized;
}
