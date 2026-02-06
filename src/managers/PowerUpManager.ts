import { PLAYFIELD_RADIUS } from '../constants';

export enum PowerUpType {
  RAPID_FIRE = 'RAPID_FIRE',
  REINFORCED_VISION = 'REINFORCED_VISION',
  TERMINAL_SHRINK = 'TERMINAL_SHRINK',
  MULTI_SHOT = 'MULTI_SHOT',
}

interface PowerUpDefinition {
  type: PowerUpType;
  name: string;
  description: string;
}

const POWER_UP_DEFINITIONS: PowerUpDefinition[] = [
  {
    type: PowerUpType.RAPID_FIRE,
    name: 'Rapid Fire',
    description: 'Increase fire rate',
  },
  {
    type: PowerUpType.REINFORCED_VISION,
    name: 'Reinforced Vision',
    description: 'Reduce vision loss per hit',
  },
  {
    type: PowerUpType.TERMINAL_SHRINK,
    name: 'Terminal Shrink',
    description: 'Shrink the terminal radius',
  },
  {
    type: PowerUpType.MULTI_SHOT,
    name: 'Multi-Shot',
    description: 'Fire additional bullets',
  },
];

export default class PowerUpManager {
  private stacks: Map<PowerUpType, number> = new Map();

  addPowerUp(type: PowerUpType): void {
    this.stacks.set(type, this.getStacks(type) + 1);
  }

  getStacks(type: PowerUpType): number {
    return this.stacks.get(type) ?? 0;
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

  /** Return 3 random power-ups from the 4 available */
  getRandomSelection(): PowerUpDefinition[] {
    const shuffled = [...POWER_UP_DEFINITIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  reset(): void {
    this.stacks.clear();
  }
}
