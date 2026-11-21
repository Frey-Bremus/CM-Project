
(() => {
  const backgroundFrameWidth = 256;
  const backgroundFrameHeight = 128;
  const backgroundColumns = 8;
  const backgroundFrameCount = backgroundColumns * 11;
  const backgroundHoldFrame = 26;
  const backgroundFrameDuration = 60;

  const playerFrameSize = 64;
  const playerColumns = 8;
  const playerBottomOffset = -13;
  const idleFrameCount = 7;
  const idleFrameDuration = 125;

  // Left animation: frames 8-11
  const leftStartFrame = 7;
  const leftFrameCount = 4;

  // Release animation: frames 12-15
  const releaseStartFrame = 11;
  const releaseFrameCount = 4;

  const canvas = document.getElementById("background");
  const context = canvas.getContext("2d");

  const backgroundSheet = new Image();
  const playerSheet = new Image();
  const keysPressed = new Set();

  let backgroundFrame = 0;
  let idleFrame = 0;
  let movementFrame = 0;
  let releaseFrame = 0;

  let lastBackgroundFrameTime = null;
  let lastIdleFrameTime = null;
  let lastMovementTime = null;

  let backgroundFinished = false;
  let playerSheetLoaded = false;
  let backgroundSheetLoaded = false;
  let gameStarted = false;

  let releasingLeft = false;
  let wasMovingLeft = false;

  // PLAYER MOVEMENT
  let playerX = (backgroundFrameWidth - playerFrameSize) / 2;
  const playerY =
    backgroundFrameHeight - playerFrameSize - playerBottomOffset;

  const playerSpeed = 65;

  const isMovingLeft = () =>
    keysPressed.has("ArrowLeft") ||
    keysPressed.has("KeyA");

  const isMovingRight = () =>
    keysPressed.has("ArrowRight") ||
    keysPressed.has("KeyD");

  // DRAW BACKGROUND AND PLAYER
  const drawScene = () => {
    if (!gameStarted || !backgroundSheetLoaded) return;

    context.imageSmoothingEnabled = false;

    const backgroundColumn =
      backgroundFrame % backgroundColumns;
    const backgroundRow =
      Math.floor(backgroundFrame / backgroundColumns);

    context.clearRect(
      0,
      0,
      backgroundFrameWidth,
      backgroundFrameHeight
    );

    context.drawImage(
      backgroundSheet,
      backgroundColumn * backgroundFrameWidth,
      backgroundRow * backgroundFrameHeight,
      backgroundFrameWidth,
      backgroundFrameHeight,
      0,
      0,
      backgroundFrameWidth,
      backgroundFrameHeight
    );

    if (backgroundFinished && playerSheetLoaded) {
      let currentFrame = idleFrame;

      if (isMovingLeft() && !isMovingRight()) {
        currentFrame = leftStartFrame + movementFrame;
      } else if (releasingLeft) {
        currentFrame = releaseStartFrame + releaseFrame;
      }

      // Calculate sprite sheet row and column
      const playerColumn = currentFrame % playerColumns;
      const playerRow = Math.floor(currentFrame / playerColumns);

      context.drawImage(
        playerSheet,
        playerColumn * playerFrameSize,
        playerRow * playerFrameSize,
        playerFrameSize,
        playerFrameSize,
        playerX,
        playerY,
        playerFrameSize,
        playerFrameSize
      );
    }
  };

  // GAMEPLAY ANIMATION
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

    // PLAYER MOVEMENT
    if (lastMovementTime === null) {
      lastMovementTime = timestamp;
    }

    const deltaTime = Math.min(
      (timestamp - lastMovementTime) / 1000,
      0.05
    );

    lastMovementTime = timestamp;

    if (backgroundFinished) {
      const movingLeft = isMovingLeft();
      const movingRight = isMovingRight();

      // Detect when left key is released
      if (wasMovingLeft && !movingLeft) {
        releasingLeft = true;
        releaseFrame = 0;
        lastIdleFrameTime = timestamp;
      }

      // Detect when left key is pressed
      if (movingLeft && !wasMovingLeft) {
        releasingLeft = false;
        movementFrame = 0;
        lastIdleFrameTime = timestamp;
      }

      wasMovingLeft = movingLeft;

      if (movingLeft && !movingRight) {
        playerX -= playerSpeed * deltaTime;
      }

      if (movingRight && !movingLeft) {
        playerX += playerSpeed * deltaTime;
      }

      // Keep player inside screen
      playerX = Math.max(
        0,
        Math.min(
          backgroundFrameWidth - playerFrameSize,
          playerX
        )
      );

      // PLAYER ANIMATION
      if (lastIdleFrameTime === null) {
        lastIdleFrameTime = timestamp;
      } else if (
        timestamp - lastIdleFrameTime >= idleFrameDuration
      ) {
        const elapsedFrames = Math.floor(
          (timestamp - lastIdleFrameTime) /
          idleFrameDuration
        );

        if (movingLeft && !movingRight) {
          // Play frames 8-13 once, hold on 13
          movementFrame = Math.min(
            movementFrame + elapsedFrames,
            leftFrameCount - 1
          );
        } else if (releasingLeft) {
          // Play frames 12-15 once
          releaseFrame += elapsedFrames;

          if (releaseFrame >= releaseFrameCount) {
            releasingLeft = false;
            releaseFrame = 0;
            idleFrame = 0;
          }
        } else {
          // Normal idle animation
          idleFrame =
            (idleFrame + elapsedFrames) % idleFrameCount;
        }

        lastIdleFrameTime +=
          elapsedFrames * idleFrameDuration;
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
    movementFrame = 0;
    releaseFrame = 0;

    releasingLeft = false;
    wasMovingLeft = false;

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

    if (gameStarted) {
      drawScene();
    }
  });

  backgroundSheet.addEventListener("error", () => {
    console.error("Could not load background.");
  });

  playerSheet.src = "images/Player Sprite.png";
  backgroundSheet.src = "images/Background.png";
})();
