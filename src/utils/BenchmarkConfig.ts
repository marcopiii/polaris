import { SeededRandom } from './SeededRandom';

const params = new URLSearchParams(window.location.search);

export const BENCHMARK_MODE: boolean = params.has('benchmark');
export const BENCHMARK_SEED: number = parseInt(params.get('seed') ?? '12345', 10) || 12345;
export const BENCHMARK_START_LEVEL: number = parseInt(params.get('level') ?? '1', 10) || 1;

/**
 * Parse power-ups from query param, e.g. `?powerups=RAPID_FIRE:3,MULTI_SHOT:2,SHOCKWAVE:1`
 * Returns array of { type: string, count: number } entries.
 */
export function parseBenchmarkPowerUps(): { type: string; count: number }[] {
  const raw = params.get('powerups');
  if (!raw) return [];
  return raw.split(',').map((entry) => {
    const [type, countStr] = entry.split(':');
    return { type: type.trim(), count: parseInt(countStr ?? '1', 10) || 1 };
  });
}

const prng = new SeededRandom(BENCHMARK_SEED);

/** Returns seeded value in benchmark mode, Math.random() otherwise. */
export function gameRandom(): number {
  return BENCHMARK_MODE ? prng.next() : Math.random();
}
