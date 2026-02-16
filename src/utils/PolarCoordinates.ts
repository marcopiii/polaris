import type { PolarCoordinates, CartesianCoordinates } from '../types';

export function polarToCartesian(polar: PolarCoordinates): CartesianCoordinates {
  return {
    x: polar.r * Math.cos(polar.theta),
    y: polar.r * Math.sin(polar.theta),
  };
}
