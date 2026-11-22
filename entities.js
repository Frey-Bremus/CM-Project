(() => {
  const canvas = document.getElementById("background");
  const ctx = canvas.getContext("2d");

  const WIDTH = 256;
  const HEIGHT = 128;

  const BG_COLUMNS = 8;
  const BG_FRAMES = 88;
  const BG_HOLD = 26;
  const BG_DURATION = 60;

  const SPRITE_SIZE = 64;
  const SPRITE_COLUMNS = 8;

  const IDLE_FRAMES = 7;
  const IDLE_DURATION = 125;

  const LEFT_START = 8;
  const LEFT_END = 11;
  const LEFT_LOOP_END = 12;
  const LEFT_RELEASE_START = 12;
  const LEFT_RELEASE_END = 15;

  const RIGHT_START = 16;
  const RIGHT_END = 20;
  const RIGHT_RELEASE_START = 21;
  const RIGHT_RELEASE_END = 22;

  const SPEED = 65;
  const GROWTH = 0.25;
  const ABSORB_DURATION = 400;

  const keys = new Set();

  function loadImage(path) {
    const image = new Image();
    image.src = path;

    image.onerror = () => {
      console.error("Could not load:", path);
    };

    return image;
  }

  const background = loadImage("images/Background.png");
  const playerSheet = loadImage("images/Player Sprite.png");

  const rooms = {
    left: {
      image: loadImage("images/Left Room/Left_1.png"),
      emptyImage: loadImage("images/Left Room/Left_0.png"),
      nodeX: 125,
      nodeY: 95,
      collected: false,
      absorbing: false,
      absorbStart: 0,
      doorX: 15
    },

    right: {
      image: loadImage("images/Right Room/Right_1.png"),
      emptyImage: loadImage("images/Right Room/Right_0.png"),
      nodeX: 125,
      nodeY: 95,
      collected: false,
      absorbing: false,
      absorbStart: 0,
      doorX: 235
    }
  };

  let gameStarted = false;
  let currentRoom = "center";

  let playerX = 96;
  let playerY = 77;
  let facing = "right";

  let nodesCollected = 0;

  let backgroundFrame = 0;
  let backgroundFinished = false;
  let backgroundTime = 0;

  let idleTime = 0;
  let spriteMode = "idle";
  let spriteFrame = 0;
  let lastTime = 0;

  let message = "";
  let messageUntil = 0;
  let lastDoorInteraction = 0;

  // PLAYER SIZE
  function playerSize() {
    return SPRITE_SIZE * (1 + nodesCollected * GROWTH);
  }

  // MESSAGE
  function showMessage(text) {
    message = text;
    messageUntil = performance.now() + 2200;
  }

  // ROOM TRANSITIONS
  function changeRoom(room) {
    const size = playerSize();

    currentRoom = room;

    if (room === "left") {
      playerX = WIDTH - size - 4;
    } else if (room === "right") {
      playerX = 4;
    } else {
      playerX = 96;
    }

    keys.clear();
  }

  // DRAW IMAGE
  function drawImage(image) {
    if (!image.complete || !image.naturalWidth) return;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
  }

  // DRAW BACKGROUND
  function drawBackground() {
    if (currentRoom === "center") {
      if (!background.complete || !background.naturalWidth) {
        return;
      }

      const col = backgroundFrame % BG_COLUMNS;
      const row = Math.floor(backgroundFrame / BG_COLUMNS);

      ctx.drawImage(
        background,
        col * WIDTH,
        row * HEIGHT,
        WIDTH,
        HEIGHT,
        0,
        0,
        WIDTH,
        HEIGHT
      );

      return;
    }

    const room = rooms[currentRoom];

    if (room.collected) {
      drawImage(room.emptyImage);
    } else {
      drawImage(room.image);
    }
  }

  // DRAW PLAYER
 function drawPlayer() {
  if (!playerSheet.complete || !playerSheet.naturalWidth) {
    return;
  }

  const size = Math.round(playerSize());
  const x = Math.round(playerX);
  const y = Math.round(playerY + SPRITE_SIZE - size);

  const column = spriteFrame % SPRITE_COLUMNS;
  const row = Math.floor(spriteFrame / SPRITE_COLUMNS);

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(
    playerSheet,
    column * SPRITE_SIZE,
    row * SPRITE_SIZE,
    SPRITE_SIZE,
    SPRITE_SIZE,
    x,
    y,
    size,
    size
  );

  ctx.restore();
}

  // CHANGE SPRITE ANIMATION
function setSpriteMode(mode) {
  if (spriteMode === mode) return;

  spriteMode = mode;
  idleTime = 0;

  if (mode === "left") {
    spriteFrame = LEFT_START;
  } else if (mode === "leftRelease") {
    spriteFrame = LEFT_RELEASE_START;
  } else if (mode === "right") {
    spriteFrame = RIGHT_START;
  } else if (mode === "rightRelease") {
    spriteFrame = RIGHT_RELEASE_START;
  } else {
    spriteFrame = 0;
  }
}

  // UPDATE SPRITE ANIMATION
// UPDATE SPRITE ANIMATION
function updateSprite(delta) {
  idleTime += delta * 1000;

  while (idleTime >= IDLE_DURATION) {
    idleTime -= IDLE_DURATION;

    if (spriteMode === "left") {
      if (spriteFrame < LEFT_END) {
        // First press: 8 → 9 → 10 → 11
        spriteFrame++;
      } else {
        // Holding left: 11 ↔ 12 continuously
        spriteFrame =
          spriteFrame === LEFT_END
            ? LEFT_LOOP_END
            : LEFT_END;
      }

    } else if (spriteMode === "leftRelease") {
      spriteFrame = Math.min(
        spriteFrame + 1,
        LEFT_RELEASE_END
      );

    } else if (spriteMode === "right") {
      spriteFrame = Math.min(
        spriteFrame + 1,
        RIGHT_END
      );

    } else if (spriteMode === "rightRelease") {
      spriteFrame = Math.min(
        spriteFrame + 1,
        RIGHT_RELEASE_END
      );

    } else {
      spriteFrame = (spriteFrame + 1) % IDLE_FRAMES;
    }
  }
}

  // ABSORPTION ANIMATION
  function drawAbsorption(now) {
    if (currentRoom === "center") return;

    const room = rooms[currentRoom];

    if (!room.absorbing) return;

    const progress = Math.min(
      (now - room.absorbStart) / ABSORB_DURATION,
      1
    );

    const playerCenterX = playerX + playerSize() / 2;
    const playerCenterY = playerY + SPRITE_SIZE - 18;

    const x = room.nodeX +
      (playerCenterX - room.nodeX) * progress;

    const y = room.nodeY +
      (playerCenterY - room.nodeY) * progress;

    const radius = Math.max(1, 6 * (1 - progress));

    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = "#72d9ff";

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // SHARP MESSAGE TEXT
  function drawMessage(now) {
    if (!message || now > messageUntil) return;

    const scale = 3;

    const textCanvas = document.createElement("canvas");
    textCanvas.width = WIDTH * scale;
    textCanvas.height = 30 * scale;

    const textCtx = textCanvas.getContext("2d");

    textCtx.imageSmoothingEnabled = false;

    textCtx.fillStyle = "rgba(10, 15, 30, 0.95)";
    textCtx.fillRect(
      0,
      0,
      textCanvas.width,
      textCanvas.height
    );

    textCtx.fillStyle = "#ffffff";
    textCtx.font = "bold 24px monospace";
    textCtx.textAlign = "center";
    textCtx.textBaseline = "middle";

    textCtx.fillText(
      message,
      textCanvas.width / 2,
      textCanvas.height / 2,
      textCanvas.width - 20
    );

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      textCanvas,
      0,
      0,
      textCanvas.width,
      textCanvas.height,
      0,
      7,
      WIDTH,
      30
    );

    ctx.restore();
  }

  // START ABSORPTION
  function startAbsorption(room, now) {
    if (room.collected || room.absorbing) return;

    room.absorbing = true;
    room.absorbStart = now;
  }

// FINISH ABSORPTION
function finishAbsorption(room) {
  room.absorbing = false;
  room.collected = true;

  nodesCollected++;

  if (currentRoom === "left") {
    showMessage("Shapes puzzle completed!");
  } else if (currentRoom === "right") {
    showMessage("Simon Says puzzle completed!");
  }
}

  // UPDATE GAME
  function update(delta, now) {
    // Play background animation first.
    if (currentRoom === "center" && !backgroundFinished) {
      backgroundTime += delta * 1000;

      while (backgroundTime >= BG_DURATION) {
        backgroundTime -= BG_DURATION;
        backgroundFrame++;

        if (backgroundFrame >= BG_FRAMES) {
          backgroundFrame = BG_HOLD;
          backgroundFinished = true;
          break;
        }
      }

      return;
    }

    const left =
      keys.has("ArrowLeft") || keys.has("KeyA");

    const right =
      keys.has("ArrowRight") || keys.has("KeyD");

    // PLAYER MOVEMENT
    if (left && !right) {
      playerX -= SPEED * delta;
      facing = "left";
    }

    if (right && !left) {
      playerX += SPEED * delta;
      facing = "right";
    }

    // PLAYER SPRITE ANIMATIONS
if (left && !right) {
  setSpriteMode("left");
} else if (right && !left) {
  setSpriteMode("right");
} else if (spriteMode === "left") {
  setSpriteMode("leftRelease");
} else if (spriteMode === "right") {
  setSpriteMode("rightRelease");
}

    updateSprite(delta);

    const size = playerSize();

    // CENTER ROOM TRANSITIONS
    if (currentRoom === "center") {
      if (playerX <= 0) {
        changeRoom("left");
      } else if (playerX + size >= WIDTH) {
        changeRoom("right");
      }
    }

    // LEFT ROOM TRANSITION
    else if (currentRoom === "left") {
      if (playerX + size >= WIDTH) {
        currentRoom = "center";
        playerX = 4;
        keys.clear();
      } else {
        playerX = Math.max(0, playerX);
      }
    }

    // RIGHT ROOM TRANSITION
    else if (currentRoom === "right") {
      if (playerX <= 0) {
        currentRoom = "center";
        playerX = WIDTH - size - 4;
        keys.clear();
      } else {
        playerX = Math.min(WIDTH - size, playerX);
      }
    }

    if (currentRoom === "center") return;

    const room = rooms[currentRoom];

    const playerCenter = playerX + size / 2;

    // NODE COLLECTION
    if (!room.collected && !room.absorbing) {
      if (Math.abs(playerCenter - room.nodeX) < 15) {
        startAbsorption(room, now);
      }
    }

    // FINISH ABSORPTION
    if (room.absorbing) {
      if (now - room.absorbStart >= ABSORB_DURATION) {
        finishAbsorption(room);
      }
    }

    // DOOR INTERACTION
    if (
      keys.has("Space") &&
      now - lastDoorInteraction > 600
    ) {
      if (Math.abs(playerCenter - room.doorX) < 25) {
        if (nodesCollected < 2) {
          showMessage("Collect 2 nodes to break through!");
        } else {
         showMessage("Breakthrough successful! Dev note: Game unfinished.");
        }
        lastDoorInteraction = now;
        keys.delete("Space");
      }
    }
  }

  // DRAW GAME
  function draw(now) {
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    drawBackground();

    if (currentRoom !== "center" || backgroundFinished) {
      drawPlayer();
      drawAbsorption(now);
    }

    drawMessage(now);
  }

  // GAME LOOP
  function animate(now) {
    if (!gameStarted) return;

    const delta = Math.min(
      (now - lastTime) / 1000,
      0.05
    );

    lastTime = now;

    update(delta, now);
    draw(now);

    requestAnimationFrame(animate);
  }

  // START GAME
  canvas.addEventListener("hive:start", () => {
    if (gameStarted) return;

    gameStarted = true;
    currentRoom = "center";

    backgroundFrame = 0;
    backgroundFinished = false;
    backgroundTime = 0;

    playerX = 96;
    playerY = 77;
    facing = "right";

    idleTime = 0;
    spriteMode = "idle";
    spriteFrame = 0;

    nodesCollected = 0;

    message = "";
    messageUntil = 0;
    lastDoorInteraction = 0;

    for (const room of Object.values(rooms)) {
      room.collected = false;
      room.absorbing = false;
      room.absorbStart = 0;
    }

    keys.clear();

    lastTime = performance.now();
    requestAnimationFrame(animate);
  });

  // KEYBOARD CONTROLS
  window.addEventListener("keydown", event => {
    if (!gameStarted) return;

    if ([
      "ArrowLeft",
      "ArrowRight",
      "KeyA",
      "KeyD",
      "Space"
    ].includes(event.code)) {
      event.preventDefault();
      keys.add(event.code);
    }
    if (
    event.code === "Space" &&
    currentRoom === "center" &&
    !backgroundFinished
  ) {
    event.preventDefault();

    backgroundFrame = BG_HOLD;
    backgroundFinished = true;
    backgroundTime = 0;

    keys.delete("Space");
    return;
  }
  });

  window.addEventListener("keyup", event => {
    keys.delete(event.code);
  });

  window.addEventListener("blur", () => {
    keys.clear();
  });
  
  

  
})();


