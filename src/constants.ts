export const GAME_WIDTH = 2048;
export const GAME_HEIGHT = 2048;

// Playfield
export const PLAYFIELD_RADIUS = 900;

// Player
export const PLAYER_SIZE = 10;
export const FIRE_COOLDOWN = 250; // milliseconds

// Enemy
export const ENEMY_SIZE = 16;
export const ENEMY_SPEED = 0.1; // 10% of playfield radius per second

// Bullet
export const BULLET_WIDTH = 24;
export const BULLET_HEIGHT = 6;
export const BULLET_SPEED = 1.5; // 1.5 playfield radius per second

// Damage system
export const TERMINAL_RADIUS_INITIAL = 72; // 8% of playfield
export const VISION_RADIUS_INITIAL = 900; // 100% of playfield
export const TERMINAL_RADIUS_INCREASE = 45; // 5% of playfield

// Level system
export const LEVEL_BASE_DURATION = 20; // seconds
export const LEVEL_DURATION_INCREMENT = 5; // seconds
export const SPAWN_RATE_INITIAL = 0.5; // enemies per second
export const SPAWN_RATE_ACCELERATION = 0.05; // per second squared
export const SPAWN_RATE_LEVEL_INCREMENT = 0.2; // increase per level

// Scoring
export const POINTS_PER_KILL = 10;

// Consumables
export const LASER_BEAM_DURATION = 3000; // milliseconds
export const LASER_BEAM_HALF_ANGLE = (3 * Math.PI) / 180; // 3 degrees each side = 6 deg total

// Orbital Shield
export const SHIELD_ORBIT_RADIUS = 120; // pixels from center
export const SHIELD_ORBIT_SPEED = 2.5; // radians per second
export const SHIELD_SIZE = 14; // radius of shield circle
export const SHIELD_MAX_HITS = 3; // hits before shield is destroyed

// Colors
export const COLORS = {
  player: 0xba0000,
  enemy: 0x333333,
  bullet: 0xffffff,
  playfield: 0xbbbbbb,
  background: 0x333333,
  terminalRadiusHint: 0xba0000,
};
