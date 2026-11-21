
(() => {
  const backgroundFrameWidth = 256;
  const backgroundFrameHeight = 128;
  const backgroundColumns = 8;
  const backgroundFrameCount = backgroundColumns * 11;
  const backgroundHoldFrame = 26;
  const backgroundFrameDuration = 60;

  const playerFrameSize = 64;
  const playerBottomOffset = -13;
  const idleFrameCount = 7;
  const idleFrameDuration = 125;

  const canvas = document.getElementById("background");
  const context = canvas.getContext("2d");

  const backgroundSheet = new Image();
  const playerSheet = new Image();
  const keysPressed = new Set();

  let backgroundFrame = 0;
  let idleFrame = 0;
  let lastBackgroundFrameTime = null;
  let lastIdleFrameTime = null;
  let lastMovementTime = null;

  let backgroundFinished = false;
  let playerSheetLoaded = false;
  let backgroundSheetLoaded = false;
  let gameStarted = false;

  // PLAYER MOVEMENT
  let playerX = (backgroundFrameWidth - playerFrameSize) / 2;
  const playerY =
    backgroundFrameHeight - playerFrameSize - playerBottomOffset;

  const playerSpeed = 65;
  let facing = "right";

  const drawScene = () => {
    if (!gameStarted || !backgroundSheetLoaded) return;

    context.imageSmoothingEnabled = false;

    const backgroundColumn =
      backgroundFrame % backgroundColumns;
    const backgroundRow =
      Math.floor(backgroundFrame / backgroundColumns);

    context.clearRect(
      0, 0, backgroundFrameWidth, backgroundFrameHeight
    );

    context.drawImage(
      backgroundSheet,
      backgroundColumn * backgroundFrameWidth,
      backgroundRow * backgroundFrameHeight,
      backgroundFrameWidth,
      backgroundFrameHeight,
      0, 0,
      backgroundFrameWidth,
      backgroundFrameHeight
    );

    if (backgroundFinished && playerSheetLoaded) {
      context.save();

      // Flip sprite when facing left
      if (facing === "left") {
        context.translate(playerX + playerFrameSize, 0);
        context.scale(-1, 1);

        context.drawImage(
          playerSheet,
          idleFrame * playerFrameSize,
          0,
          playerFrameSize,
          playerFrameSize,
          0,
          playerY,
          playerFrameSize,
          playerFrameSize
        );
      } else {
        context.drawImage(
          playerSheet,
          idleFrame * playerFrameSize,
          0,
          playerFrameSize,
          playerFrameSize,
          playerX,
          playerY,
          playerFrameSize,
          playerFrameSize
        );
      }

      context.restore();
    }
  };

  const animate = timestamp => {
    if (!gameStarted) return;

    if (lastBackgroundFrameTime === null) {
      lastBackgroundFrameTime = timestamp;
    } else if (
      !backgroundFinished &&
      timestamp - lastBackgroundFrameTime >=
      backgroundFrameDuration
    ) {
      const elapsedFrames = Math.floor(
        (timestamp - lastBackgroundFrameTime) /
        backgroundFrameDuration
      );

      const nextFrame = backgroundFrame + elapsedFrames;

      if (nextFrame >= backgroundFrameCount) {
        backgroundFrame = backgroundHoldFrame;
        backgroundFinished = true;
      } else {
        backgroundFrame = nextFrame;
        lastBackgroundFrameTime +=
          elapsedFrames * backgroundFrameDuration;
      }
    }

    // MOVEMENT
    if (lastMovementTime === null) {
      lastMovementTime = timestamp;
    }

    const deltaTime = Math.min(
      (timestamp - lastMovementTime) / 1000,
      0.05
    );
    lastMovementTime = timestamp;

    if (backgroundFinished) {
      const movingLeft =
        keysPressed.has("ArrowLeft") ||
        keysPressed.has("KeyA");

      const movingRight =
        keysPressed.has("ArrowRight") ||
        keysPressed.has("KeyD");

      if (movingLeft && !movingRight) {
        playerX -= playerSpeed * deltaTime;
        facing = "left";
      }

      if (movingRight && !movingLeft) {
        playerX += playerSpeed * deltaTime;
        facing = "right";
      }

      // Keep player inside the screen
      playerX = Math.max(
        0,
        Math.min(
          backgroundFrameWidth - playerFrameSize,
          playerX
        )
      );

      // IDLE ANIMATION
      if (!movingLeft && !movingRight) {
        if (lastIdleFrameTime === null) {
          lastIdleFrameTime = timestamp;
        } else if (
          timestamp - lastIdleFrameTime >= idleFrameDuration
        ) {
          const elapsedFrames = Math.floor(
            (timestamp - lastIdleFrameTime) /
            idleFrameDuration
          );

          idleFrame =
            (idleFrame + elapsedFrames) % idleFrameCount;

          lastIdleFrameTime +=
            elapsedFrames * idleFrameDuration;
        }
      } else {
        lastIdleFrameTime = timestamp;
      }
    }

    drawScene();
    requestAnimationFrame(animate);
  };

  // START BUTTON EVENT
  canvas.addEventListener("hive:start", () => {
    if (gameStarted) return;

    gameStarted = true;
    backgroundFrame = 0;
    idleFrame = 0;

    playerX =
      (backgroundFrameWidth - playerFrameSize) / 2;

    backgroundFinished = false;
    lastBackgroundFrameTime = null;
    lastIdleFrameTime = null;
    lastMovementTime = null;

    requestAnimationFrame(animate);
  });

  // KEYBOARD CONTROLS
  window.addEventListener("keydown", event => {
    if (!gameStarted) return;

    if (
      ["ArrowLeft", "ArrowRight", "KeyA", "KeyD"]
        .includes(event.code)
    ) {
      event.preventDefault();
      keysPressed.add(event.code);
    }
  });

  window.addEventListener("keyup", event => {
    keysPressed.delete(event.code);
  });

  window.addEventListener("blur", () => {
    keysPressed.clear();
  });

  // LOAD SPRITES
  playerSheet.addEventListener("load", () => {
    playerSheetLoaded = true;
  });

  playerSheet.addEventListener("error", () => {
    console.error("Could not load player sprite.");
  });

  backgroundSheet.addEventListener("load", () => {
    backgroundSheetLoaded = true;
    if (gameStarted) drawScene();
  });

  backgroundSheet.addEventListener("error", () => {
    console.error("Could not load background.");
  });

  playerSheet.src = "images/Player Sprite.png";
  backgroundSheet.src = "images/Background.png";
})();
