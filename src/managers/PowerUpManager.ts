import { PLAYFIELD_RADIUS } from '../constants';

export enum PowerUpType {
  // Passives (stackable)
  RAPID_FIRE = 'RAPID_FIRE',
  REINFORCED_VISION = 'REINFORCED_VISION',
  MULTI_SHOT = 'MULTI_SHOT',
  ENEMY_SLOWDOWN = 'ENEMY_SLOWDOWN',
  TERMINAL_SHRINK = 'TERMINAL_SHRINK',
  PIERCING_ROUNDS = 'PIERCING_ROUNDS',
  ORBITAL_SHIELD = 'ORBITAL_SHIELD',
  CHAIN_LIGHTNING = 'CHAIN_LIGHTNING',
  // Consumables (one-use, activated during gameplay)
  SHOCKWAVE = 'SHOCKWAVE',
  NOVA_BURST = 'NOVA_BURST',
  LASER_BEAM = 'LASER_BEAM',
}

export enum PowerUpRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  LEGENDARY = 'LEGENDARY',
}

export const RARITY_COLORS: Record<PowerUpRarity, number> = {
  [PowerUpRarity.COMMON]: 0xaaaaaa,
  [PowerUpRarity.UNCOMMON]: 0x4488ff,
  [PowerUpRarity.RARE]: 0xaa44ff,
  [PowerUpRarity.LEGENDARY]: 0xffaa00,
};

export interface PowerUpDefinition {
  type: PowerUpType;
  name: string;
  description: string;
  rarity: PowerUpRarity;
  weight: number;
  consumable: boolean;
}

const CONSUMABLE_TYPES = new Set<PowerUpType>([
  PowerUpType.SHOCKWAVE,
  PowerUpType.NOVA_BURST,
  PowerUpType.LASER_BEAM,
]);

const POWER_UP_DEFINITIONS: PowerUpDefinition[] = [
  {
    type: PowerUpType.RAPID_FIRE,
    name: 'Rapid Fire',
    description: 'Increase fire rate',
    rarity: PowerUpRarity.COMMON,
    weight: 30,
    consumable: false,
  },
  {
    type: PowerUpType.REINFORCED_VISION,
    name: 'Reinforced Vision',
    description: 'Reduce vision loss per hit',
    rarity: PowerUpRarity.UNCOMMON,
    weight: 20,
    consumable: false,
  },
  {
    type: PowerUpType.MULTI_SHOT,
    name: 'Multi-Shot',
    description: 'Fire additional bullets',
    rarity: PowerUpRarity.UNCOMMON,
    weight: 18,
    consumable: false,
  },
  {
    type: PowerUpType.ENEMY_SLOWDOWN,
    name: 'Gravity Well',
    description: 'Enemies move 15% slower',
    rarity: PowerUpRarity.UNCOMMON,
    weight: 18,
    consumable: false,
  },
  {
    type: PowerUpType.TERMINAL_SHRINK,
    name: 'Terminal Shrink',
    description: 'Shrink the terminal radius',
    rarity: PowerUpRarity.UNCOMMON,
    weight: 15,
    consumable: false,
  },
  {
    type: PowerUpType.PIERCING_ROUNDS,
    name: 'Piercing Rounds',
    description: 'Bullets pierce through enemies',
    rarity: PowerUpRarity.RARE,
    weight: 10,
    consumable: false,
  },
  {
    type: PowerUpType.ORBITAL_SHIELD,
    name: 'Orbital Shield',
    description: 'Orbiting shield destroys enemies',
    rarity: PowerUpRarity.RARE,
    weight: 8,
    consumable: false,
  },
  {
    type: PowerUpType.CHAIN_LIGHTNING,
    name: 'Chain Lightning',
    description: 'Kills chain to nearby enemies',
    rarity: PowerUpRarity.LEGENDARY,
    weight: 5,
    consumable: false,
  },
  {
    type: PowerUpType.SHOCKWAVE,
    name: 'Shockwave',
    description: 'Destroy all enemies at once [1]',
    rarity: PowerUpRarity.UNCOMMON,
    weight: 12,
    consumable: true,
  },
  {
    type: PowerUpType.NOVA_BURST,
    name: 'Nova Burst',
    description: 'Fire 360 bullets in all directions [2]',
    rarity: PowerUpRarity.UNCOMMON,
    weight: 12,
    consumable: true,
  },
  {
    type: PowerUpType.LASER_BEAM,
    name: 'Laser Beam',
    description: 'Wide laser beam for 3 seconds [3]',
    rarity: PowerUpRarity.RARE,
    weight: 8,
    consumable: true,
  },
];

export default class PowerUpManager {
  private stacks: Map<PowerUpType, number> = new Map();
  private consumables: Map<PowerUpType, number> = new Map();

  addPowerUp(type: PowerUpType): void {
    if (CONSUMABLE_TYPES.has(type)) {
      this.consumables.set(type, this.getConsumableCount(type) + 1);
    } else {
      this.stacks.set(type, this.getStacks(type) + 1);
    }
  }

  getStacks(type: PowerUpType): number {
    return this.stacks.get(type) ?? 0;
  }

  getConsumableCount(type: PowerUpType): number {
    return this.consumables.get(type) ?? 0;
  }

  /** Use a consumable. Returns true if it was available. */
  useConsumable(type: PowerUpType): boolean {
    const count = this.getConsumableCount(type);
    if (count <= 0) return false;
    this.consumables.set(type, count - 1);
    return true;
  }

  isConsumable(type: PowerUpType): boolean {
    return CONSUMABLE_TYPES.has(type);
  }

  /** Fire cooldown: 1000 / (4 + stacks) — base ~250ms, decreases with stacks */
  getFireCooldown(): number {
    return 1000 / (4 + this.getStacks(PowerUpType.RAPID_FIRE));
  }

  /** Vision radius decrease: PLAYFIELD_RADIUS / (5 + stacks) — base 180px */
  getVisionRadiusDecrease(): number {
    return PLAYFIELD_RADIUS / (5 + this.getStacks(PowerUpType.REINFORCED_VISION));
  }

  /** Bullet count: 1 + stacks */
  getBulletCount(): number {
    return 1 + this.getStacks(PowerUpType.MULTI_SHOT);
  }

  /** Enemy speed multiplier: max(0.25, 1 - 0.15 * stacks) */
  getEnemySpeedMultiplier(): number {
    return Math.max(0.25, 1 - 0.15 * this.getStacks(PowerUpType.ENEMY_SLOWDOWN));
  }

  /** Number of enemies a bullet can pierce through (0 = normal, destroys on hit) */
  getPierceCount(): number {
    return this.getStacks(PowerUpType.PIERCING_ROUNDS);
  }

  /** Number of orbital shields */
  getShieldCount(): number {
    return this.getStacks(PowerUpType.ORBITAL_SHIELD);
  }

  /** Number of chain lightning bounces per kill */
  getChainCount(): number {
    return this.getStacks(PowerUpType.CHAIN_LIGHTNING);
  }

  /** Chain lightning range in pixels */
  getChainRange(): number {
    return 150;
  }

  /** Return 3 weighted-random power-ups (no duplicates) */
  getRandomSelection(): PowerUpDefinition[] {
    const pool = [...POWER_UP_DEFINITIONS];
    const selected: PowerUpDefinition[] = [];

    for (let i = 0; i < 3 && pool.length > 0; i++) {
      const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
      let roll = Math.random() * totalWeight;

      for (let j = 0; j < pool.length; j++) {
        roll -= pool[j].weight;
        if (roll <= 0) {
          selected.push(pool[j]);
          pool.splice(j, 1);
          break;
        }
      }
    }

    return selected;
  }

  reset(): void {
    this.stacks.clear();
    this.consumables.clear();
  }
}
