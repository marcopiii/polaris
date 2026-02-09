import type { PolarCoordinates, CartesianCoordinates } from '../types';

const _cartesianOut: CartesianCoordinates = { x: 0, y: 0 };

/** Convert polar to cartesian. Returns a shared object — copy values if you need to store them. */
export function polarToCartesian(polar: PolarCoordinates): CartesianCoordinates {
  _cartesianOut.x = polar.r * Math.cos(polar.theta);
  _cartesianOut.y = polar.r * Math.sin(polar.theta);
  return _cartesianOut;
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
