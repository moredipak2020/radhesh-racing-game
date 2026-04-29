# 🏎️ Super Nexon: Radhesh Edition - Project Blueprint

## 1. Project Overview
"Super Nexon: Radhesh Edition" is a highly responsive, cross-platform 2D racing game built entirely with web technologies. Originally designed for PC, it has been heavily optimized for mobile devices with responsive on-screen controls and a dynamic viewport layout. The game features synthesized audio, scaling difficulty, and a secure global leaderboard.

## 2. Architecture & Tech Stack
*   **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 (Glassmorphism UI)
*   **Rendering**: HTML5 `<canvas>` API (RequestAnimationFrame Game Loop)
*   **Audio**: Web Audio API (Procedurally generated synthesized sounds, no external mp3s)
*   **Backend / API**: Vercel Serverless Edge Functions (`/api`)
*   **Database**: Vercel KV (Serverless Redis via `@vercel/kv`)
*   **Hosting & Deployment**: Vercel (CI/CD connected to GitHub)

---

## 3. File Structure & Connections

### `index.html` (The Skeleton)
Defines the document structure. It separates the game into two primary visual layers:
1.  **Game View (`#game-view`)**: Contains the `<canvas>` where the 2D game is rendered, along with absolutely-positioned UI overlays (Start Menu, Game Over Menu, HUD).
2.  **Mobile Controls (`#mobile-controls`)**: A dedicated lower panel exclusively for touch devices. By keeping this structurally outside the canvas bounds, the game prevents the player's thumbs from obscuring the gameplay.

### `style.css` (The Skin)
Handles all visuals, leveraging a "Premium Glassmorphism" aesthetic.
*   **Responsiveness**: Uses `100dvh` (Dynamic Viewport Height) to prevent iOS/Android address bars from clipping the screen.
*   **Dynamic Scaling**: Mobile controls use `vw` (Viewport Width) units to mathematically scale down and perfectly fit narrow screens (like iPhone 15) without overlapping.

### `main.js` (The Brain)
A monolithic game engine script containing:
*   **Game Loop**: Constantly clears and redraws the canvas at 60FPS.
*   **Unified Input Manager**: Listens to both Keyboard Events (PC) and Touch Events (Mobile), mapping them to a single `keys` object to trigger movement.
*   **Physics & Collision**: AABB (Axis-Aligned Bounding Box) collision detection between the player car, obstacles, powerups, and bullets.
*   **SoundManager**: An object containing Web Audio Context nodes to synthesize engine hums (using a square wave with a lowpass filter) and explosion sounds.

### `api/leaderboard.js` (The Bridge)
A serverless Node.js function that sits between the client and the Redis Database.
*   **GET /api/leaderboard**: Queries the Redis Sorted Set (`zrange`) to return the Top 5 highest global scores.
*   **POST /api/leaderboard**: Receives a new high score, validates it, and inserts it into the database (`zadd`).

---

## 4. Gameplay Features & Mechanics

### Player Interactions (Controls)
*   **Movement**: 
    *   *PC*: Arrow Keys or W/A/S/D.
    *   *Mobile*: On-screen D-Pad.
*   **Shoot / Blast (Requires 🚀 Powerup)**: 
    *   *PC*: `CTRL` key.
    *   *Mobile*: The large Rocket action button on the left.
*   **Color Customization**: 
    *   *PC*: `R`, `G`, `B`, `Y` keys.
    *   *Mobile*: Center 4-color touch grid.

### Game Entities
*   **The Car (Tata Nexon)**: The player avatar. Restricted within the bounds of the gray road.
*   **Obstacles**:
    *   🚗 Enemy Cars (Move predictably)
    *   🪨 Rocks (Stationary hazards)
*   **Powerups**:
    *   🪙 **Coin**: Grants instant bonus points.
    *   🛡️ **Shield**: Grants temporary invincibility. Car turns glowing cyan, ignoring collisions.
    *   🚀 **Rocket/Turbo**: Grants the ability to shoot lasers forward, destroying obstacles in path.

### Progression System
The game is split into 5 levels. As the score increases:
1.  Base speed of the road and obstacles increases.
2.  Spawn rates of obstacles become more aggressive.
3.  **Level 2 Modifier**: Rain effect overlay appears, and "Slippery Friction" is introduced, making the car slide slightly after releasing steering controls.

---

## 5. Security & Stability Measures
1.  **Stored XSS Prevention**: When displaying global high scores from the database, the UI strictly uses `document.createElement` and `.textContent`. This mathematically prevents malicious players from injecting executable JavaScript scripts as their "Name".
2.  **API Payload Hardening**: The `/api/leaderboard.js` endpoint explicitly rejects scores above `200,000` (impossible to achieve legitimately) and forcefully truncates names to 15 characters, preventing database bloating or DDoS storage attacks.
3.  **Device-Aware UI**: The game natively detects `ontouchstart` capabilities upon loading. It hides irrelevant PC instructions and only unhides the mobile D-Pad on actual mobile hardware.
4.  **Audio State Safety**: Integrates a `visibilitychange` document listener. If a mobile user locks their phone or switches tabs while playing, the AudioContext is immediately suspended to prevent overlapping "TV Static" audio bugs.
