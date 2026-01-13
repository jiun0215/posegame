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
    // 1. PoseEngine 초기화
    poseEngine = new PoseEngine("./my_model/");
    const { maxPredictions, webcam } = await poseEngine.init({
      size: 200,
      flip: true
    });

    // 2. Stabilizer 초기화
    stabilizer = new PredictionStabilizer({
      threshold: 0.7,
      smoothingFrames: 3
    });

    // 3. GameEngine 초기화 (선택적)
    gameEngine = new GameEngine();

    // 4. 캔버스 설정
    const canvas = document.getElementById("canvas");
    canvas.width = 200;
    canvas.height = 200;
    ctx = canvas.getContext("2d");

    // 5. Label Container 설정
    labelContainer = document.getElementById("label-container");
    labelContainer.innerHTML = ""; // 초기화
    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }

    // 6. PoseEngine 콜백 설정
    poseEngine.setPredictionCallback(handlePrediction);

    // Custom Draw Loop: Webcam -> Skeleton -> Game Elements
    poseEngine.setDrawCallback((pose) => {
      drawPose(pose);
      drawGameElements();
    });

    // 7. PoseEngine 시작
    poseEngine.start();

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
 * 애플리케이션 중지
 */
function stop() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (poseEngine) {
    poseEngine.stop();
  }

  if (gameEngine) {
    gameEngine.stop();
  }

  if (stabilizer) {
    stabilizer.reset();
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

/**
 * 예측 결과 처리 콜백
 */
function handlePrediction(predictions, pose) {
  // 1. Stabilizer로 예측 안정화
  const stabilized = stabilizer.stabilize(predictions);

  // 2. Label Container 업데이트
  for (let i = 0; i < predictions.length; i++) {
    const classPrediction =
      predictions[i].className + ": " + predictions[i].probability.toFixed(2);
    labelContainer.childNodes[i].innerHTML = classPrediction;
  }

  // 3. 최고 확률 예측 표시
  const maxPredictionDiv = document.getElementById("max-prediction");
  maxPredictionDiv.innerHTML = stabilized.className || "감지 중...";

  // 4. GameEngine에 포즈 전달
  if (gameEngine && gameEngine.isGameActive && stabilized.className) {
    gameEngine.onPoseDetected(stabilized.className);
  }
}

/**
 * 포즈 그리기 콜백 (기본 웹캠 + 스켈레톤)
 */
function drawPose(pose) {
  if (poseEngine.webcam && poseEngine.webcam.canvas) {
    ctx.drawImage(poseEngine.webcam.canvas, 0, 0);

    // 키포인트와 스켈레톤 그리기
    if (pose) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
    }
  }
}

/**
 * 게임 요소 그리기 (바구니, 아이템)
 */
function drawGameElements() {
  if (!gameEngine || !gameEngine.isGameActive) return;

  const state = gameEngine.getGameState(); // Helper needed in GameEngine or access directly

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
      ctx.beginPath();
      ctx.arc(item.x, item.y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = item.color;
      ctx.fill();
      // Icon or Text
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.fillText(item.type === 'bad' ? "💣" : "🍎", item.x - 6, item.y + 4);
    });
  }

  // 3. HUD (Score & Time) -> Painted on Canvas or DOM? 
  // Let's paint simple HUD on Canvas for sync
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, 200, 30);
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.fillText(`Score: ${state.score}`, 10, 20);
  ctx.fillText(`Time: ${state.timeLimit || 0}`, 130, 20);
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

  gameEngine.start({ timeLimit: 60 });
}
