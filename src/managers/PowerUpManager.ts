import { PLAYFIELD_RADIUS } from '../constants';
import { gameRandom } from '../utils/BenchmarkConfig';

export enum PowerUpType {
  // Passives (stackable)
  RAPID_FIRE = 'RAPID_FIRE',
  REINFORCED_VISION = 'REINFORCED_VISION',
  MULTI_SHOT = 'MULTI_SHOT',
  ENEMY_SLOWDOWN = 'ENEMY_SLOWDOWN',
  PIERCING_ROUNDS = 'PIERCING_ROUNDS',
  ORBITAL_SHIELD = 'ORBITAL_SHIELD',
  CHAIN_LIGHTNING = 'CHAIN_LIGHTNING',
  PUSHBACK = 'PUSHBACK',
  TAIL_GUN = 'TAIL_GUN',
  VISION_RECOVERY = 'VISION_RECOVERY',
  // Consumables (one-use, activated during gameplay)
  SHOCKWAVE = 'SHOCKWAVE',
  NOVA_BURST = 'NOVA_BURST',
  LASER_BEAM = 'LASER_BEAM',
  SWEEPSHOT = 'SWEEPSHOT',
  ORBITAL_FLARE = 'ORBITAL_FLARE',
  FISSION_ROUND = 'FISSION_ROUND',
}

export enum PowerUpRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

const RARITY_WEIGHTS: Record<PowerUpRarity, number> = {
  [PowerUpRarity.COMMON]: 90,
  [PowerUpRarity.UNCOMMON]: 60,
  [PowerUpRarity.RARE]: 30,
  [PowerUpRarity.EPIC]: 15,
  [PowerUpRarity.LEGENDARY]: 5,
};

const CONSUMABLE_BASE_COST = 32;
const CONSUMABLE_BASE_WEIGHT = RARITY_WEIGHTS[PowerUpRarity.COMMON];

function getConsumableCost(weight: number): number {
  return Math.round(CONSUMABLE_BASE_COST * Math.pow(CONSUMABLE_BASE_WEIGHT / weight, 0.6));
}

export const CONSUMABLE_MATTER_COST: Record<PowerUpRarity, number> = Object.fromEntries(
  Object.entries(RARITY_WEIGHTS).map(([rarity, weight]) => [rarity, getConsumableCost(weight)])
) as Record<PowerUpRarity, number>;

const STACK_DECAY = 0.9;
const STACK_CAP = 5;

export interface PowerUpDefinition {
  type: PowerUpType;
  name: string;
  description: string;
  rarity: PowerUpRarity;
  consumable: boolean;
}

const MAX_CONSUMABLE_INVENTORY = 16;

export const CONSUMABLE_SLOTS: { primary?: PowerUpType; secondary?: PowerUpType }[] = [
  { primary: PowerUpType.SWEEPSHOT, secondary: PowerUpType.LASER_BEAM },
  { primary: PowerUpType.NOVA_BURST, secondary: PowerUpType.SHOCKWAVE },
  { primary: PowerUpType.ORBITAL_FLARE },
  { primary: PowerUpType.FISSION_ROUND },
];

const CONSUMABLE_TYPES = new Set<PowerUpType>([
  PowerUpType.SHOCKWAVE,
  PowerUpType.NOVA_BURST,
  PowerUpType.LASER_BEAM,
  PowerUpType.SWEEPSHOT,
  PowerUpType.ORBITAL_FLARE,
  PowerUpType.FISSION_ROUND,
]);

const POWER_UP_DEFINITIONS: PowerUpDefinition[] = [
  {
    type: PowerUpType.RAPID_FIRE,
    name: 'Rapid Fire',
    description: 'Increase fire rate',
    rarity: PowerUpRarity.COMMON,
    consumable: false,
  },
  {
    type: PowerUpType.REINFORCED_VISION,
    name: 'Reinforced Vision',
    description: 'Reduce vision loss per hit',
    rarity: PowerUpRarity.UNCOMMON,
    consumable: false,
  },
  {
    type: PowerUpType.MULTI_SHOT,
    name: 'Multi-Shot',
    description: 'Fire additional bullets',
    rarity: PowerUpRarity.UNCOMMON,
    consumable: false,
  },
  {
    type: PowerUpType.ENEMY_SLOWDOWN,
    name: 'Gravity Well',
    description: 'Enemies move 15% slower',
    rarity: PowerUpRarity.COMMON,
    consumable: false,
  },
  {
    type: PowerUpType.PIERCING_ROUNDS,
    name: 'Piercing Rounds',
    description: 'Bullets pierce through enemies',
    rarity: PowerUpRarity.RARE,
    consumable: false,
  },
  {
    type: PowerUpType.ORBITAL_SHIELD,
    name: 'Orbital Shield',
    description: 'Orbiting shield destroys enemies',
    rarity: PowerUpRarity.EPIC,
    consumable: false,
  },
  {
    type: PowerUpType.CHAIN_LIGHTNING,
    name: 'Chain Lightning',
    description: 'Kills chain to nearby enemies',
    rarity: PowerUpRarity.LEGENDARY,
    consumable: false,
  },
  {
    type: PowerUpType.PUSHBACK,
    name: 'Pushback',
    description: 'Enemies are knocked back on hit',
    rarity: PowerUpRarity.UNCOMMON,
    consumable: false,
  },
  {
    type: PowerUpType.TAIL_GUN,
    name: 'Tail Gun',
    description: 'Fire bullets behind you too',
    rarity: PowerUpRarity.UNCOMMON,
    consumable: false,
  },
  {
    type: PowerUpType.VISION_RECOVERY,
    name: 'Photon Harvest',
    description: 'Recover 1% vision per enemy killed',
    rarity: PowerUpRarity.RARE,
    consumable: false,
  },
  {
    type: PowerUpType.SHOCKWAVE,
    name: 'Shockwave',
    description: 'Destroy all enemies at once',
    rarity: PowerUpRarity.LEGENDARY,
    consumable: true,
  },
  {
    type: PowerUpType.NOVA_BURST,
    name: 'Nova Burst',
    description: 'Fire 360 bullets in all directions',
    rarity: PowerUpRarity.UNCOMMON,
    consumable: true,
  },
  {
    type: PowerUpType.LASER_BEAM,
    name: 'Laser Beam',
    description: 'Wide laser beam for 3 seconds',
    rarity: PowerUpRarity.RARE,
    consumable: true,
  },
  {
    type: PowerUpType.SWEEPSHOT,
    name: 'Sweepshot',
    description: 'Arc wall sweeps outward, killing enemies',
    rarity: PowerUpRarity.COMMON,
    consumable: true,
  },
  {
    type: PowerUpType.ORBITAL_FLARE,
    name: 'Orbital Flare',
    description: 'Flare shoots outward, releasing orbiting bullets',
    rarity: PowerUpRarity.EPIC,
    consumable: true,
  },
  {
    type: PowerUpType.FISSION_ROUND,
    name: 'Fission Round',
    description: 'Killing shot splits into 2 new rounds',
    rarity: PowerUpRarity.RARE,
    consumable: true,
  },
];

export function getConsumableDefinition(type: PowerUpType): PowerUpDefinition | undefined {
  return POWER_UP_DEFINITIONS.find((d) => d.type === type && d.consumable);
}

export default class PowerUpManager {
  private stacks: Map<PowerUpType, number> = new Map();
  private consumableCounts: Map<PowerUpType, number> = new Map();

  addPowerUp(type: PowerUpType): void {
    if (CONSUMABLE_TYPES.has(type)) {
      if (this.getTotalConsumableCount() >= MAX_CONSUMABLE_INVENTORY) return;
      this.consumableCounts.set(type, this.getConsumableCount(type) + 1);
    } else {
      this.stacks.set(type, this.getStacks(type) + 1);
    }
  }

  getStacks(type: PowerUpType): number {
    return this.stacks.get(type) ?? 0;
  }

  removeStack(type: PowerUpType): void {
    const current = this.getStacks(type);
    if (current > 0) {
      this.stacks.set(type, current - 1);
    }
  }

  getConsumableCount(type: PowerUpType): number {
    return this.consumableCounts.get(type) ?? 0;
  }

  getTotalConsumableCount(): number {
    let total = 0;
    for (const count of this.consumableCounts.values()) {
      total += count;
    }
    return total;
  }

  /** Use a consumable by type. Returns true if successfully consumed. */
  useConsumable(type: PowerUpType): boolean {
    const count = this.getConsumableCount(type);
    if (count <= 0) return false;
    this.consumableCounts.set(type, count - 1);
    if (count - 1 <= 0) this.consumableCounts.delete(type);
    return true;
  }

  hasAnyConsumables(): boolean {
    return this.getTotalConsumableCount() > 0;
  }

  isConsumable(type: PowerUpType): boolean {
    return CONSUMABLE_TYPES.has(type);
  }

  /** Fire cooldown: 1000 / (3 + stacks) */
  getFireCooldown(): number {
    return 1000 / (3 + this.getStacks(PowerUpType.RAPID_FIRE));
  }

  /** Vision radius decrease: PLAYFIELD_RADIUS / (6 + stacks) — base 300px */
  getVisionRadiusDecrease(): number {
    return PLAYFIELD_RADIUS / (6 + this.getStacks(PowerUpType.REINFORCED_VISION));
  }

  /** Bullet count: 1 + stacks */
  getBulletCount(): number {
    return 1 + this.getStacks(PowerUpType.MULTI_SHOT);
  }

  /** Number of Gravity Well stacks */
  getGravityWellStacks(): number {
    return this.getStacks(PowerUpType.ENEMY_SLOWDOWN);
  }

  /** Chance (0-1) for a bullet to pierce through an enemy. 10% per stack, capped at 70%. */
  getPierceChance(): number {
    return Math.min(0.7, this.getStacks(PowerUpType.PIERCING_ROUNDS) * 0.1);
  }

  /** Number of orbital shields */
  getShieldCount(): number {
    return this.getStacks(PowerUpType.ORBITAL_SHIELD);
  }

  /** Number of chain lightning bounces per kill */
  getChainCount(): number {
    return this.getStacks(PowerUpType.CHAIN_LIGHTNING);
  }

  /** Tail gun bullet count: number of stacks (0 = no tail gun) */
  getTailGunBulletCount(): number {
    return this.getStacks(PowerUpType.TAIL_GUN);
  }

  /** Pushback distance: 5% of playfield radius per stack */
  getPushbackDistance(): number {
    return this.getStacks(PowerUpType.PUSHBACK) * 0.05 * PLAYFIELD_RADIUS;
  }

  /** Vision recovery per kill: 1% of playfield radius per stack (0 if no stacks) */
  getVisionRecovery(): number {
    const stacks = this.getStacks(PowerUpType.VISION_RECOVERY);
    return stacks > 0 ? 0.01 * PLAYFIELD_RADIUS * stacks : 0;
  }

  /** Chain lightning range in pixels */
  getChainRange(): number {
    return 150;
  }

  /** Effective weight: baseWeight × STACK_DECAY^stacks (capped at STACK_CAP) */
  private getEffectiveWeight(def: PowerUpDefinition): number {
    const base = RARITY_WEIGHTS[def.rarity];
    const stacks = Math.min(this.getStacks(def.type), STACK_CAP);
    return base * Math.pow(STACK_DECAY, stacks);
  }

  /** Return up to `count` weighted-random passives (no duplicates, rarity-weighted with stack decay) */
  getRandomPassiveSelection(count: number = 3): PowerUpDefinition[] {
    const defs = POWER_UP_DEFINITIONS.filter((p) => !p.consumable);
    return this.weightedRandomPick(defs, count);
  }

  /** Return up to `count` weighted-random consumables, respecting inventory cap */
  getRandomConsumableSelection(count: number = 3): PowerUpDefinition[] {
    if (this.getTotalConsumableCount() >= MAX_CONSUMABLE_INVENTORY) return [];
    const defs = POWER_UP_DEFINITIONS.filter((p) => p.consumable);
    return this.weightedRandomPick(defs, count);
  }

  /** Get the matter cost for a consumable power-up type */
  getConsumableCost(type: PowerUpType): number {
    const def = POWER_UP_DEFINITIONS.find((d) => d.type === type);
    if (!def) return 0;
    return CONSUMABLE_MATTER_COST[def.rarity];
  }

  private weightedRandomPick(defs: PowerUpDefinition[], count: number): PowerUpDefinition[] {
    const pool = defs.map((def) => ({ def, weight: this.getEffectiveWeight(def) }));
    const selected: PowerUpDefinition[] = [];

    for (let i = 0; i < count && pool.length > 0; i++) {
      const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
      let roll = gameRandom() * totalWeight;

      for (let j = 0; j < pool.length; j++) {
        roll -= pool[j].weight;
        if (roll <= 0) {
          selected.push(pool[j].def);
          pool.splice(j, 1);
          break;
        }
      }
    }

    return selected;
  }

  /** Return all passive power-ups that have at least 1 stack */
  getActivePassives(): { name: string; stacks: number }[] {
    const result: { name: string; stacks: number }[] = [];
    for (const [type, count] of this.stacks.entries()) {
      if (count > 0) {
        const def = POWER_UP_DEFINITIONS.find((d) => d.type === type);
        if (def) result.push({ name: def.name, stacks: count });
      }
    }
    return result;
  }

  reset(): void {
    this.stacks.clear();
    this.consumableCounts.clear();
  }
}
