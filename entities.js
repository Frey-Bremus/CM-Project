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
  let backgroundFinished = false;
  let playerSheetLoaded = false;

  const drawScene = () => {
    const backgroundColumn = backgroundFrame % backgroundColumns;
    const backgroundRow = Math.floor(backgroundFrame / backgroundColumns);

    context.clearRect(0, 0, backgroundFrameWidth, backgroundFrameHeight);
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
      context.drawImage(
        playerSheet,
        idleFrame * playerFrameSize,
        0,
        playerFrameSize,
        playerFrameSize,
        (backgroundFrameWidth - playerFrameSize) / 2,
        backgroundFrameHeight - playerFrameSize - playerBottomOffset,
        playerFrameSize,
        playerFrameSize
      );
    }
  };

  const animate = (timestamp) => {
    if (lastBackgroundFrameTime === null) {
      lastBackgroundFrameTime = timestamp;
    } else if (
      !backgroundFinished
      && timestamp - lastBackgroundFrameTime >= backgroundFrameDuration
    ) {
      const elapsedFrames = Math.floor(
        (timestamp - lastBackgroundFrameTime) / backgroundFrameDuration
      );
      const nextFrame = backgroundFrame + elapsedFrames;
      if (nextFrame >= backgroundFrameCount) {
        backgroundFrame = backgroundHoldFrame;
        backgroundFinished = true;
      } else {
        backgroundFrame = nextFrame;
        lastBackgroundFrameTime += elapsedFrames * backgroundFrameDuration;
      }
    }

    if (backgroundFinished && keysPressed.size === 0) {
      if (lastIdleFrameTime === null) {
        lastIdleFrameTime = timestamp;
      } else if (timestamp - lastIdleFrameTime >= idleFrameDuration) {
        const elapsedFrames = Math.floor(
          (timestamp - lastIdleFrameTime) / idleFrameDuration
        );
        idleFrame = (idleFrame + elapsedFrames) % idleFrameCount;
        lastIdleFrameTime += elapsedFrames * idleFrameDuration;
      }
    } else if (backgroundFinished) {
      lastIdleFrameTime = timestamp;
    }

    drawScene();
    requestAnimationFrame(animate);
  };

  window.addEventListener("keydown", (event) => {
    keysPressed.add(event.code);
  });
  window.addEventListener("keyup", (event) => {
    keysPressed.delete(event.code);
  });
  window.addEventListener("blur", () => {
    keysPressed.clear();
  });

  playerSheet.addEventListener("load", () => {
    playerSheetLoaded = true;
  });
  playerSheet.addEventListener("error", () => {
    console.error("Could not load images/Player Sprite.png");
  });
  backgroundSheet.addEventListener("load", () => {
    drawScene();
    requestAnimationFrame(animate);
  });
  backgroundSheet.addEventListener("error", () => {
    console.error("Could not load images/Background.png");
  });

  playerSheet.src = "images/Player Sprite.png";
  backgroundSheet.src = "images/Background.png";
})();
