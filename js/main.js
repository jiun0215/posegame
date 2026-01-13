/**
 * main.js
 * 포즈 인식과 게임 로직을 초기화하고 서로 연결하는 진입점
 *
 * PoseEngine, GameEngine, Stabilizer를 조합하여 애플리케이션을 구동
 */

// 전역 변수
let poseEngine;
let gameEngine;
let stabilizer;
let ctx;
let labelContainer;

/**
 * 애플리케이션 초기화
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  startBtn.disabled = true;

  try {
    // 1. PoseEngine (Webcam) Skipped for Keyboard Mode
    // poseEngine = new PoseEngine("./my_model/");
    // const { maxPredictions, webcam } = await poseEngine.init({
    //   size: 200,
    //   flip: true
    // });

    // 2. Stabilizer Skipped
    // stabilizer = new PredictionStabilizer({
    //   threshold: 0.7,
    //   smoothingFrames: 3
    // });

    // 3. GameEngine 초기화
    gameEngine = new GameEngine();

    // 4. 캔버스 설정 (600x600 for bigger view)
    const canvas = document.getElementById("canvas");
    canvas.width = 600;
    canvas.height = 600;
    ctx = canvas.getContext("2d");

    // Scale 3x (Logical 200x200 -> Physical 600x600)
    ctx.scale(3, 3);

    // 5. Label Container Not used
    labelContainer = document.getElementById("label-container");
    if (labelContainer) labelContainer.style.display = 'none';
    const maxPred = document.getElementById("max-prediction");
    if (maxPred) maxPred.style.display = 'none';

    // 6. PoseEngine 콜백 설정 (Skipped)
    // poseEngine.setPredictionCallback(handlePrediction);

    // Custom Draw Loop: Webcam -> Skeleton -> Game Elements (Skipped)
    // poseEngine.setDrawCallback((pose) => {
    //   drawPose(pose);
    //   drawGameElements();
    // });

    // 7. PoseEngine 시작 (Skipped)
    // poseEngine.start();

    // 6. Start Rendering Loop (independent of webcam)
    requestAnimationFrame(renderLoop);

    // 8. 게임 모드 시작 (GameEngine Start)
    startGameMode();

    stopBtn.disabled = false;
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("초기화에 실패했습니다. 콘솔을 확인하세요.");
    startBtn.disabled = false;
  }
}

/**
 * Render Loop
 */
function renderLoop() {
  if (!gameEngine || !gameEngine.isGameActive) {
    // Continue loop even if paused? Or stop?
    // For menu screen, we might want to keep drawing.
  }

  // Clear Canvas
  ctx.clearRect(0, 0, 200, 200); // Logical size clearing

  // Draw Game
  drawGameElements(); // Uses drawGameElements from existing code

  requestAnimationFrame(renderLoop);
}

/**
 * 애플리케이션 중지
 */
function stop() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  // if (poseEngine) {
  //   poseEngine.stop();
  // }

  if (gameEngine) {
    gameEngine.stop();
  }

  // if (stabilizer) {
  //   stabilizer.reset();
  // }

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

/**
 * 예측 결과 처리 콜백 (사용 안 함)
 */
function handlePrediction(predictions, pose) { }

/**
 * 포즈 그리기 콜백 (사용 안 함)
 */
function drawPose(pose) { }

/**
 * 게임 요소 그리기 (바구니, 아이템)
 */
function drawGameElements() {
  if (!gameEngine || !gameEngine.isGameActive) return;

  const state = gameEngine.getGameState(); // Helper needed in GameEngine or access directly

  // 0. Background based on Level
  let bgGradient;
  const level = state.level || 1;
  const h = 200; // logical height

  if (level >= 3) {
    // Danger (Red/Dark)
    bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, "#8B0000"); // Dark Red
    bgGradient.addColorStop(1, "#FF4500"); // Orange Red
  } else if (level === 2) {
    // Dusk (Orange/Purple)
    bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, "#FF8C00"); // Dark Orange
    bgGradient.addColorStop(1, "#8A2BE2"); // Blue Violet
  } else {
    // Sky (Default)
    bgGradient = ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, "#87CEEB"); // Sky Blue
    bgGradient.addColorStop(1, "#E0F7FA"); // Light Cyan
  }

  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, 200, 200);

  // 1. Draw Basket
  const basketX = {
    "Left": 40,
    "Center": 100,
    "Right": 160
  }[state.basketPosition] || 100;

  ctx.fillStyle = "#8B4513"; // Brown
  ctx.fillRect(basketX - 20, 170, 40, 20);

  // Basket Label
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.fillText("Basket", basketX - 18, 185);

  // 2. Draw Items
  if (state.items) {
    state.items.forEach(item => {
      // Use Emojis instead of circles
      ctx.font = "24px Arial"; // 24px emoji size
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.icon, item.x, item.y);

      // Removed dot and small text drawing
    });
  }

  // 3. HUD (Score)
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, 200, 30);
  ctx.fillStyle = "white";
  ctx.textAlign = "left"; // Reset alignment
  ctx.font = "14px Arial";
  ctx.fillText(`Score: ${state.score} (Lv.${state.level || 1})`, 10, 20);
  // 4. Perks UI (Shield, Luck, Greed)
  if (state.perks) {
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "right";
    ctx.fillText(`🛡️x${state.perks.shield}  🍀Lv${state.perks.luck}  💰Lv${state.perks.greed}`, 190, 40);
    ctx.textAlign = "left";
  }

  // 5. Level Up Overlay
  if (state.isLevelUpPending) {
    // Semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, 200, 200);

    ctx.fillStyle = "gold";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("LEVEL UP!", 100, 40);

    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText("Choose an Upgrade:", 100, 60);

    // Options
    ctx.font = "12px Arial";
    ctx.textAlign = "left";

    // 1. Shield
    ctx.fillText("1. 🛡️ Shield (Block Bomb)", 30, 90);
    // 2. Luck
    ctx.fillText("2. 🍀 Luck (Less Bombs)", 30, 120);
    // 3. Greed
    ctx.fillText("3. 💰 Greed (Better Boxes)", 30, 150);

    ctx.textAlign = "center";
    ctx.fillStyle = "#aaa";
    ctx.fillText("Press 1, 2, or 3", 100, 180);
  }
}

// 게임 모드 시작 함수
function startGameMode(config) {
  if (!gameEngine) return;

  // DOM UI 업데이트 콜백 연결
  gameEngine.setScoreChangeCallback((score, level) => {
    // console.log(`Score: ${score}, Level: ${level}`);
  });

  gameEngine.setGameEndCallback((finalScore, finalLevel) => {
    alert(`게임 종료! 최종 점수: ${finalScore}점`);
  });

  gameEngine.start(); // Remove timeLimit config

  // 키보드 컨트롤 추가
  window.addEventListener("keydown", (event) => {
    // If pending level up, only accept 1, 2, 3
    const state = gameEngine.getGameState();
    if (state.isLevelUpPending) {
      if (event.key === "1") gameEngine.selectPerk(1);
      if (event.key === "2") gameEngine.selectPerk(2);
      if (event.key === "3") gameEngine.selectPerk(3);
      return; // Skip other keys
    }

    if (!gameEngine || !gameEngine.isGameActive) return;

    // Movement
    const currentPos = gameEngine.basketPosition;
    let nextPos = currentPos;

    if (event.key === "ArrowLeft") {
      if (currentPos === "Right") nextPos = "Center";
      else if (currentPos === "Center") nextPos = "Left";
      gameEngine.onPoseDetected(nextPos);
    }
    else if (event.key === "ArrowRight") {
      if (currentPos === "Left") nextPos = "Center";
      else if (currentPos === "Center") nextPos = "Right";
      gameEngine.onPoseDetected(nextPos);
    }
    // Speed Control
    else if (event.key === "ArrowUp") {
      gameEngine.adjustSpeed(0.5); // Speed Up
    }
    else if (event.key === "ArrowDown") {
      gameEngine.adjustSpeed(-0.5); // Speed Down
    }
  });
}
