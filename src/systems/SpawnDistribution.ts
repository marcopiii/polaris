import { gameRandom } from '../utils/BenchmarkConfig';
import {
  SPAWN_DISTRIBUTION_HARMONICS,
  SPAWN_DISTRIBUTION_AMPLITUDE_MAX,
  SPAWN_DISTRIBUTION_MORPH_INTERVAL,
  SPAWN_DISTRIBUTION_LERP_SPEED,
  SPAWN_DISTRIBUTION_RESOLUTION,
} from '../constants';

interface Harmonic {
  frequency: number;
  amplitude: number;
  phase: number;
  targetAmplitude: number;
  targetPhase: number;
}

/**
 * A time-varying probability distribution over spawn angles [0, 2π).
 *
 * The PDF is defined as:
 *   g(θ, t) = Σ aᵢ(t) · sin(kᵢ·θ + φᵢ(t))
 *   f(θ, t) = exp(g(θ, t)) / Z(t)
 *
 * where Z(t) = ∫₀²π exp(g(θ, t)) dθ ensures normalization.
 *
 * Amplitudes and phases smoothly interpolate toward random targets
 * that are re-rolled periodically, producing organic, wave-like
 * concentration zones that drift over time.
 *
 * Sampling uses the inverse-CDF method over a discretized table.
 */
export class SpawnDistribution {
  private harmonics: Harmonic[] = [];
  private cdf: Float64Array;
  private angles: Float64Array;
  private morphTimer: number = 0;
  private dirty: boolean = true;

  constructor() {
    const N = SPAWN_DISTRIBUTION_RESOLUTION;
    this.cdf = new Float64Array(N);
    this.angles = new Float64Array(N);

    const step = (Math.PI * 2) / N;
    for (let i = 0; i < N; i++) {
      this.angles[i] = i * step;
    }

    for (let k = 1; k <= SPAWN_DISTRIBUTION_HARMONICS; k++) {
      this.harmonics.push({
        frequency: k,
        amplitude: 0,
        phase: gameRandom() * Math.PI * 2,
        targetAmplitude: this.randomAmplitude(),
        targetPhase: gameRandom() * Math.PI * 2,
      });
    }

    this.rollTargets();
    this.rebuildCdf();
  }

  update(deltaSec: number): void {
    this.morphTimer += deltaSec;

    if (this.morphTimer >= SPAWN_DISTRIBUTION_MORPH_INTERVAL) {
      this.morphTimer = 0;
      this.rollTargets();
    }

    const lerpFactor = 1 - Math.exp(-SPAWN_DISTRIBUTION_LERP_SPEED * deltaSec);

    for (const h of this.harmonics) {
      const prevA = h.amplitude;
      const prevP = h.phase;

      h.amplitude += (h.targetAmplitude - h.amplitude) * lerpFactor;
      h.phase = lerpAngle(h.phase, h.targetPhase, lerpFactor);

      if (Math.abs(h.amplitude - prevA) > 1e-6 || Math.abs(h.phase - prevP) > 1e-6) {
        this.dirty = true;
      }
    }

    if (this.dirty) {
      this.rebuildCdf();
      this.dirty = false;
    }
  }

  sample(): number {
    const u = gameRandom();
    // Binary search on CDF
    let lo = 0;
    let hi = this.cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.cdf[mid] < u) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    // Linear interpolation between bins for smoother results
    const N = this.cdf.length;
    const step = (Math.PI * 2) / N;
    const cdfLo = lo > 0 ? this.cdf[lo - 1] : 0;
    const cdfHi = this.cdf[lo];
    const t = cdfHi > cdfLo ? (u - cdfLo) / (cdfHi - cdfLo) : 0;
    return this.angles[lo] + t * step;
  }

  private rollTargets(): void {
    for (const h of this.harmonics) {
      h.targetAmplitude = this.randomAmplitude();
      h.targetPhase = gameRandom() * Math.PI * 2;
    }
    this.dirty = true;
  }

  private randomAmplitude(): number {
    // Range [-max, +max] for variety (negative amplitudes flip the wave)
    return (gameRandom() * 2 - 1) * SPAWN_DISTRIBUTION_AMPLITUDE_MAX;
  }

  private rebuildCdf(): void {
    const N = this.cdf.length;
    const step = (Math.PI * 2) / N;

    // Compute unnormalized PDF values: exp(g(θ))
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const theta = this.angles[i];
      let g = 0;
      for (const h of this.harmonics) {
        g += h.amplitude * Math.sin(h.frequency * theta + h.phase);
      }
      const pdf = Math.exp(g);
      this.cdf[i] = pdf;
      sum += pdf * step;
    }

    // Normalize and build cumulative distribution
    let cumulative = 0;
    for (let i = 0; i < N; i++) {
      const normalizedPdf = this.cdf[i] / sum;
      cumulative += normalizedPdf * step;
      this.cdf[i] = cumulative;
    }

    // Ensure last bin is exactly 1 (floating-point guard)
    this.cdf[N - 1] = 1;
  }
}

/** Lerp between two angles, taking the shortest arc. */
function lerpAngle(from: number, to: number, t: number): number {
  let diff = to - from;
  // Wrap to [-π, π]
  diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return from + diff * t;
}
