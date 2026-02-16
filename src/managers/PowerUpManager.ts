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
}

export enum PowerUpRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

export const RARITY_COLORS: Record<PowerUpRarity, number> = {
  [PowerUpRarity.COMMON]: 0xaaaaaa,
  [PowerUpRarity.UNCOMMON]: 0x4488ff,
  [PowerUpRarity.RARE]: 0xaa44ff,
  [PowerUpRarity.EPIC]: 0xff4488,
  [PowerUpRarity.LEGENDARY]: 0xffaa00,
};

const RARITY_WEIGHTS: Record<PowerUpRarity, number> = {
  [PowerUpRarity.COMMON]: 90,
  [PowerUpRarity.UNCOMMON]: 60,
  [PowerUpRarity.RARE]: 30,
  [PowerUpRarity.EPIC]: 15,
  [PowerUpRarity.LEGENDARY]: 5,
};

const STACK_DECAY = 0.9;
const STACK_CAP = 5;

export interface PowerUpDefinition {
  type: PowerUpType;
  name: string;
  description: string;
  rarity: PowerUpRarity;
  consumable: boolean;
}

export const MAX_CONSUMABLE_INVENTORY = 16;
export const MAX_EQUIPPED_SLOTS = 4;

const CONSUMABLE_TYPES = new Set<PowerUpType>([
  PowerUpType.SHOCKWAVE,
  PowerUpType.NOVA_BURST,
  PowerUpType.LASER_BEAM,
  PowerUpType.SWEEPSHOT,
  PowerUpType.ORBITAL_FLARE,
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
];

export function getConsumableDefinition(type: PowerUpType): PowerUpDefinition | undefined {
  return POWER_UP_DEFINITIONS.find((d) => d.type === type && d.consumable);
}

export default class PowerUpManager {
  private stacks: Map<PowerUpType, number> = new Map();
  private inventory: Map<PowerUpType, number> = new Map();
  private equipped: (PowerUpType | null)[] = [null, null, null, null];

  addPowerUp(type: PowerUpType): void {
    if (CONSUMABLE_TYPES.has(type)) {
      if (this.getTotalConsumableCount() >= MAX_CONSUMABLE_INVENTORY) return;
      this.inventory.set(type, this.getInventoryCount(type) + 1);
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

  /** Count of a consumable type in inventory only (not equipped) */
  getInventoryCount(type: PowerUpType): number {
    return this.inventory.get(type) ?? 0;
  }

  /** Total owned count of a consumable type (inventory + equipped) */
  getConsumableCount(type: PowerUpType): number {
    let count = this.inventory.get(type) ?? 0;
    for (const slot of this.equipped) {
      if (slot === type) count++;
    }
    return count;
  }

  /** Total number of consumables owned (inventory + equipped) */
  getTotalConsumableCount(): number {
    let total = 0;
    for (const count of this.inventory.values()) {
      total += count;
    }
    for (const slot of this.equipped) {
      if (slot !== null) total++;
    }
    return total;
  }

  getEquippedSlot(slot: number): PowerUpType | null {
    if (slot < 0 || slot >= MAX_EQUIPPED_SLOTS) return null;
    return this.equipped[slot] ?? null;
  }

  /** Equip a consumable from inventory to a slot. Returns true on success. */
  equipToSlot(slot: number, type: PowerUpType): boolean {
    if (slot < 0 || slot >= MAX_EQUIPPED_SLOTS) return false;
    if (!CONSUMABLE_TYPES.has(type)) return false;
    const invCount = this.getInventoryCount(type);
    if (invCount <= 0) return false;

    // If slot already has something, unequip it first
    this.unequipSlot(slot);

    // Remove from inventory, place in slot
    this.inventory.set(type, invCount - 1);
    if (this.getInventoryCount(type) <= 0) this.inventory.delete(type);
    this.equipped[slot] = type;
    return true;
  }

  /** Unequip a slot back to inventory. Returns true if slot had something. */
  unequipSlot(slot: number): boolean {
    if (slot < 0 || slot >= MAX_EQUIPPED_SLOTS) return false;
    const type = this.equipped[slot];
    if (!type) return false;

    this.inventory.set(type, this.getInventoryCount(type) + 1);
    this.equipped[slot] = null;
    return true;
  }

  /** Use the consumable in the given equipped slot. Returns the type, or null. */
  useEquippedSlot(slot: number): PowerUpType | null {
    if (slot < 0 || slot >= MAX_EQUIPPED_SLOTS) return null;
    const type = this.equipped[slot];
    if (!type) return null;
    this.equipped[slot] = null;
    return type;
  }

  /** Check if the player owns any consumables (inventory or equipped) */
  hasAnyConsumables(): boolean {
    return this.getTotalConsumableCount() > 0;
  }

  /** Get inventory entries (type + count) for equip screen UI */
  getInventoryEntries(): { type: PowerUpType; count: number }[] {
    const entries: { type: PowerUpType; count: number }[] = [];
    for (const [type, count] of this.inventory.entries()) {
      if (count > 0) {
        entries.push({ type, count });
      }
    }
    return entries;
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

  /** Return 3 weighted-random power-ups (no duplicates, rarity-weighted with stack decay) */
  getRandomSelection(): PowerUpDefinition[] {
    let defs = [...POWER_UP_DEFINITIONS];

    // If consumable inventory is full, exclude consumables from pool
    if (this.getTotalConsumableCount() >= MAX_CONSUMABLE_INVENTORY) {
      defs = defs.filter((p) => !p.consumable);
    }

    const pool = defs.map((def) => ({ def, weight: this.getEffectiveWeight(def) }));
    const selected: PowerUpDefinition[] = [];

    for (let i = 0; i < 3 && pool.length > 0; i++) {
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
    this.inventory.clear();
    this.equipped = [null, null, null, null];
  }
}
