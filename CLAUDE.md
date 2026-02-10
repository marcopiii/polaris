# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nox Polaris is a radial shoot 'em up game where the player is fixed at the center of a circular playfield, shooting enemies that approach from the edges. The game uses **polar coordinates** as its core coordinate system, with the player always at the origin (r=0).

## Commands

```bash
# Development
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build (outputs to dist/)
pnpm preview          # Preview production build

# Code Quality
pnpm typecheck        # TypeScript type checking
pnpm lint             # Run ESLint
pnpm lint:fix         # Auto-fix ESLint errors
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting only
pnpm knip             # Detect unused exports (dead code)
```

### Required Pre-Commit Workflow

**Always run these checks before finishing work:**

1. `pnpm typecheck` - Ensure TypeScript compiles without errors
2. `pnpm lint` - Check for linting issues
3. `pnpm format` - Auto-format all code
4. `pnpm knip` - Check for dead code (some unused utils are OK)

Fix all errors before committing. TypeScript compilation errors and ESLint errors must be resolved.

### Git Merge Policy

Always merge with a merge commit (`git merge --no-ff`). Never fast-forward.

## Architecture

### Coordinate System

The game uses **polar coordinates** (r, θ) with the player fixed at the center:
- **Player**: Always at origin (r=0, theta=any)
- **Enemies**: Spawn at playfield edge (r=PLAYFIELD_RADIUS, random θ), move toward center (decreasing r)
- **Bullets**: Use Cartesian coordinates internally for straight-line movement

Conversion utilities are in `utils/PolarCoordinates.ts`.

### Game Loop Structure

The main game logic lives in `GameScene`:

1. **Update Phase** (`update()` method):
   - Update blur shader uniforms every frame
   - Update player (rotation, shooting)
   - Update level manager (spawns enemies based on time-based spawn rate)
   - Update all enemies (move toward center, check terminal radius collision)
   - Update all bullets (move, check bounds)
   - Check bullet-enemy collisions
   - Check level completion
   - Check game over condition

2. **Managers** (stateless between levels, except ScoreManager):
   - `LevelManager`: Handles spawn rate calculation `rate(t) = SPAWN_RATE_INITIAL + SPAWN_RATE_ACCELERATION × t`
   - `ScoreManager`: Tracks cumulative score across levels
   - `AudioManager`: Wraps procedural audio generation (Web Audio API)
   - `LeaderboardManager`: localStorage persistence for top 10 scores

3. **Entity Lifecycle**:
   - Entities are plain classes (not Phaser GameObjects), they manage their own `Graphics` objects
   - Entities have `.active` flag - when false, they're removed from arrays
   - Use `.destroy()` to clean up Graphics and mark inactive

### Vision & Terminal Radius System

Core gameplay mechanic with two concentric circles:

- **Vision Radius**: Starts at 900px (full playfield). When an enemy crosses the terminal radius, vision decreases by 180px (blur expands)
- **Terminal Radius**: Starts at 45px. When vision reaches 0, it resets to 900px and terminal grows by 45px
- **Game Over**: When terminal radius >= playfield radius (900px)

The blur effect is implemented via **WebGL PostFX shader** (`VisionBlurShader.ts`):
- Shader must be registered with `renderer.pipelines.addPostPipeline(name, ShaderClass)` (pass class, not instance)
- Uniforms are set in `onPreRender()` callback, not during update loop
- Camera receives shader with `camera.setPostPipeline(name)` which returns an array

### Scene Flow

`BootScene` → `MainMenuScene` → `GameScene` ⟷ `GameOverScene`

- Scenes communicate via `this.scene.start(sceneName, data)` for data passing
- GameOverScene receives `{ score: number }` from GameScene

## Key Constants

All gameplay values are in `constants.ts`. When tweaking game feel:
- `SPAWN_RATE_INITIAL` and `SPAWN_RATE_ACCELERATION`: Control difficulty curve
- `ENEMY_SPEED` and `BULLET_SPEED`: Expressed as fractions of playfield radius per second
- `VISION_RADIUS_DECREASE` and `TERMINAL_RADIUS_INCREASE`: Control damage progression

## WebGL Shader Gotchas

1. **Pipeline Registration**: Use `addPostPipeline(name, Class)` not `add()`, pass class not instance
2. **Uniform Setting**: Only call `set1f()`, `set2f()` etc. in `onPreRender()` callback, never in update loop
3. **Shader Access**: `camera.setPostPipeline()` returns array of pipelines, access `[0]` for instance
4. **Graceful Degradation**: Check `renderer.type === Phaser.WEBGL` before attempting shader setup

## Audio System

Uses procedural generation via Web Audio API (`AudioGenerator.ts`) - no audio files needed. Each sound is generated on-the-fly using oscillators and noise buffers.

## Particle Effects

`ParticleEffects.ts` uses Phaser tweens to animate Graphics objects. Each effect creates temporary Graphics that auto-destroy on completion.

## Development Notes

- Entities use polar coordinates but store Cartesian `x, y` for rendering
- All distances/radii should be relative to `PLAYFIELD_RADIUS` for scalability
- The playfield is centered in a 2048×2048 game world that auto-scales to fit viewport
- TypeScript strict mode is enabled - all unused parameters must be prefixed with `_`
