
(() => {
  const canvas = document.getElementById("background");
  const ctx = canvas.getContext("2d");

  // HTML GAME INTERFACE

  const gameUI = document.getElementById("game-ui");
  const dialogueBox = document.getElementById("dialogue-box");
  const dialogueText = document.getElementById("dialogue-text");
  const nodeCount = document.getElementById("node-count");
  const nodeCounter = document.getElementById("node-counter");

  const WIDTH = 256;
  const HEIGHT = 128;

  // BACKGROUND ANIMATION

  const BG_COLUMNS = 8;
  const BG_FRAMES = 87;
  const BG_HOLD = 26;
  const BG_DURATION = 60;

  // PLAYER SPRITES

  const SPRITE_SIZE = 64;
  const SPRITE_COLUMNS = 8;
  const BIGGER_COLUMNS = 8;

  // IDLE ANIMATIONS

  const IDLE_FRAMES = 7;
  const BIGGER_IDLE_FRAMES = 6;
  const IDLE_DURATION = 250;

  // LEFT HOLD AND LOOP

  const LEFT_START = 8;
  const LEFT_END = 11;
  const LEFT_LOOP_END = 12;

  // SMALL LEFT RELEASE

  const LEFT_RELEASE_START = 12;
  const LEFT_RELEASE_END = 15;

  // BIGGER LEFT RELEASE

  const BIGGER_LEFT_RELEASE_START = 11;
  const BIGGER_LEFT_RELEASE_END = 12;

  // RIGHT HOLD AND LOOP

  const RIGHT_START = 16;
  const RIGHT_END = 19;
  const RIGHT_LOOP_END = 20;

  // SMALL RIGHT RELEASE

  const RIGHT_RELEASE_START = 21;
  const RIGHT_RELEASE_END = 22;

  // BIGGER RIGHT RELEASE

  const BIGGER_RIGHT_RELEASE_START = 21;
  const BIGGER_RIGHT_RELEASE_END = 23;

  // BIGGER UP HOLD AND LOOP

  const BIGGER_UP_START = 24;
  const BIGGER_UP_END = 27;
  const BIGGER_UP_LOOP_END = 28;

  // BIGGER UP RELEASE

  const BIGGER_UP_RELEASE_START = 29;
  const BIGGER_UP_RELEASE_END = 31;

  // BIGGER DOWN HOLD AND LOOP

  const BIGGER_DOWN_START = 32;
  const BIGGER_DOWN_END = 37;
  const BIGGER_DOWN_LOOP_END = 38;

  // BIGGER DOWN RELEASE

  const BIGGER_DOWN_RELEASE_START = 39;
  const BIGGER_DOWN_RELEASE_END = 41;

  // SPEED SETTINGS

  const SPEED = 65;
  const ABSORB_DURATION = 400;
  const ROOM_FRAME_DURATION = 3000;

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

  const background = loadImage(
    "images/Background.png"
  );

  const playerSheet = loadImage(
    "images/Player Sprite.png"
  );

  const biggerPlayerSheet = loadImage(
    "images/Bigger Player Sprite.png"
  );

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

  // TUTORIAL VARIABLES

  let tutorialStep = 0;
  let tutorialMoved = false;

  let verticalTutorialMoved = false;
  let verticalTutorialShownAt = null;

  // PLAYER SIZE

  function playerSize() {
    return SPRITE_SIZE;
  }

  // CHECK WHETHER PLAYER HAS TRANSFORMED

  function isBigger() {
    return nodesCollected >= 2;
  }

  // SHOW DIALOGUE MESSAGE

  function showMessage(text) {
    message = text;
    messageUntil = performance.now() + 4000;
  }

  // UPDATE HTML INTERFACE

  function updateUI(now) {

    nodeCount.textContent = nodesCollected;

    if (backgroundFinished) {
      nodeCounter.classList.remove("hidden");
    } else {
      nodeCounter.classList.add("hidden");
    }

    let displayMessage = "";

    // VERTICAL TUTORIAL HAS PRIORITY

    if (isBigger() && !verticalTutorialMoved) {

      displayMessage =
        "Use W/S or UP/DOWN to move vertically";

      if (verticalTutorialShownAt === null) {
        verticalTutorialShownAt = now;
      }

    } else if (now <= messageUntil) {

      displayMessage = message;

    }

    // OTHER TUTORIAL MESSAGES

    if (!displayMessage) {

      if (tutorialStep === 0) {

        displayMessage = "Press SPACE to skip";

      } else if (tutorialStep === 1) {

        displayMessage =
          "Use A/D or LEFT/RIGHT to move";

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

  // UPDATE TUTORIAL

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

    // NODE IDLE ANIMATION

    let column = Math.floor(
      Math.max(0, now - roomEnteredAt) /
      ROOM_FRAME_DURATION
    ) % 4;

    // NODE COLLECTED

    if (room.collected || room.absorbing) {
      column = 4;
    }

    // DOOR OPENED

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

    const bigger = isBigger();

    const sheet = bigger
      ? biggerPlayerSheet
      : playerSheet;

    const columns = bigger
      ? BIGGER_COLUMNS
      : SPRITE_COLUMNS;

    if (!sheet.complete || !sheet.naturalWidth) {
      return;
    }

    const size = SPRITE_SIZE;

    const x = Math.round(playerX);
    const y = Math.round(playerY);

    const column = spriteFrame % columns;
    const row = Math.floor(spriteFrame / columns);

    ctx.save();

    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      sheet,
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

  // RESET CURRENT ANIMATION

  function resetSpriteAnimation() {

    idleTime = 0;

    const bigger = isBigger();

    if (spriteMode === "left") {

      spriteFrame = LEFT_START;

    } else if (spriteMode === "leftRelease") {

      spriteFrame = bigger
        ? BIGGER_LEFT_RELEASE_START
        : LEFT_RELEASE_START;

    } else if (spriteMode === "right") {

      spriteFrame = RIGHT_START;

    } else if (spriteMode === "rightRelease") {

      spriteFrame = bigger
        ? BIGGER_RIGHT_RELEASE_START
        : RIGHT_RELEASE_START;

    } else if (spriteMode === "up" && bigger) {

      spriteFrame = BIGGER_UP_START;

    } else if (spriteMode === "upRelease" && bigger) {

      spriteFrame = BIGGER_UP_RELEASE_START;

    } else if (spriteMode === "down" && bigger) {

      spriteFrame = BIGGER_DOWN_START;

    } else if (spriteMode === "downRelease" && bigger) {

      spriteFrame = BIGGER_DOWN_RELEASE_START;

    } else {

      spriteMode = "idle";
      facing = "right";
      spriteFrame = 0;

    }
  }

  // CHANGE SPRITE ANIMATION

  function setSpriteMode(mode) {

    if (spriteMode === mode) return;

    spriteMode = mode;

    resetSpriteAnimation();
  }

  // UPDATE SPRITE ANIMATION

  function updateSprite(delta) {

    idleTime += delta * 1000;

    const bigger = isBigger();

    while (idleTime >= IDLE_DURATION) {

      idleTime -= IDLE_DURATION;

      // LEFT HOLD AND LOOP

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

        const end = bigger
          ? BIGGER_LEFT_RELEASE_END
          : LEFT_RELEASE_END;

        if (spriteFrame < end) {

          spriteFrame++;

        } else {

          setSpriteMode("idle");

        }

      // RIGHT HOLD AND LOOP

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

        const end = bigger
          ? BIGGER_RIGHT_RELEASE_END
          : RIGHT_RELEASE_END;

        if (spriteFrame < end) {

          spriteFrame++;

        } else {

          setSpriteMode("idle");

        }

      // UP HOLD AND LOOP

      } else if (spriteMode === "up" && bigger) {

        if (spriteFrame < BIGGER_UP_END) {

          spriteFrame++;

        } else {

          spriteFrame =
            spriteFrame === BIGGER_UP_END
              ? BIGGER_UP_LOOP_END
              : BIGGER_UP_END;

        }

      // UP RELEASE

      } else if (spriteMode === "upRelease" && bigger) {

        if (spriteFrame < BIGGER_UP_RELEASE_END) {

          spriteFrame++;

        } else {

          setSpriteMode("idle");

        }

      // DOWN HOLD AND LOOP

      } else if (spriteMode === "down" && bigger) {

        if (spriteFrame < BIGGER_DOWN_END) {

          spriteFrame++;

        } else {

          spriteFrame =
            spriteFrame === BIGGER_DOWN_END
              ? BIGGER_DOWN_LOOP_END
              : BIGGER_DOWN_END;

        }

      // DOWN RELEASE

      } else if (spriteMode === "downRelease" && bigger) {

        if (spriteFrame < BIGGER_DOWN_RELEASE_END) {

          spriteFrame++;

        } else {

          setSpriteMode("idle");

        }

      // IDLE ANIMATION

      } else {

        const frameCount = bigger
          ? BIGGER_IDLE_FRAMES
          : IDLE_FRAMES;

        spriteFrame = (spriteFrame + 1) % frameCount;

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

    const playerCenterX =
      playerX + playerSize() / 2;

    const playerCenterY =
      playerY + SPRITE_SIZE - 18;

    const x = room.nodeX +
      (playerCenterX - room.nodeX) * progress;

    const y = room.nodeY +
      (playerCenterY - room.nodeY) * progress;

    const radius = Math.max(
      1,
      6 * (1 - progress)
    );

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

    const wasBigger = isBigger();

    room.absorbing = false;
    room.collected = true;

    nodesCollected++;

    nodeCount.textContent = nodesCollected;

    // TRANSFORM AFTER COLLECTING TWO NODES

    if (wasBigger !== isBigger()) {

      resetSpriteAnimation();

      // ACTIVATE VERTICAL MOVEMENT TUTORIAL

      verticalTutorialMoved = false;
      verticalTutorialShownAt = null;

      // REMOVE PREVIOUS MESSAGE

      message = "";
      messageUntil = 0;

    } else if (room === rooms.left) {

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
          backgroundTime = 0;

          break;
        }
      }

      return;
    }

    // MOVEMENT KEYS

    const left =
      keys.has("ArrowLeft") || keys.has("KeyA");

    const right =
      keys.has("ArrowRight") || keys.has("KeyD");

    const up =
      isBigger() &&
      (keys.has("ArrowUp") || keys.has("KeyW"));

    const down =
      isBigger() &&
      (keys.has("ArrowDown") || keys.has("KeyS"));

    // HORIZONTAL MOVEMENT TUTORIAL

    if (left !== right) {
      tutorialMoved = true;
    }

    const previousY = playerY;

    // PLAYER MOVEMENT AND ANIMATIONS

    if (left && !right) {

      playerX -= SPEED * delta;
      facing = "left";

      setSpriteMode("left");

    } else if (right && !left) {

      playerX += SPEED * delta;
      facing = "right";

      setSpriteMode("right");

    } else if (up && !down) {

      playerY -= SPEED * delta;
      facing = "up";

      setSpriteMode("up");

    } else if (down && !up) {

      playerY += SPEED * delta;
      facing = "down";

      setSpriteMode("down");

    } else if (spriteMode === "left") {

      setSpriteMode("leftRelease");

    } else if (spriteMode === "right") {

      setSpriteMode("rightRelease");

    } else if (spriteMode === "up") {

      setSpriteMode("upRelease");

    } else if (spriteMode === "down") {

      setSpriteMode("downRelease");

    }

    // VERTICAL MOVEMENT BOUNDARIES

    playerY = Math.max(
      0,
      Math.min(77, playerY)
    );

    // COMPLETE VERTICAL TUTORIAL
    // Keep the instruction visible for at least 2 seconds.

    if (
      isBigger() &&
      !verticalTutorialMoved &&
      verticalTutorialShownAt !== null &&
      now - verticalTutorialShownAt >= 2000 &&
      playerY !== previousY
    ) {

      verticalTutorialMoved = true;

    }

    // PRESERVE ORIGINAL ANIMATION SPEED

    updateSprite(delta * 2);

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

    const playerCenter =
      playerX + playerSize() / 2;

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

    if (
      currentRoom !== "center" ||
      backgroundFinished
    ) {

      drawPlayer();
      drawAbsorption(now);

    }
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
    updateUI(now);

    requestAnimationFrame(animate);
  }

  // START GAME

  canvas.addEventListener("hive:start", () => {

    if (gameStarted) return;

    gameStarted = true;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    currentRoom = "center";

    backgroundFrame = 0;
    backgroundFinished = false;
    backgroundTime = 0;

    playerX = 96;
    playerY = 77;
    facing = "right";

    nodesCollected = 0;

    spriteMode = "idle";
    resetSpriteAnimation();

    leftDoorOpened = false;
    rightDoorOpened = false;

    roomEnteredAt = 0;

    message = "";
    messageUntil = 0;
    lastDoorInteraction = 0;

    // RESET TUTORIAL

    tutorialStep = 0;
    tutorialMoved = false;
    verticalTutorialMoved = false;
    verticalTutorialShownAt = null;

    // RESET ROOMS

    for (const room of Object.values(rooms)) {

      room.collected = false;
      room.absorbing = false;
      room.absorbStart = 0;

    }

    keys.clear();

    // RESET HTML INTERFACE

    nodeCount.textContent = "0";
    dialogueText.textContent = "";

    nodeCounter.classList.add("hidden");
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
      "ArrowUp",
      "ArrowDown",
      "KeyA",
      "KeyD",
      "KeyW",
      "KeyS",
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
