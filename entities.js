
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
  const RIGHT_END = 19;
  const RIGHT_LOOP_END = 20;
  const RIGHT_RELEASE_START = 21;
  const RIGHT_RELEASE_END = 22;

  const SPEED = 65;
  const GROWTH = 0.25;
  const ABSORB_DURATION = 400;

  const keys = new Set();

  // LOAD IMAGES
  function loadImage(path) {
    const image = new Image();

    image.onerror = () => {
      console.error("Could not load:", path);
    };

    image.src = path;
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

  let nodesCollected = 0;

  let backgroundFrame = 0;
  let backgroundFinished = false;
  let backgroundTime = 0;

  let idleTime = 0;
  let spriteMode = "idle";
  let spriteFrame = 0;
  let lastTime = 0;

  // GAME MESSAGES
  let message = "";
  let messageUntil = 0;
  let lastDoorInteraction = 0;

  // TUTORIAL
  let tutorialMoved = false;
  let tutorialRoomEntered = false;

  // PLAYER SIZE
  function playerSize() {
    return SPRITE_SIZE * (1 + nodesCollected * GROWTH);
  }

  // SHOW GAME MESSAGE
  function showMessage(text, duration = 2200) {
    message = text;
    messageUntil = performance.now() + duration;
  }

  // CHANGE ROOMS
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

    if (room !== "center") {
      tutorialRoomEntered = true;
    }
  }

  // DRAW IMAGE
  function drawImage(image) {
    if (!image.complete || !image.naturalWidth) {
      return;
    }

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
  function updateSprite(delta) {
    idleTime += delta * 1000;

    while (idleTime >= IDLE_DURATION) {
      idleTime -= IDLE_DURATION;

      if (spriteMode === "left") {
        if (spriteFrame < LEFT_END) {
          spriteFrame++;
        } else {
          // HOLD LEFT: 11 <-> 12
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
        if (spriteFrame < RIGHT_END) {
          spriteFrame++;
        } else {
          // HOLD RIGHT: 19 <-> 20
          spriteFrame =
            spriteFrame === RIGHT_END
              ? RIGHT_LOOP_END
              : RIGHT_END;
        }

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

  // DRAW ABSORPTION ANIMATION
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

  // DRAW TEXT BOX
  function drawTextBox(text, y = 7, height = 30) {
    const scale = 3;

    const textCanvas = document.createElement("canvas");
    textCanvas.width = WIDTH * scale;
    textCanvas.height = height * scale;

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
      text,
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
      y,
      WIDTH,
      height
    );

    ctx.restore();
  }

  // DRAW NODE COUNTER
  function drawNodeCounter() {
    if (!backgroundFinished) return;

    ctx.save();

    ctx.fillStyle = "rgba(10, 15, 30, 0.9)";
    ctx.fillRect(4, 4, 73, 15);

    ctx.fillStyle = "#72d9ff";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.fillText(
      "Nodes: " + nodesCollected + "/2",
      9,
      12
    );

    ctx.restore();
  }

  // CHECK WHETHER PLAYER IS NEAR EITHER DOOR
  function isNearDoor() {
    if (currentRoom === "center") {
      return false;
    }

    const size = playerSize();
    const playerLeft = playerX;
    const playerRight = playerX + size;

    const DOOR_DISTANCE = 35;

    if (currentRoom === "left") {
      return playerLeft <= rooms.left.doorX + DOOR_DISTANCE;
    }

    if (currentRoom === "right") {
      return playerRight >= rooms.right.doorX - DOOR_DISTANCE;
    }

    return false;
  }

  // DRAW DOOR INTERACTION PROMPT
  function drawDoorPrompt(now) {
    if (!isNearDoor()) return;

    // Hide while an interaction message is showing
    if (message && now <= messageUntil) {
      return;
    }

    // Always show near either door
    drawTextBox(
      "SPACE - Interact with door",
      101,
      23
    );
  }

  // DRAW GAME MESSAGES AND TUTORIAL
  function drawMessage(now) {

    // Game messages take priority
    if (message && now <= messageUntil) {
      drawTextBox(message);
      return;
    }

    // Opening animation
    if (!backgroundFinished) {
      drawTextBox("Press SPACE to skip");
      return;
    }

    // Movement tutorial
    if (!tutorialMoved) {
      drawTextBox(
        "Use A/D or arrow keys to move"
      );
      return;
    }

    // Glowing node tutorial only BEFORE first node
    if (
      nodesCollected === 0 &&
      tutorialRoomEntered &&
      currentRoom !== "center" &&
      !rooms[currentRoom].collected &&
      !rooms[currentRoom].absorbing
    ) {
      drawTextBox(
        "Move toward the glowing node"
      );
    }
  }

  // START NODE ABSORPTION
  function startAbsorption(room, now) {
    if (room.collected || room.absorbing) return;

    room.absorbing = true;
    room.absorbStart = now;
  }

  // FINISH NODE ABSORPTION
  function finishAbsorption(room) {
    room.absorbing = false;
    room.collected = true;

    nodesCollected++;

    if (currentRoom === "left") {
      showMessage("Shapes puzzle completed!");
    } else if (currentRoom === "right") {
      showMessage("Simon Says puzzle completed!");
    }

    // No additional node or door tutorial messages.
    // The SPACE prompt still appears near both doors.
  }

  // UPDATE GAME
  function update(delta, now) {

    // OPENING ANIMATION
    if (
      currentRoom === "center" &&
      !backgroundFinished
    ) {
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

    // FIRST MOVEMENT
    if ((left || right) && !tutorialMoved) {
      tutorialMoved = true;
    }

    // PLAYER MOVEMENT
    if (left && !right) {
      playerX -= SPEED * delta;
    }

    if (right && !left) {
      playerX += SPEED * delta;
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
      if (
        Math.abs(playerCenter - room.nodeX) < 15
      ) {
        startAbsorption(room, now);
      }
    }

    // FINISH ABSORPTION
    if (room.absorbing) {
      if (
        now - room.absorbStart >= ABSORB_DURATION
      ) {
        finishAbsorption(room);
      }
    }

    // DOOR INTERACTION
    if (
      keys.has("Space") &&
      now - lastDoorInteraction > 600
    ) {
      if (isNearDoor()) {
        if (nodesCollected < 2) {
          showMessage(
            "Door locked! Nodes: " +
            nodesCollected + "/2",
            3000
          );
        } else {
          showMessage(
            "UNDER CONSTRUCTION - Game unfinished!",
            4000
          );
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

    if (
      currentRoom !== "center" ||
      backgroundFinished
    ) {
      drawPlayer();
      drawAbsorption(now);
    }

    drawNodeCounter();
    drawMessage(now);
    drawDoorPrompt(now);
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

    idleTime = 0;
    spriteMode = "idle";
    spriteFrame = 0;

    nodesCollected = 0;

    message = "";
    messageUntil = 0;
    lastDoorInteraction = 0;

    // RESET TUTORIAL
    tutorialMoved = false;
    tutorialRoomEntered = false;

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

    // SKIP OPENING ANIMATION
    if (
      event.code === "Space" &&
      currentRoom === "center" &&
      !backgroundFinished
    ) {
      backgroundFrame = BG_HOLD;
      backgroundFinished = true;
      backgroundTime = 0;

      keys.delete("Space");
    }
  });

  window.addEventListener("keyup", event => {
    keys.delete(event.code);
  });

  window.addEventListener("blur", () => {
    keys.clear();
  });

})();
