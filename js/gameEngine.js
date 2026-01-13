/**
 * gameEngine.js
 * Fruit Catcher Game Logic
 */

class GameEngine {
  constructor() {
    this.score = 0;
    this.level = 1;
    // this.timeLimit = 0; // Removed
    this.isGameActive = false;
    // this.gameTimer = null; // Removed
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
    // this.timeLimit = config.timeLimit || 60; // Removed

    this.items = [];
    this.basketPosition = "Center";
    this.spawnRate = 1500;
    this.speedOffset = 0;
    this.lastSpawnTime = 0;

    // Timer removed
    // if (this.timeLimit > 0) {
    //   this.startTimer();
    // }

    // Start Game Loop (Physics & Logic)
    this.startGameLoop();
  }

  /**
   * Stop Game
   */
  stop() {
    this.isGameActive = false;
    // this.clearTimer(); // Removed
    this.stopGameLoop();

    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
  }

  // startTimer() {
  //   this.gameTimer = setInterval(() => {
  //     this.timeLimit--;

  //     // Removed Time-based Level up
  //     // if (this.timeLimit % 20 === 0 && this.timeLimit !== 60) ...

  //     if (this.timeLimit <= 0) {
  //       this.stop();
  //     }
  //   }, 1000);
  // }

  // clearTimer() {
  //   if (this.gameTimer) {
  //     clearInterval(this.gameTimer);
  //     this.gameTimer = null;
  //   }
  // }

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
   * Adjust Speed manually (or via Level)
   */
  adjustSpeed(amount) {
    this.speedOffset += amount;
    if (this.speedOffset < -1) this.speedOffset = -1;
    if (this.speedOffset > 10) this.speedOffset = 10; // Increased max speed
  }

  /**
   * Core Game Loop
   */
  update() {
    if (!this.isGameActive) return;

    const now = Date.now();

    // 1. Spawn Items
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
        // time: this.timeLimit, // Removed
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
      { name: 'box', score: 0, icon: '🎁', type: 'random' }, // Random Box
      { name: 'bomb', score: -500, icon: '💣', type: 'bad' }
    ];

    // Bomb (15%), Random Box (15%), Good Fruit (70%)
    const rand = Math.random();
    let type;
    if (rand < 0.15) type = types[5]; // Bomb
    else if (rand < 0.30) type = types[4]; // Random Box
    else type = types[Math.floor(Math.random() * 4)]; // Good Fruit

    // Random Position
    const positions = ["Left", "Center", "Right"];
    const posLabel = positions[Math.floor(Math.random() * positions.length)];

    let x = 100;
    if (posLabel === "Left") x = 40;
    else if (posLabel === "Right") x = 160;

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
    let points = 0;

    if (item.type === 'bad') {
      points = item.score;
      this.score += points;
      // Allow negative score? User said -200 randomized. Let's clamp at 0 for display but internal logic might differ.
      if (this.score < 0) this.score = 0;
    }
    else if (item.type === 'random') {
      // Random Box: -200 ~ +600
      points = Math.floor(Math.random() * 801) - 200;
      this.score += points;
      if (this.score < 0) this.score = 0;
    }
    else {
      // Good fruit
      points = item.score;
      this.score += points;
    }

    // Score-based Level Up (Every 5000 points)
    const newLevel = Math.floor(this.score / 5000) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.adjustSpeed(0.5); // Increase speed per level
    }
    // Downgrade level if score drops? (Optional, let's keep max level or current level)
    else if (newLevel < this.level) {
      this.level = newLevel;
      this.adjustSpeed(-0.5);
    }

    if (this.onScoreChange) {
      this.onScoreChange(this.score, this.level, points); // Removed points arg if not used upstream, but good for UI effect
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
      score: this.score,
      level: this.level // Added level here!
    };
  }
}

// Export
window.GameEngine = GameEngine;
