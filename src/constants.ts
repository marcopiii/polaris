// ─── Difficulty ─────────────────────────────────────────────────────────
export type Difficulty = 'easy' | 'normal' | 'hard' | 'madness';
export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'madness'];
export const DEFAULT_DIFFICULTY: Difficulty = 'normal';
export const DIFFICULTY_STORAGE_KEY = 'noxPolaris_difficulty';

// ─── Fundamental Scale ──────────────────────────────────────────────────
// PLAYFIELD_RADIUS is the single source of truth for sizing.
// All pixel measurements are expressed relative to it via the PX factor.
// To change the internal resolution, adjust PLAYFIELD_RADIUS only.
export const PLAYFIELD_RADIUS = 1800;

// Scale factor relative to the original 900-px design.
// Multiply any hard-coded pixel value from the original design by PX.
const BASE_PLAYFIELD_RADIUS = 900;
export const PX = PLAYFIELD_RADIUS / BASE_PLAYFIELD_RADIUS;

// Game world derived from playfield (wider to fit radial HUD)
export const GAME_WIDTH = Math.ceil(2560 * PX);
export const GAME_HEIGHT = Math.ceil(2048 * PX);

// Player
export const PLAYER_SIZE = 10 * PX;
export const FIRE_COOLDOWN = 500; // milliseconds

// Enemy
export const ENEMY_SIZE = 16 * PX;
export const ENEMY_SPEED = 0.1; // 10% of playfield radius per second

// Enemy Health System
export enum HealthModel {
  CIRCLE = 'CIRCLE', // health ∝ area: size = ENEMY_SIZE × √hits
  SPHERE = 'SPHERE', // health ∝ volume: size = ENEMY_SIZE × ∛hits
}
export const ENEMY_HEALTH_MODEL: HealthModel = HealthModel.CIRCLE;

// Enemy Level Distribution — Power Weights
// weight(L) = (playerLvl - threshold(L) + 1) ^ ENEMY_LEVEL_EXP
// threshold(L) = ENEMY_LEVEL_GAP * (L - 1) - 1  (for L >= 2)
export const ENEMY_LEVEL_EXP: Record<Difficulty, number> = {
  easy: 3.0,
  normal: 3.6,
  hard: 4.0,
  madness: 4.5,
};
export const ENEMY_LEVEL_GAP: Record<Difficulty, number> = {
  easy: 4,
  normal: 3,
  hard: 2,
  madness: 1,
};

// Bullet
export const BULLET_WIDTH = 24 * PX;
export const BULLET_HEIGHT = 6 * PX;
export const BULLET_SPEED = 2.5; // 2.5 playfield radius per second

// Damage system
export const TERMINAL_RADIUS_INITIAL = 72 * PX;
export const VISION_RADIUS_INITIAL = PLAYFIELD_RADIUS; // 100% of playfield
export const TERMINAL_RADIUS_INCREASE: Record<Difficulty, number> = {
  easy: 30 * PX,
  normal: 45 * PX,
  hard: 60 * PX,
  madness: 80 * PX,
};

// Level system
export const LEVEL_BASE_DURATION = 20; // seconds
export const LEVEL_DURATION_INCREMENT = 5; // seconds
export const SPAWN_RATE_INITIAL: Record<Difficulty, number> = {
  easy: 0.35,
  normal: 0.5,
  hard: 0.65,
  madness: 0.9,
};
export const SPAWN_RATE_ACCELERATION: Record<Difficulty, number> = {
  easy: 0.03,
  normal: 0.05,
  hard: 0.08,
  madness: 0.12,
};
export const SPAWN_RATE_LEVEL_INCREMENT: Record<Difficulty, number> = {
  easy: 0.15,
  normal: 0.2,
  hard: 0.3,
  madness: 0.4,
};

// Spawn Distribution (angular clustering)
export const SPAWN_DISTRIBUTION_HARMONICS = 4; // number of sine components
export const SPAWN_DISTRIBUTION_AMPLITUDE_MAX = 1.2; // peak amplitude per harmonic
export const SPAWN_DISTRIBUTION_MORPH_INTERVAL = 3.5; // seconds between new random targets
export const SPAWN_DISTRIBUTION_LERP_SPEED = 1.0; // exponential lerp rate (higher = faster)
export const SPAWN_DISTRIBUTION_RESOLUTION = 360; // CDF discretization bins

// Scoring
export const POINTS_PER_KILL = 10;
export const SCORE_MULTIPLIER: Record<Difficulty, number> = {
  easy: 0.5,
  normal: 1.0,
  hard: 1.5,
  madness: 2.0,
};

// Consumables
export const LASER_BEAM_DURATION = 3000; // milliseconds
export const LASER_BEAM_HALF_ANGLE = (3 * Math.PI) / 180; // 3 degrees each side = 6 deg total
export const LASER_MAX_ANGULAR_SPEED = Math.PI; // radians per second (180°/s)
export const LASER_ANGULAR_ACCEL = Math.PI * 4; // radians/s² (~0.25s to reach max speed)

// Sweepshot
export const SWEEPSHOT_SPEED = 0.75; // radii per second (center → edge)
export const SWEEPSHOT_ARC_ANGLE = (45 * Math.PI) / 180; // 45 degrees wide
export const SWEEPSHOT_THICKNESS_INNER = 6 * PX;
export const SWEEPSHOT_THICKNESS_MID = 8 * PX;
export const SWEEPSHOT_THICKNESS_OUTER = 12 * PX;
export const SWEEPSHOT_LAYER_GAP = 18 * PX; // distance between concentric arcs

// Orbital Flare
export const ORBITAL_FLARE_SPEED = 0.5; // radii per second (center → edge)
export const ORBITAL_FLARE_SPAWN_INTERVAL = 0.05; // radii between bullet spawns
export const ORBITAL_BULLET_LINEAR_SPEED = 0.6; // radii/s (angular speed = linear / radius)
export const ORBITAL_BULLET_SIZE = 8 * PX; // visual/collision radius
export const ORBITAL_FLARE_WIDTH = 20 * PX;
export const ORBITAL_FLARE_HEIGHT = 12 * PX;

// Orbital Shield
export const SHIELD_ORBIT_OFFSET = 60 * PX; // pixels outside the terminal radius
export const SHIELD_MAX_SLOTS = 8; // max shields around the player
export const SHIELD_ORBIT_SPEED = 1.5; // radians per second
export const SHIELD_ARC_ANGLE = (43 * Math.PI) / 180; // initial arc width in radians
export const SHIELD_ARC_SHRINK = (3 * Math.PI) / 180; // shrink per hit in radians
export const SHIELD_ARC_MIN = (19 * Math.PI) / 180; // destroyed when below this
export const SHIELD_THICKNESS = 15 * PX; // arc thickness in pixels

// Gamepad
export const GAMEPAD_DEADZONE_DEFAULT = 0.3;
export const GAMEPAD_DEADZONE_STORAGE_KEY = 'noxPolaris_gamepadDeadzone';

// Audio
export const VOLUME_DEFAULT = 10;
export const VOLUME_MIN = 0;
export const VOLUME_MAX = 10;
export const VOLUME_STEP = 1;
export const VOLUME_STORAGE_KEY = 'noxPolaris_volume';

// HUD font sizes
export const HUD_FONT_PRIMARY = 58 * PX;
export const HUD_FONT_SECONDARY = 32 * PX;

// Colors
export const COLORS = {
  player: 0xba0000,
  enemy: 0x333333,
  bullet: 0xffffff,
  playfield: 0xbbbbbb,
  background: 0x333333,
  terminalRadiusHint: 0xba0000,
};
