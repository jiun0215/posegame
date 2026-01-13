/**
 * gameEngine.js
 * Fruit Catcher Game Logic
 */

class GameEngine {
  constructor() {
    this.score = 0;
    this.level = 1;
    this.timeLimit = 0;
    this.isGameActive = false;
    this.gameTimer = null;
    this.updateInterval = null;

    // Fruit Catcher specific state
    this.basketPosition = "Center"; // "Left", "Center", "Right"
    this.items = []; // falling items
    this.spawnRate = 1500; // ms
    this.lastSpawnTime = 0;

    // Speed Control
    this.speedOffset = 0;

    // Callbacks
    this.onScoreChange = null;
    this.onGameEnd = null;
    this.onUpdateState = null; // Callback for rendering
  }

  /**
   * Start Game
   * @param {Object} config - { timeLimit }
   */
  start(config = {}) {
    this.isGameActive = true;
    this.score = 0;
    this.level = 1;
    this.timeLimit = config.timeLimit || 60;

    this.items = [];
    this.basketPosition = "Center";
    this.spawnRate = 1500;
    this.speedOffset = 0;
    this.lastSpawnTime = 0;

    if (this.timeLimit > 0) {
      this.startTimer();
    }

    // Start Game Loop (Physics & Logic)
    this.startGameLoop();
  }

  /**
   * Stop Game
   */
  stop() {
    this.isGameActive = false;
    this.clearTimer();
    this.stopGameLoop();

    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
  }

  startTimer() {
    this.gameTimer = setInterval(() => {
      this.timeLimit--;

      // Level up logic based on time (every 20s)
      if (this.timeLimit % 20 === 0 && this.timeLimit !== 60) {
        this.level++;
        this.spawnRate = Math.max(500, 1500 - (this.level - 1) * 300); // Increase difficulty
      }

      if (this.timeLimit <= 0) {
        this.stop();
      }
    }, 1000);
  }

  clearTimer() {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
  }

  startGameLoop() {
    // 60 FPS physics loop
    this.updateInterval = setInterval(() => {
      this.update();
    }, 1000 / 60);
  }

  stopGameLoop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Adjust Speed manually
   * @param {number} amount - positive to speed up, negative to slow down
   */
  adjustSpeed(amount) {
    this.speedOffset += amount;
    // Clamp speed offset to avoid stopping or going too fast
    // Base speed is ~1.5 to 5. So offset could range -1 to +5
    if (this.speedOffset < -1) this.speedOffset = -1;
    if (this.speedOffset > 5) this.speedOffset = 5;
  }

  /**
   * Core Game Loop
   */
  update() {
    if (!this.isGameActive) return;

    const now = Date.now();

    // 1. Spawn Items
    // Adjust spawn rate based on speed? Or keep separate?
    // Let's speed up spawn rate slightly if speed increases
    const effectiveSpawnRate = Math.max(500, this.spawnRate - (this.speedOffset * 200));

    if (now - this.lastSpawnTime > effectiveSpawnRate) {
      this.spawnItem();
      this.lastSpawnTime = now;
    }

    // 2. Move Items & Check Collision
    // Canvas height is assumed to be 200 (from main.js)
    const moveSpeed = 1 + (this.level * 0.5) + this.speedOffset;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += moveSpeed;

      // Collision Detection (Bottom of screen)
      // Basket Y is approx 180, Item Size 20-30
      if (item.y > 170 && item.y < 200) {
        // Check X overlap
        if (this.checkCollision(item)) {
          this.handleItemCollection(item);
          this.items.splice(i, 1);
          continue;
        }
      }

      // Remove if off screen
      if (item.y > 220) {
        this.items.splice(i, 1);
      }
    }

    // 3. Notify Renderer
    if (this.onUpdateState) {
      this.onUpdateState({
        items: this.items,
        basketPosition: this.basketPosition,
        score: this.score,
        time: this.timeLimit,
        level: this.level
      });
    }
  }

  spawnItem() {
    const types = [
      { name: 'apple', score: 100, icon: '🍎', type: 'good' },
      { name: 'banana', score: 200, icon: '🍌', type: 'good' },
      { name: 'melon', score: 300, icon: '🍈', type: 'good' },
      { name: 'orange', score: 150, icon: '🍊', type: 'good' },
      { name: 'bomb', score: -500, icon: '💣', type: 'bad' }
    ];

    // Random type (Bomb 20% chance)
    const isBomb = Math.random() < 0.2;
    // Pick random good fruit
    const goodFruit = types[Math.floor(Math.random() * 4)]; // 0 to 3
    const type = isBomb ? types[4] : goodFruit;

    // Random Position (Left, Center, Right)
    const positions = ["Left", "Center", "Right"];
    const posLabel = positions[Math.floor(Math.random() * positions.length)];

    // X coordinates matching 3 lanes
    let x = 100;
    if (posLabel === "Left") x = 40;
    else if (posLabel === "Right") x = 160;
    else x = 100; // Center

    this.items.push({
      ...type,
      x: x,
      y: -20,
      lane: posLabel
    });
  }

  checkCollision(item) {
    return item.lane === this.basketPosition;
  }

  handleItemCollection(item) {
    if (item.type === 'bad') {
      // Bomb
      this.score += item.score;
      // Option: Game Over immediately?
      // For now just penalty, but if score < 0 game over?
      if (this.score < 0) this.score = 0;
    } else {
      // Good fruit
      this.score += item.score;
    }

    if (this.onScoreChange) {
      this.onScoreChange(this.score, this.level);
    }
  }

  /**
   * Update Basket Position based on Pose
   * @param {string} poseLabel - "Left", "Center", "Right"
   */
  onPoseDetected(poseLabel) {
    if (!this.isGameActive) return;
    // Allow only valid positions
    if (["Left", "Center", "Right"].includes(poseLabel)) {
      this.basketPosition = poseLabel;
    }
  }

  // --- Callbacks ---
  setScoreChangeCallback(callback) { this.onScoreChange = callback; }
  setGameEndCallback(callback) { this.onGameEnd = callback; }
  setUpdateStateCallback(callback) { this.onUpdateState = callback; }

  // Legacy support if needed, but we mostly use onUpdateState
  getGameState() {
    return {
      basketPosition: this.basketPosition,
      items: this.items,
      score: this.score
    };
  }
}

// Export
window.GameEngine = GameEngine;
