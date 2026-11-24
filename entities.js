
(() => {
  const canvas = document.getElementById("background");
  const ctx = canvas.getContext("2d");

  // HTML GAME INTERFACE
  const gameUI = document.getElementById("game-ui");
  const dialogueBox = document.getElementById("dialogue-box");
  const dialogueText = document.getElementById("dialogue-text");
  const nodeCount = document.getElementById("node-count");

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
  const ROOM_FRAME_DURATION = 125;

  const keys = new Set();

  // LOAD IMAGES

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

  const roomSheet = loadImage(
    "images/Left and Right Node Room.png"
  );

  // ROOM VARIABLES

  let roomEnteredAt = 0;

  let leftDoorOpened = false;
  let rightDoorOpened = false;

  const rooms = {
    left: {
      nodeX: 125,
      nodeY: 95,
      collected: false,
      absorbing: false,
      absorbStart: 0,
      doorX: 15
    },

    right: {
      nodeX: 125,
      nodeY: 95,
      collected: false,
      absorbing: false,
      absorbStart: 0,
      doorX: 235
    }
  };

  // GAME VARIABLES

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

  let tutorialStep = 0;
  let tutorialMoved = false;

  // PLAYER SIZE

  function playerSize() {
    return SPRITE_SIZE * (1 + nodesCollected * GROWTH);
  }

  // SHOW DIALOGUE MESSAGE

  function showMessage(text) {
    message = text;
    messageUntil = performance.now() + 4000;
  }

  // UPDATE HTML INTERFACE

  function updateUI(now) {

    nodeCount.textContent = nodesCollected;

    let displayMessage =
      now <= messageUntil ? message : "";

    if (!displayMessage) {

      if (tutorialStep === 0) {
        displayMessage = "Press SPACE to skip";

      } else if (tutorialStep === 1) {
        displayMessage = "Use A/D or LEFT/RIGHT to move";

      } else if (
        currentRoom !== "center" &&
        nearDoor() &&
        !(currentRoom === "left" && leftDoorOpened) &&
        !(currentRoom === "right" && rightDoorOpened)
      ) {
        displayMessage = "Press SPACE to interact";
      }
    }

    if (displayMessage) {

      dialogueText.textContent = displayMessage;
      dialogueBox.classList.remove("hidden");

    } else {

      dialogueBox.classList.add("hidden");

    }
  }

  // TUTORIAL

  function updateTutorial() {
    if (tutorialStep === 0 && backgroundFinished) {
      tutorialStep = 1;
    }

    if (tutorialStep === 1 && tutorialMoved) {
      tutorialStep = 2;
    }
  }

  // ROOM TRANSITIONS

  function changeRoom(room) {
    const size = playerSize();

    currentRoom = room;
    roomEnteredAt = performance.now();

    if (room === "left") {

      playerX = WIDTH - size - 4;

      if (!rooms.left.collected) {
        showMessage("Move toward the glowing node");
      }

    } else if (room === "right") {

      playerX = 4;

      if (!rooms.right.collected) {
        showMessage("Move toward the glowing node");
      }

    } else {

      playerX = 96;

    }

    keys.clear();
  }

  // DRAW BACKGROUND

  function drawBackground(now) {

    // CENTER ROOM

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

    // LEFT AND RIGHT ROOMS

    if (!roomSheet.complete || !roomSheet.naturalWidth) {
      return;
    }

    const room = rooms[currentRoom];

    const row = currentRoom === "left" ? 0 : 1;

    // Loop frames 1-4 or 8-11

    let column = Math.floor(
      Math.max(0, now - roomEnteredAt) /
      ROOM_FRAME_DURATION
    ) % 4;

    // Node collected: frame 5 or 12

    if (room.collected || room.absorbing) {
      column = 4;
    }

    // Door opened: frame 6 or 13

    if (
      (currentRoom === "left" && leftDoorOpened) ||
      (currentRoom === "right" && rightDoorOpened)
    ) {
      column = 5;
    }

    ctx.drawImage(
      roomSheet,
      column * WIDTH,
      row * HEIGHT,
      WIDTH,
      HEIGHT,
      0,
      0,
      WIDTH,
      HEIGHT
    );
  }

  // DRAW PLAYER

  function drawPlayer() {

    if (!playerSheet.complete || !playerSheet.naturalWidth) {
      return;
    }

    const size = Math.round(playerSize());
    const x = Math.round(playerX);

    // Move player up slightly as it grows

    const y = Math.round(
      playerY - nodesCollected * 10
    );

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

      facing = "right";
      spriteFrame = 0;

    }
  }

  // UPDATE SPRITE ANIMATION

  function updateSprite(delta) {

    idleTime += delta * 1000;

    while (idleTime >= IDLE_DURATION) {

      idleTime -= IDLE_DURATION;

      // LEFT MOVEMENT

      if (spriteMode === "left") {

        if (spriteFrame < LEFT_END) {
          spriteFrame++;
        } else {
          spriteFrame =
            spriteFrame === LEFT_END
              ? LEFT_LOOP_END
              : LEFT_END;
        }

      // LEFT RELEASE

      } else if (spriteMode === "leftRelease") {

        if (spriteFrame < LEFT_RELEASE_END) {
          spriteFrame++;
        } else {
          facing = "right";
          setSpriteMode("idle");
        }

      // RIGHT MOVEMENT

      } else if (spriteMode === "right") {

        if (spriteFrame < RIGHT_END) {
          spriteFrame++;
        } else {
          spriteFrame =
            spriteFrame === RIGHT_END
              ? RIGHT_LOOP_END
              : RIGHT_END;
        }

      // RIGHT RELEASE

      } else if (spriteMode === "rightRelease") {

        if (spriteFrame < RIGHT_RELEASE_END) {
          spriteFrame++;
        } else {
          facing = "right";
          setSpriteMode("idle");
        }

      // IDLE ANIMATION

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

    const playerCenterY =
      playerY - nodesCollected * 10 + SPRITE_SIZE - 18;

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

  // CHECK IF PLAYER IS NEAR A DOOR

  function nearDoor() {

    if (currentRoom === "center") return false;

    const room = rooms[currentRoom];

    const playerEdge =
      currentRoom === "left"
        ? playerX
        : playerX + playerSize();

    return Math.abs(playerEdge - room.doorX) < 25;
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

    // UPDATE HTML NODE COUNTER

    nodeCount.textContent = nodesCollected;

    // PUZZLE COMPLETION MESSAGES

    if (room === rooms.left) {

      showMessage("Shapes puzzle completed!");

    } else if (room === rooms.right) {

      showMessage("Simon Says puzzle completed!");

    }
  }

  // UPDATE GAME

  function update(delta, now) {

    // CENTER ROOM OPENING ANIMATION

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

    if ((left || right) && !tutorialMoved) {
      tutorialMoved = true;
    }

    // PLAYER MOVEMENT

    if (left && !right) {

      playerX -= SPEED * delta;
      facing = "left";

    }

    if (right && !left) {

      playerX += SPEED * delta;
      facing = "right";

    }

    // PLAYER ANIMATIONS

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

    // FINISH ACTIVE NODE ABSORPTION

    for (const room of Object.values(rooms)) {

      if (
        room.absorbing &&
        now - room.absorbStart >= ABSORB_DURATION
      ) {
        finishAbsorption(room);
      }
    }

    if (currentRoom === "center") return;

    const room = rooms[currentRoom];

    const playerCenter = playerX + playerSize() / 2;

    // NODE COLLECTION

    if (!room.collected && !room.absorbing) {

      if (Math.abs(playerCenter - room.nodeX) < 15) {

        startAbsorption(room, now);

      }
    }

    // DOOR INTERACTION

    if (
      keys.has("Space") &&
      now - lastDoorInteraction > 600 &&
      nearDoor()
    ) {

      if (nodesCollected < 2) {

        showMessage(
          "Collect 2 nodes to break through!"
        );

      } else if (
        currentRoom === "left" &&
        !leftDoorOpened
      ) {

        leftDoorOpened = true;

        showMessage(
          "Breakthrough successful! Dev note: Game unfinished."
        );

      } else if (
        currentRoom === "right" &&
        !rightDoorOpened
      ) {

        rightDoorOpened = true;

        showMessage(
          "Breakthrough successful! Dev note: Game unfinished."
        );

      }

      lastDoorInteraction = now;
      keys.delete("Space");
    }
  }

  // DRAW GAME

  function draw(now) {

    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    drawBackground(now);

    if (currentRoom !== "center" || backgroundFinished) {

      drawPlayer();
      drawAbsorption(now);

    }

    // Dialogue is now handled by HTML.
    // No canvas-based dialogue is drawn here.
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
    updateTutorial();
    draw(now);

    // Update HTML dialogue and node counter

    updateUI(now);

    requestAnimationFrame(animate);
  }

  // START GAME

  canvas.addEventListener("hive:start", () => {

    if (gameStarted) return;

    gameStarted = true;

    // Set internal canvas resolution.
    // CSS controls the displayed size.

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

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

    leftDoorOpened = false;
    rightDoorOpened = false;

    roomEnteredAt = 0;

    message = "";
    messageUntil = 0;
    lastDoorInteraction = 0;

    tutorialStep = 0;
    tutorialMoved = false;

    for (const room of Object.values(rooms)) {

      room.collected = false;
      room.absorbing = false;
      room.absorbStart = 0;

    }

    keys.clear();

    // RESET AND SHOW HTML INTERFACE

    nodeCount.textContent = "0";
    dialogueText.textContent = "";

    dialogueBox.classList.add("hidden");
    gameUI.classList.remove("hidden");

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
