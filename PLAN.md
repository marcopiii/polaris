# Nox Polaris - Detailed Implementation Plan

## 1. Project Setup & Configuration

### 1.1 Initialize Project
- Create project with Vite + TypeScript template
- Install Phaser 3 via pnpm
- Configure `tsconfig.json` for strict mode, path aliases
- Set up Vite config for asset handling and dev server

### 1.2 Development Tools
- Configure ESLint with TypeScript rules, Phaser globals
- Set up Prettier with consistent formatting rules
- Install and configure `knit` for dead code detection
- Add npm scripts: `dev`, `build`, `lint`, `format`, `knit`

### 1.3 Git Setup
- Initialize git repository
- Create `.gitignore` (node_modules, dist, .env, etc.)
- Initial commit with project structure

---

## 2. Architecture & File Structure

```
src/
├── main.ts                    # Entry point, Phaser game config
├── constants.ts               # Game constants
├── types.ts                   # TypeScript interfaces/types
├── utils/
│   ├── PolarCoordinates.ts   # Polar ↔ Cartesian conversion
│   └── MathUtils.ts          # Helper math functions
├── scenes/
│   ├── BootScene.ts          # Asset loading
│   ├── MainMenuScene.ts      # Start screen
│   ├── GameScene.ts          # Main gameplay
│   └── GameOverScene.ts      # End screen with leaderboard
├── entities/
│   ├── Player.ts             # Player entity
│   ├── Enemy.ts              # Enemy entity
│   └── Bullet.ts             # Bullet entity
├── managers/
│   ├── ScoreManager.ts       # Score tracking
│   ├── LevelManager.ts       # Level progression & spawning
│   ├── AudioManager.ts       # Sound effects & music
│   └── LeaderboardManager.ts # Local storage leaderboard
└── assets/
    ├── audio/
    │   ├── sfx/              # Sound effects
    │   └── music/            # Background music
    └── fonts/                # Web fonts if needed
```

---

## 3. Constants Definition

### 3.1 Core Constants (`constants.ts`)
```typescript
PLAYFIELD_RADIUS = 900px
TERMINAL_RADIUS_INITIAL = 45px (5% of playfield)
VISION_RADIUS_INITIAL = 900px (100% of playfield)
PLAYER_SIZE = 8px (radius of dot)
ENEMY_SIZE = 8px
BULLET_SIZE = { width: 6px, height: 12px } (ovoid)

ENEMY_SPEED = 0.16 (16% of playfield radius per second = 144px/s)
BULLET_SPEED = 1.0 (1 playfield radius per second = 900px/s)
FIRE_COOLDOWN = 250ms

LEVEL_BASE_DURATION = 20s
LEVEL_DURATION_INCREMENT = 5s
SPAWN_RATE_INITIAL = 1/s
SPAWN_RATE_ACCELERATION = 0.1/s²

VISION_RADIUS_DECREASE = 180px (20% of playfield)
TERMINAL_RADIUS_INCREASE = 45px (5% of playfield)
POINTS_PER_KILL = 10

COLORS = {
  player: 0xff4444,
  enemy: 0x000000,
  bullet: 0xffffff,
  playfield: 0xcccccc,
  background: 0x333333
}
```

---

## 4. Utility Systems

### 4.1 Polar Coordinate System
**File:** `utils/PolarCoordinates.ts`
- `polarToCartesian(r, θ)` → `{x, y}` (relative to center)
- `cartesianToPolar(x, y)` → `{r, θ}`
- `normalizeAngle(θ)` → angle in [0, 2π]

### 4.2 Math Utilities
**File:** `utils/MathUtils.ts`
- `distance(x1, y1, x2, y2)`
- `angleBetween(x1, y1, x2, y2)`
- `lerp(a, b, t)`

---

## 5. Core Entities

### 5.1 Player Entity
**File:** `entities/Player.ts`
- **Position:** Fixed at origin (center) in polar coords (r=0)
- **Rotation:** Calculate angle to cursor, rotate dot visual
- **Rendering:** Red circle (Graphics object)
- **Shooting:**
  - On mouse down: fire immediately
  - While held: fire every 250ms (cooldown timer)
  - Create bullet at player position, direction toward cursor
- **Methods:**
  - `update(time, delta)`: handle rotation, shooting cooldown
  - `shoot(targetX, targetY)`: create bullet
  - `getAngleToCursor()`: calculate rotation

### 5.2 Enemy Entity
**File:** `entities/Enemy.ts`
- **Position:** Polar coordinates `{r, θ}`
- **Spawn:** At playfield edge (r = PLAYFIELD_RADIUS), random θ
- **Movement:** Move toward center (decrease r) at ENEMY_SPEED
- **Rendering:** Black circle (Graphics object)
- **Collision Zones:**
  - If `r < terminalRadius`: trigger damage, destroy self
  - If hit by bullet: destroy, award points
- **Methods:**
  - `update(delta)`: move toward center
  - `checkCollision(bullet)`: check bullet collision
  - `destroy()`: remove from game

### 5.3 Bullet Entity
**File:** `entities/Bullet.ts`
- **Position:** Cartesian `{x, y}` (easier for straight-line movement)
- **Velocity:** Direction vector × BULLET_SPEED
- **Rendering:** White glowing oval (Graphics with glow filter/blur)
- **Lifespan:** Destroy at playfield edge (r > PLAYFIELD_RADIUS)
- **Methods:**
  - `update(delta)`: move along trajectory
  - `checkOutOfBounds()`: destroy if beyond playfield

---

## 6. Manager Systems

### 6.1 Level Manager
**File:** `managers/LevelManager.ts`
- **State:**
  - Current level number
  - Level duration (20s + 5s × level)
  - Spawn rate function: `rate(t) = 1 + 0.1 × t` enemies/sec
  - Enemies spawned this level
  - Level timer
- **Methods:**
  - `startLevel()`: reset timer, calculate duration
  - `update(delta)`: spawn enemies based on rate, check level completion
  - `spawnEnemy()`: create enemy at random angle
  - `onLevelComplete()`: increment level, start next
  - `getCurrentSpawnRate(levelTime)`: calculate current rate

### 6.2 Score Manager
**File:** `managers/ScoreManager.ts`
- **State:**
  - Current score
  - Kills this level
- **Methods:**
  - `addKill()`: add 10 points
  - `getScore()`: return current score
  - `reset()`: clear score

### 6.3 Audio Manager
**File:** `managers/AudioManager.ts`
- **Sound Effects:**
  - `shoot.mp3`: bullet fire
  - `hit.mp3`: enemy killed
  - `damage.mp3`: enemy reaches terminal radius
  - `visionLoss.mp3`: vision radius shrinks
  - `terminalGrow.mp3`: terminal radius grows, enemies killed
  - `gameOver.mp3`: game over
- **Music:**
  - `bgm_gameplay.mp3`: looping background music
  - `bgm_menu.mp3`: menu music
- **Methods:**
  - `playSound(key)`: play one-shot sound
  - `playMusic(key, loop)`: play/stop music
  - `setVolume(sfx, music)`: volume control

### 6.4 Leaderboard Manager
**File:** `managers/LeaderboardManager.ts`
- **Storage:** localStorage
- **Data Structure:** Array of `{name: string, score: number, date: timestamp}`
- **Methods:**
  - `addScore(name, score)`: insert score, keep top 10
  - `getTopScores(limit)`: return sorted list
  - `isHighScore(score)`: check if score qualifies

---

## 7. Damage & Vision System

### 7.1 Game State Variables
- `terminalRadius`: starts at 45px
- `visionRadius`: starts at 900px
- `hitCount`: tracks number of hits to vision radius

### 7.2 Damage Logic (in GameScene)
**When enemy crosses terminal radius:**
1. Decrease `visionRadius` by 180px
2. Destroy the enemy (no points)
3. Play damage sound
4. If `visionRadius <= 0`:
   - Reset `visionRadius` to 900px
   - Increase `terminalRadius` by 45px
   - Kill all existing enemies (no points)
   - Play terminal grow sound
5. If `terminalRadius >= PLAYFIELD_RADIUS`:
   - Trigger game over

### 7.3 Visual Implementation
- Draw outer circle at `visionRadius` (subtle outline)
- Draw inner circle at `terminalRadius` (danger zone, red tint)
- Apply blur shader/filter to entire scene beyond `visionRadius`
  - Use Phaser's BlurPostFX or custom shader
  - Blur strength: constant heavy blur (e.g., 20px)

---

## 8. Scene Implementation

### 8.1 BootScene
**Purpose:** Load all assets
- Load audio files
- Load fonts if needed
- Transition to MainMenuScene

### 8.2 MainMenuScene
**UI Elements:**
- Game title: "NOX POLARIS"
- Start button: "START GAME"
- Simple centered layout
- Dark pastel color scheme
**Interactions:**
- Click Start → transition to GameScene
- Play menu music

### 8.3 GameScene
**Setup:**
- Create playfield background (grey circle)
- Initialize Player at center
- Initialize managers (Level, Score, Audio)
- Set up input handlers (pointer, mouse)
- Create enemy and bullet groups

**Update Loop:**
1. Update player (rotation, shooting)
2. Update level manager (spawn enemies, check completion)
3. Update all enemies (movement, collision with terminal radius)
4. Update all bullets (movement, collision with enemies, out of bounds)
5. Check collisions (bullets vs enemies)
6. Update UI (score, level)

**Rendering:**
- Background (dark grey)
- Playfield circle (light grey)
- Vision radius blur effect
- Terminal radius circle (subtle red)
- All entities (enemies, player, bullets)
- UI overlay (score top-left, level top-right)

**Game Over Trigger:**
- When `terminalRadius >= PLAYFIELD_RADIUS`
- Stop spawning, freeze game
- Play game over sound
- Transition to GameOverScene after 2s delay

### 8.4 GameOverScene
**UI Elements:**
- "GAME OVER" title
- Final score display
- Name input field (if high score)
- Leaderboard table (top 10)
  - Columns: Rank, Name, Score
- "RESTART" button
- "MAIN MENU" button

**Interactions:**
- Enter name → save to leaderboard
- Restart → reset game, go to GameScene
- Main Menu → go to MainMenuScene

---

## 9. Visual Rendering Details

### 9.1 Entity Rendering
**Player:**
- `Graphics` circle, radius 8px, fill color 0xff4444
- Rotate entire graphic to face cursor
- Optional: small directional indicator (triangle/wedge)

**Enemies:**
- `Graphics` circle, radius 8px, fill color 0x000000
- No rotation needed

**Bullets:**
- `Graphics` ellipse, 6×12px, fill color 0xffffff
- Add glow: use `BlurFilter` or draw multiple overlapping shapes with alpha
- Rotate to match trajectory

**Playfield:**
- `Graphics` filled circle, radius 900px, color 0xcccccc
- Centered in scene

**Background:**
- Scene background color 0x333333

### 9.2 Blur Effect
- Use Phaser 3's `scene.cameras.main.setPostPipeline('Blur')`
- Custom shader approach:
  - Create render texture for playfield
  - Apply blur shader to pixels where `distance > visionRadius`
  - Blur intensity: 20px Gaussian blur

### 9.3 UI Rendering
- Score: Text top-left, white, 24px font
- Level: Text top-right, white, 24px font
- Simple sans-serif font (system font or web font)

---

## 10. Audio Implementation

### 10.1 Sound Effect Triggers
- **Shoot:** every bullet fired
- **Hit:** every enemy killed by bullet
- **Damage:** enemy crosses terminal radius
- **Vision Loss:** vision radius shrinks
- **Terminal Grow:** terminal radius increases
- **Game Over:** game ends

### 10.2 Music
- Menu: light ambient track, looping
- Gameplay: intense minimal electronic track, looping
- Fade transitions between scenes

### 10.3 Audio Files
- Create placeholder audio or use free assets (freesound.org)
- Format: MP3 or OGG for web compatibility

---

## 11. Input Handling

### 11.1 Mouse/Touch Input
**Player Rotation:**
- Listen to `pointermove` event
- Get cursor position relative to player (center)
- Calculate angle: `Math.atan2(dy, dx)`
- Update player rotation

**Shooting:**
- `pointerdown`: fire immediately, set `isShooting = true`
- While `isShooting`: fire every 250ms
- `pointerup`: set `isShooting = false`

### 11.2 Keyboard (optional for menu navigation)
- Enter: start game / restart
- ESC: pause (future feature)

---

## 12. Collision Detection

### 12.1 Bullet vs Enemy
**Algorithm:**
- For each bullet, check distance to each enemy
- If `distance(bullet, enemy) < ENEMY_SIZE + BULLET_SIZE`:
  - Destroy both
  - Add 10 points
  - Play hit sound

### 12.2 Enemy vs Terminal Radius
**Algorithm:**
- For each enemy, check if `enemy.r < terminalRadius`:
  - Trigger damage logic
  - Destroy enemy

---

## 13. Level Progression

### 13.1 Level Duration Calculation
```
duration(level) = 20 + 5 × (level - 1) seconds
```
- Level 1: 20s
- Level 2: 25s
- Level 3: 30s
- etc.

### 13.2 Spawn Rate Calculation
```
rate(t) = 1 + 0.1 × t enemies/second
```
Where `t` is time elapsed in current level (0 to duration)
- At t=0s: 1.0 enemies/s
- At t=10s: 2.0 enemies/s
- At t=20s: 3.0 enemies/s

### 13.3 Spawning Logic
- Calculate time since last spawn
- Calculate current rate
- If `timeSinceLastSpawn > 1/currentRate`: spawn enemy

### 13.4 Level Completion
- When all spawned enemies are killed AND level timer expired
- Automatically start next level (no break)

---

## 14. Game Over Conditions

### 14.1 Lose Condition
`terminalRadius >= PLAYFIELD_RADIUS` (900px)

### 14.2 Progression to Game Over
- Vision radius shrinks in 180px chunks (5 hits)
- After 5 hits to vision, terminal radius grows once (+45px)
- Terminal radius can grow 20 times before game over (45px × 20 = 900px)
- Total hits before game over: 5 hits × 20 = 100 hits

---

## 15. Testing & Polish

### 15.1 Testing Checklist
- [x] Player rotation tracks cursor smoothly
- [x] Shooting cooldown works correctly
- [x] Enemies spawn at correct rate
- [x] Bullets destroy enemies on collision
- [x] Terminal radius damage triggers correctly
- [x] Vision radius shrinks correctly
- [x] Terminal radius grows and kills enemies
- [x] Game over triggers at correct radius
- [x] Score calculates correctly
- [x] Level progression works
- [x] Audio plays correctly
- [x] Leaderboard saves/loads
- [x] Blur effect renders correctly

### 15.2 Polish Items
- [x] Particle effects on enemy death
- [x] Screen shake on damage
- [x] Terminal grow visual effect
- [x] Proper name input for leaderboard
- [ ] UI animations (optional future enhancement)
- [ ] Color tweening on damage (optional future enhancement)

---

## 16. Build & Deployment

### 16.1 Build Configuration
- Vite production build
- Minification and tree-shaking
- Asset optimization

### 16.2 Deployment Options
- Static hosting (Netlify, Vercel, GitHub Pages)
- itch.io for game distribution

---

## Implementation Order

1. ✅ Project setup (Vite, TypeScript, Phaser, tools)
2. ✅ Constants and utilities (polar coordinates)
3. ✅ Basic GameScene with playfield rendering
4. ✅ Player entity (position, rotation, rendering)
5. ✅ Input handling (cursor tracking, shooting)
6. ✅ Bullet entity (creation, movement, rendering)
7. ✅ Enemy entity (spawning, movement, rendering)
8. ✅ Collision detection (bullets vs enemies)
9. ✅ Score system
10. ✅ Level manager and spawning system
11. ✅ Damage system (terminal/vision radius)
12. ✅ Blur effect
13. ✅ UI elements (score, level display)
14. ✅ MainMenuScene
15. ✅ GameOverScene with leaderboard
16. ✅ Audio integration
17. ✅ Testing and polish
18. ✅ Build and deployment
