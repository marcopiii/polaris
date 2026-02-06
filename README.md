# Nox Polaris

A minimalist radial shoot 'em up game built with Phaser 3 and TypeScript.

![Nox Polaris](https://img.shields.io/badge/Phaser-3.90-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue) ![Vite](https://img.shields.io/badge/Vite-7.3-purple)

## Game Concept

You're the red dot at the center of a circle. Enemies spawn at the edge and move toward you. Aim with your mouse and click to shoot. Survive as long as you can!

### Unique Mechanics

- **Vision Radius**: When enemies reach you, your vision shrinks. The area outside your vision becomes blurred.
- **Terminal Radius**: When your vision shrinks to zero, it resets but your "safe zone" grows. If the terminal radius reaches the playfield edge, it's game over!
- **Progressive Difficulty**: Each level lasts longer and enemies spawn faster as time passes.

## Features

✨ **Implemented**
- Polar coordinate-based gameplay
- Automatic shooting on mouse hold (250ms cooldown)
- Dynamic enemy spawning with acceleration
- Vision radius blur effect (WebGL shader)
- Procedural audio generation (Web Audio API)
- Particle effects on kills
- Screen shake on damage
- Score system with local leaderboard (top 10)
- Multiple levels with increasing difficulty

## Tech Stack

- **Phaser 3**: Game framework
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **pnpm**: Efficient package management
- **ESLint + Prettier**: Code quality and formatting
- **Knip**: Dead code detection

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Development Commands

```bash
pnpm lint          # Run ESLint
pnpm lint:fix      # Fix ESLint errors
pnpm format        # Format code with Prettier
pnpm format:check  # Check formatting
pnpm knip          # Detect dead code
```

## How to Play

1. **Aim**: Move your mouse to aim
2. **Shoot**: Click (once) or hold (automatic fire)
3. **Survive**: Kill enemies before they reach your terminal radius
4. **Score**: Get 10 points per kill
5. **Progress**: Complete levels to advance

### Game Over Conditions

- Your terminal radius (red circle) grows each time your vision resets
- When the terminal radius reaches the playfield edge, it's game over
- This means you can take ~100 hits before losing (5 hits per vision cycle × 20 vision cycles)

## Project Structure

```
src/
├── main.ts                    # Game initialization
├── constants.ts               # Game constants
├── types.ts                   # TypeScript types
├── scenes/                    # Phaser scenes
│   ├── BootScene.ts          # Asset loading
│   ├── MainMenuScene.ts      # Main menu
│   ├── GameScene.ts          # Gameplay
│   └── GameOverScene.ts      # Game over + leaderboard
├── entities/                  # Game entities
│   ├── Player.ts             # Player (red dot)
│   ├── Enemy.ts              # Enemies (black dots)
│   └── Bullet.ts             # Bullets (white ovals)
├── managers/                  # Game systems
│   ├── ScoreManager.ts       # Score tracking
│   ├── LevelManager.ts       # Level progression
│   ├── AudioManager.ts       # Sound effects
│   └── LeaderboardManager.ts # High scores
├── shaders/                   # Custom shaders
│   └── VisionBlurPipeline.ts # Radial blur effect
└── utils/                     # Utilities
    ├── PolarCoordinates.ts   # Coordinate conversion
    ├── MathUtils.ts          # Math helpers
    ├── AudioGenerator.ts     # Procedural audio
    └── ParticleEffects.ts    # Visual effects
```

## Game Constants

- **Playfield Radius**: 900px
- **Player Size**: 8px
- **Enemy Size**: 8px
- **Enemy Speed**: 16% of playfield radius per second (144px/s)
- **Bullet Speed**: 1 playfield radius per second (900px/s)
- **Fire Cooldown**: 250ms
- **Points Per Kill**: 10
- **Level Base Duration**: 20s (increases by 5s each level)
- **Spawn Rate**: Starts at 1/s, accelerates by 0.1/s² during each level

## Visual Design

Minimalist dark pastel aesthetic:
- **Player**: Red dot (#ff4444)
- **Enemies**: Black dots (#000000)
- **Bullets**: White glowing ovals (#ffffff)
- **Playfield**: Light grey (#cccccc)
- **Background**: Dark grey (#333333)

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Requires WebGL for blur effect (gracefully degrades if unavailable)

## License

ISC

## Credits

Built with ❤️ using Phaser 3 and TypeScript
