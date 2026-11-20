(() => {
  const player = document.getElementById("circle");
  const world = document.getElementById("world");
  const screenWidth = 1200;
  const screenHeight = 800;
  const rectanglesOverlap = (first, second, gap = 0) => (
    Math.abs(first.x - second.x) < (first.width + second.width) / 2 + gap
    && Math.abs(first.y - second.y) < (first.height + second.height) / 2 + gap
  );

  function generateEntityPositions() {
    const characters = [{
      x: screenWidth * 1.5,
      y: screenHeight * 1.5,
      width: 160,
      height: 160
    }];
    const positions = [];
    const personBounds = { width: 90, height: 120 };
    const personCount = 7 + Math.floor(Math.random() * 9);

    while (positions.length < personCount) {
      let candidate;
      for (let attempt = 0; attempt < 500; attempt += 1) {
        candidate = {
          x: 70 + Math.random() * (screenWidth * 3 - 140),
          y: 80 + Math.random() * (screenHeight * 3 - 160),
          ...personBounds
        };
        if (characters.some((character) => rectanglesOverlap(candidate, character, 28))) continue;
        break;
      }

      if (characters.some((character) => rectanglesOverlap(candidate, character, 28))) {
        throw new Error("Unable to find clear starting positions for all warehouse people.");
      }

      characters.push(candidate);
      positions.push([candidate.x / (screenWidth * 3), candidate.y / (screenHeight * 3)]);
    }

    return positions;
  }

  const entityPositions = generateEntityPositions();
  const boxDimensions = () => ({
    width: 96 + Math.random() * 24,
    height: 78 + Math.random() * 16
  });

  function getStartingCharacters(column, row) {
    const characters = entityPositions.flatMap(([relativeX, relativeY]) => {
      const worldX = relativeX * 3;
      const worldY = relativeY * 3;
      if (Math.floor(worldX) !== column || Math.floor(worldY) !== row) return [];
      return [{
        x: (worldX - column) * screenWidth,
        y: (worldY - row) * screenHeight,
        width: 90,
        height: 120
      }];
    });

    if (column === 1 && row === 1) {
      characters.push({
        x: screenWidth / 2,
        y: screenHeight / 2,
        width: 160,
        height: 160
      });
    }

    return characters;
  }

  function createRandomObstacle(column, row, width, height, placed, characters) {
    const edgePadding = 36;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const obstacle = {
        x: width / 2 + edgePadding + Math.random() * (screenWidth - width - edgePadding * 2),
        y: height / 2 + edgePadding + Math.random() * (screenHeight - height - edgePadding * 2),
        width,
        height
      };
      if (placed.some((other) => rectanglesOverlap(obstacle, other, 36))) continue;
      if (characters.some((character) => rectanglesOverlap(obstacle, character, 32))) continue;
      return [
        column,
        row,
        obstacle.x / screenWidth,
        obstacle.y / screenHeight,
        width,
        height
      ];
    }

    throw new Error(`Unable to place a non-overlapping obstacle in warehouse screen ${column},${row}.`);
  }

  function generateObstaclePositions() {
    const boxPositions = [];
    const shelvingPositions = [];
    const screenCounts = Array.from({ length: 9 }, () => ({
      boxes: Math.floor(Math.random() * 4),
      shelves: Math.floor(Math.random() * 4)
    }));

    for (const obstacleType of ["boxes", "shelves"]) {
      if (screenCounts.some((counts) => counts[obstacleType] > 0)) continue;
      screenCounts[Math.floor(Math.random() * screenCounts.length)][obstacleType] = 1;
    }

    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        const placed = [];
        const characters = getStartingCharacters(column, row);
        const counts = screenCounts[row * 3 + column];
        const obstacleOrder = [
          ...Array.from({ length: counts.boxes }, () => ({ type: "box", ...boxDimensions() })),
          ...Array.from({ length: counts.shelves }, () => ({
            type: "shelf",
            width: 260,
            height: 140
          }))
        ];

        for (let index = obstacleOrder.length - 1; index > 0; index -= 1) {
          const randomIndex = Math.floor(Math.random() * (index + 1));
          [obstacleOrder[index], obstacleOrder[randomIndex]] = [
            obstacleOrder[randomIndex],
            obstacleOrder[index]
          ];
        }

        for (const obstacle of obstacleOrder) {
          const position = createRandomObstacle(
            column,
            row,
            obstacle.width,
            obstacle.height,
            placed,
            characters
          );
          placed.push({
            x: position[2] * screenWidth,
            y: position[3] * screenHeight,
            width: obstacle.width,
            height: obstacle.height
          });
          if (obstacle.type === "shelf") shelvingPositions.push(position);
          else boxPositions.push(position);
        }
      }
    }

    return { boxPositions, shelvingPositions };
  }

  const { boxPositions, shelvingPositions } = generateObstaclePositions();
  const personPalettes = [
    { skin: "#d99b72", hair: "#382820", shirt: "#397c9c", pants: "#263c59" },
    { skin: "#8f5639", hair: "#211b19", shirt: "#ad493e", pants: "#394556" },
    { skin: "#edc59d", hair: "#76502f", shirt: "#708347", pants: "#55453a" },
    { skin: "#b97850", hair: "#30251f", shirt: "#b67d35", pants: "#314d4d" },
    { skin: "#e5b58c", hair: "#49332d", shirt: "#735e9a", pants: "#3d4055" },
    { skin: "#70442f", hair: "#201a18", shirt: "#56826f", pants: "#443c38" },
    { skin: "#f0cba6", hair: "#9a6337", shirt: "#aa526e", pants: "#38475c" },
    { skin: "#a96748", hair: "#28201e", shirt: "#657caa", pants: "#49453b" }
  ];
  const chaseDialogue = [
    "Stay back!",
    "Help!",
    "Run!",
    "Get away!",
    "No, no!",
    "Someone help!"
  ];

  function createBox([column, row, offsetX, offsetY, width, height]) {
    const box = document.createElement("div");
    const x = (column + offsetX) * screenWidth;
    const y = (row + offsetY) * screenHeight;
    box.className = "warehouse-box";
    box.setAttribute("aria-hidden", "true");
    box.style.left = `${x}px`;
    box.style.top = `${y}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
    box.style.transform = "translate(-50%, -50%)";
    box.innerHTML = "<span>FRAGILE</span>";
    world.appendChild(box);
    return { element: box, x, y, occupant: null, challenger: null };
  }

  const boxes = boxPositions.map(createBox);

  function createShelving([column, row, offsetX, offsetY]) {
    const shelf = document.createElement("div");
    const x = (column + offsetX) * screenWidth;
    const y = (row + offsetY) * screenHeight;
    shelf.className = "shelving-unit";
    shelf.setAttribute("aria-hidden", "true");
    shelf.style.left = `${x}px`;
    shelf.style.top = `${y}px`;
    shelf.style.width = "260px";
    shelf.style.height = "140px";
    shelf.style.transform = "translate(-50%, -50%)";
    shelf.innerHTML = "<i class=\"shelf-stock\"></i><i class=\"shelf-stock\"></i><i class=\"shelf-stock\"></i><i class=\"shelf-stock\"></i><i class=\"shelf-stock shelf-stock-bottom\"></i><i class=\"shelf-stock shelf-stock-bottom\"></i><i class=\"shelf-stock shelf-stock-bottom\"></i><i class=\"shelf-stock shelf-stock-bottom\"></i>";
    world.appendChild(shelf);
    return { element: shelf, x, y };
  }

  const shelves = shelvingPositions.map(createShelving);

  function findPathToShelf(entity, targetShelf) {
    const cellSize = 40;
    const columns = Math.ceil(screenWidth * 3 / cellSize);
    const rows = Math.ceil(screenHeight * 3 / cellSize);
    const cellCount = columns * rows;
    const halfWidth = entity.element.offsetWidth / 2;
    const halfHeight = entity.element.offsetHeight / 2;
    const walkable = new Uint8Array(cellCount);
    const worldX = (column) => (column + 0.5) * cellSize;
    const worldY = (row) => (row + 0.5) * cellSize;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = worldX(column);
        const y = worldY(row);
        const withinBounds = x >= halfWidth && x <= screenWidth * 3 - halfWidth
          && y >= halfHeight && y <= screenHeight * 3 - halfHeight;
        const overlapsObstacle = [...boxes, ...shelves].some(({ element, x: obstacleX, y: obstacleY }) => (
          Math.abs(x - obstacleX) < element.offsetWidth / 2 + halfWidth + 12
          && Math.abs(y - obstacleY) < element.offsetHeight / 2 + halfHeight + 12
        ));
        if (withinBounds && !overlapsObstacle) {
          walkable[row * columns + column] = 1;
        }
      }
    }

    function nearestWalkableCell(x, y) {
      let nearestCell = -1;
      let nearestDistance = Infinity;
      for (let cell = 0; cell < cellCount; cell += 1) {
        if (!walkable[cell]) continue;
        const column = cell % columns;
        const row = Math.floor(cell / columns);
        const distance = Math.hypot(worldX(column) - x, worldY(row) - y);
        if (distance < nearestDistance) {
          nearestCell = cell;
          nearestDistance = distance;
        }
      }
      return nearestCell;
    }

    const startCell = nearestWalkableCell(entity.x, entity.y);
    const pickupTarget = {
      x: targetShelf.x,
      y: targetShelf.y - targetShelf.element.offsetHeight / 2 - halfHeight - 30
    };
    const targetCell = nearestWalkableCell(pickupTarget.x, pickupTarget.y);
    if (startCell < 0 || targetCell < 0) {
      throw new Error("Unable to find a clear route to the selected shelving unit.");
    }

    const previousCell = new Int32Array(cellCount).fill(-2);
    const queue = new Int32Array(cellCount);
    let queueStart = 0;
    let queueEnd = 0;
    queue[queueEnd++] = startCell;
    previousCell[startCell] = -1;
    const directions = [-1, 1, -columns, columns];

    while (queueStart < queueEnd && previousCell[targetCell] === -2) {
      const currentCell = queue[queueStart++];
      const currentColumn = currentCell % columns;

      for (const direction of directions) {
        const nextCell = currentCell + direction;
        if (nextCell < 0 || nextCell >= cellCount) continue;
        if (Math.abs(nextCell % columns - currentColumn) > 1) continue;
        if (!walkable[nextCell] || previousCell[nextCell] !== -2) continue;
        previousCell[nextCell] = currentCell;
        queue[queueEnd++] = nextCell;
      }
    }

    if (previousCell[targetCell] === -2) {
      throw new Error("No clear route exists to the selected shelving unit.");
    }

    const route = [];
    for (let cell = targetCell; cell !== startCell; cell = previousCell[cell]) {
      route.push({
        x: worldX(cell % columns),
        y: worldY(Math.floor(cell / columns))
      });
    }
    route.reverse();

    const waypoints = route.filter((point, index) => {
      if (index === route.length - 1 || index === 0) return true;
      const previous = route[index - 1];
      const next = route[index + 1];
      return Math.sign(point.x - previous.x) !== Math.sign(next.x - point.x)
        || Math.sign(point.y - previous.y) !== Math.sign(next.y - point.y);
    });
    const lastWaypoint = waypoints[waypoints.length - 1];
    if (!lastWaypoint || Math.hypot(
      pickupTarget.x - lastWaypoint.x,
      pickupTarget.y - lastWaypoint.y
    ) > 1) {
      waypoints.push(pickupTarget);
    }
    return waypoints;
  }

  function collidesWithShelfBottom(x, currentY, nextY, halfWidth, halfHeight) {
    return shelves.some(({ element: shelf }) => {
      const left = shelf.offsetLeft - shelf.offsetWidth / 2;
      const right = left + shelf.offsetWidth;
      const bottom = shelf.offsetTop + shelf.offsetHeight / 2;
      const overlapsRack = x + halfWidth > left && x - halfWidth < right;
      const enteringFromBelow = nextY < currentY
        && currentY - halfHeight >= bottom
        && nextY - halfHeight < bottom;
      const leavingThroughBottom = nextY > currentY
        && currentY + halfHeight <= bottom
        && nextY + halfHeight > bottom;
      return overlapsRack && (enteringFromBelow || leavingThroughBottom);
    });
  }

  function createEntity(x, y, index) {
    const entity = document.createElement("div");
    const dialogue = document.createElement("div");
    const person = personPalettes[index % personPalettes.length];
    const hairstyle = index % 3 === 0
      ? "M14 12C14 4 18 2 23 3c6 0 9 4 8 10l-3 3-1-7c-4 3-8 3-12 3l-1 5Z"
      : index % 3 === 1
        ? "M14 12c-1-6 3-10 8-10 7 0 10 5 8 12l-2 5-2-8c-4 2-8 2-12 1l-1 6Z"
        : "M14 12c0-6 3-9 8-9 6 0 9 4 8 10l-2 9-3-7c-4 2-7 2-10 1l-1 7-2-5Z";
    entity.className = "entity";
    entity.setAttribute("aria-hidden", "true");
    entity.style.cssText = `
      position: absolute;
      top: ${y}px;
      left: ${x}px;
      z-index: 0;
      width: 44px;
      height: 76px;
      transform: translate(-50%, -50%);
      pointer-events: none;
    `;
    entity.innerHTML = `
      <svg viewBox="0 0 44 76" width="44" height="76">
        <ellipse cx="22" cy="72" rx="14" ry="3" fill="#202020" opacity=".22" />
        <g class="person-standing-pose">
          <path d="M19 18h6v7h-6z" fill="${person.skin}" />
          <path d="M18 22 13 24 9 37l5 2 3-7 1 11h9l1-11 3 7 5-2-4-13-5-2-4 3z" fill="${person.shirt}" stroke="#252525" stroke-width="1.3" stroke-linejoin="round" />
          <path d="m15 26-4 11m22-11 4 11" fill="none" stroke="${person.skin}" stroke-width="4" stroke-linecap="round" />
          <path d="m11 36-1 3m27-3 1 3" fill="none" stroke="${person.skin}" stroke-width="4" stroke-linecap="round" />
          <path d="m17 43 10 0 2 18-5 0-2-12-2 12-5 0z" fill="${person.pants}" stroke="#252525" stroke-width="1.3" stroke-linejoin="round" />
          <path d="M15 61h7l-1 5h-8c0-2 1-4 2-5Zm10 0h5l4 4c1 1 0 2-1 2h-9Z" fill="#302822" stroke="#171515" stroke-width="1" stroke-linejoin="round" />
          <path d="M20 24h4l-2 3z" fill="#e2d1bd" opacity=".9" />
          <circle cx="13" cy="12" r="2" fill="${person.skin}" />
          <circle cx="31" cy="12" r="2" fill="${person.skin}" />
          <ellipse cx="22" cy="11" rx="8" ry="9" fill="${person.skin}" stroke="#382a24" stroke-width="1" />
          <path d="${hairstyle}" fill="${person.hair}" />
          <circle class="person-eye" cx="19" cy="12" r="1.25" fill="#241b18" />
          <circle class="person-eye" cx="25" cy="12" r="1.25" fill="#241b18" />
          <circle class="person-pupil" cx="19" cy="12" r=".45" fill="#fff8eb" />
          <circle class="person-pupil" cx="25" cy="12" r=".45" fill="#fff8eb" />
          <path class="person-mouth" d="M20 16q2 1 4 0" fill="none" stroke="#744333" stroke-width=".8" stroke-linecap="round" />
        </g>
        <g class="person-crawl-pose" stroke="#252525" stroke-linecap="round" stroke-linejoin="round">
          <ellipse cx="23" cy="58" rx="19" ry="3" fill="#202020" opacity=".2" stroke="none" />
          <path class="crawl-arm crawl-arm-back" d="M15 48Q9 49 5 54L1 53" fill="none" stroke="${person.skin}" stroke-width="4" />
          <path class="crawl-leg crawl-leg-back" d="M27 49Q34 46 39 49L43 52" fill="none" stroke="${person.pants}" stroke-width="4" />
          <path class="crawl-torso" d="M10 44Q18 40 29 45L33 52Q23 57 13 52Z" fill="${person.shirt}" stroke-width="1.2" />
          <path class="crawl-hip" d="M25 47Q31 47 34 52L29 56 22 54 20 51Z" fill="${person.pants}" stroke-width="1.2" />
          <path class="crawl-arm crawl-arm-front" d="M14 44Q8 41 4 38L1 40" fill="none" stroke="${person.skin}" stroke-width="4" />
          <path class="crawl-leg crawl-leg-front" d="M27 52Q34 54 39 53L43 55" fill="none" stroke="${person.pants}" stroke-width="4" />
          <path class="crawl-foot crawl-foot-front" d="M39 53 43 55" fill="none" stroke="#302822" stroke-width="3" />
          <path class="crawl-foot crawl-foot-back" d="M39 49 43 52" fill="none" stroke="#302822" stroke-width="3" />
          <g class="crawl-head">
            <ellipse cx="9" cy="43" rx="7" ry="6.5" fill="${person.skin}" stroke-width="1" />
            <path d="M3 42Q3 36 9 36Q16 36 16 41L12 40 8 42 4 45Z" fill="${person.hair}" stroke-width="1" />
            <circle cx="6" cy="44" r="1" fill="#241b18" stroke="none" />
            <path d="M2 48q2 1 4 0" fill="none" stroke="#744333" stroke-width=".8" />
          </g>
        </g>
      </svg>
    `;
    dialogue.className = "person-dialogue";
    dialogue.setAttribute("aria-hidden", "true");
    dialogue.hidden = true;
    world.appendChild(entity);
    world.appendChild(dialogue);
    return {
      element: entity,
      dialogue,
      x,
      y,
      index,
      isChased: false,
      hidingTarget: null,
      hidden: false,
      hideCooldownUntil: 0,
      boxChallengeCooldownUntil: 0,
      waitingForBox: null,
      wanderAngle: Math.random() * Math.PI * 2,
      wanderUntil: 0,
      hasSeenPlayer: false,
      weapon: null,
      weaponShelf: null,
      weaponAttackAt: 0
    };
  }

  const entities = entityPositions.map(([x, y], index) => createEntity(
    x * screenWidth * 3,
    y * screenHeight * 3,
    index
  ));
  const fleeSpeed = 150;
  const wanderSpeed = 42;
  const scareDuration = 2200;
  const boxEjectionChance = 0.3;
  const weapons = [
    { type: "melee", range: 135, sizeLoss: 0.12, cooldown: 1500 },
    { type: "ranged", range: Math.hypot(screenWidth, screenHeight), sizeLoss: 0.08, cooldown: 1900 }
  ];
  let exitReady = false;
  let previousFrameTime;
  let gameStarted = false;
  let gameOver = false;

  function getBoxExitTarget(entity, box, awayFromX, awayFromY) {
    const offsetX = box.x - awayFromX;
    const offsetY = box.y - awayFromY;
    const distance = Math.hypot(offsetX, offsetY) || 1;
    const directionX = offsetX === 0 && offsetY === 0
      ? Math.cos(entity.index)
      : offsetX / distance;
    const directionY = offsetX === 0 && offsetY === 0
      ? Math.sin(entity.index)
      : offsetY / distance;
    const clearance = Math.abs(directionX) * (box.element.offsetWidth / 2 + entity.element.offsetWidth / 2)
      + Math.abs(directionY) * (box.element.offsetHeight / 2 + entity.element.offsetHeight / 2)
      + 8;

    return {
      x: Math.min(
        screenWidth * 3 - entity.element.offsetWidth / 2,
        Math.max(entity.element.offsetWidth / 2, box.x + directionX * clearance)
      ),
      y: Math.min(
        screenHeight * 3 - entity.element.offsetHeight / 2,
        Math.max(entity.element.offsetHeight / 2, box.y + directionY * clearance)
      )
    };
  }

  function releaseBoxClaim(entity) {
    const box = entity.hidingTarget || entity.waitingForBox;
    if (box?.occupant === entity) box.occupant = null;
    if (box?.challenger === entity) box.challenger = null;
    entity.hidingTarget = null;
    entity.waitingForBox = null;
  }

  window.addEventListener("gamestart", () => {
    gameStarted = true;
    requestAnimationFrame(updateEntities);
  });

  window.addEventListener("scarefigures", (event) => {
    const { x, y, radius } = event.detail;

    for (const [index, entity] of entities.entries()) {
      if (!entity.hidden || Math.hypot(entity.x - x, entity.y - y) > radius) continue;

      const box = entity.hidingTarget;
      entity.exitTarget = getBoxExitTarget(entity, box, x, y);
      entity.scaredUntil = performance.now() + scareDuration;
      event.detail.scaredCount += 1;
    }
  });

  window.addEventListener("playershot", (event) => {
    const { startX, startY, endX, endY } = event.detail;
    const segmentX = endX - startX;
    const segmentY = endY - startY;
    const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;

    for (const entity of entities) {
      if (!entity.element.isConnected || entity.hidden) continue;

      const projection = segmentLengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, (
          (entity.x - startX) * segmentX + (entity.y - startY) * segmentY
        ) / segmentLengthSquared));
      const nearestX = startX + projection * segmentX;
      const nearestY = startY + projection * segmentY;
      if (Math.hypot(entity.x - nearestX, entity.y - nearestY) > 30) continue;

      entity.immobilized = true;
      entity.element.classList.add("immobilized");
      entity.dialogue.textContent = "Pinned!";
      entity.dialogue.hidden = false;
      entity.dialogue.style.left = `${entity.x}px`;
      entity.dialogue.style.top = `${entity.y - 42}px`;
    }
  });

  window.addEventListener("gameover", () => {
    gameOver = true;
  });

  function updateEntities(time) {
    if (!gameStarted || gameOver) return;
    const elapsed = previousFrameTime === undefined
      ? 0
      : Math.min((time - previousFrameTime) / 1000, 0.05);
    previousFrameTime = time;
    const playerBounds = player.getBoundingClientRect();
    const playerX = Number.parseFloat(player.style.left);
    const playerY = Number.parseFloat(player.style.top);
    const worldWidth = screenWidth * 3;
    const worldHeight = screenHeight * 3;
    const playerHidden = shelves.some(({ element: shelf }) => (
      playerX >= shelf.offsetLeft - shelf.offsetWidth / 2
      && playerX <= shelf.offsetLeft + shelf.offsetWidth / 2
      && playerY >= shelf.offsetTop - shelf.offsetHeight / 2
      && playerY <= shelf.offsetTop + shelf.offsetHeight / 2
    ));

    for (const [index, entity] of entities.entries()) {
      if (!entity.element.isConnected) continue;

      const element = entity.element;
      const minX = element.offsetWidth / 2;
      const minY = element.offsetHeight / 2;
      const maxX = Math.max(minX, worldWidth - minX);
      const maxY = Math.max(minY, worldHeight - minY);
      const offsetX = entity.x - playerX;
      const offsetY = entity.y - playerY;
      const distance = Math.hypot(offsetX, offsetY);
      const sharesScreen = Math.floor(entity.x / screenWidth)
        === Math.floor(playerX / screenWidth)
        && Math.floor(entity.y / screenHeight)
        === Math.floor(playerY / screenHeight);
      const noticeRadius = Math.hypot(screenWidth, screenHeight) / 2;
      const currentTime = performance.now();
      const isStartled = currentTime < (entity.scaredUntil || 0);
      const canHide = currentTime >= entity.hideCooldownUntil;
      if (!playerHidden && distance < noticeRadius && !entity.hasSeenPlayer) {
        entity.hasSeenPlayer = true;
        if (Math.random() < 0.2) {
          entity.weapon = { ...weapons[Math.floor(Math.random() * weapons.length)] };
          entity.weaponShelf = shelves.reduce((nearest, shelf) => (
            Math.hypot(shelf.x - entity.x, shelf.y - entity.y)
              < Math.hypot(nearest.x - entity.x, nearest.y - entity.y)
              ? shelf
              : nearest
          ), shelves[0]);
        }
      }
      const isPlayerDetected = entity.hasSeenPlayer;
      const isChased = isPlayerDetected;

      if (isChased && !entity.hidden) {
        if (!entity.isChased) {
          entity.dialogue.textContent = chaseDialogue[
            Math.floor(Math.random() * chaseDialogue.length)
          ];
        }
        entity.isChased = true;
        element.classList.add("is-chased");
        entity.dialogue.hidden = false;
        entity.dialogue.style.left = `${entity.x}px`;
        entity.dialogue.style.top = `${entity.y - 42}px`;
        const mouth = element.querySelector(".person-mouth");
        mouth.setAttribute("d", "M20 14 Q22 13 24 14 Q24 18 22 18 Q20 18 20 14Z");
        mouth.setAttribute("fill", "#54221d");
        for (const eye of element.querySelectorAll(".person-eye")) {
          eye.setAttribute("r", "1.8");
        }
        for (const pupil of element.querySelectorAll(".person-pupil")) {
          pupil.setAttribute("r", "0.8");
        }
      } else {
        entity.isChased = false;
        element.classList.remove("is-chased");
        entity.dialogue.hidden = true;
        const mouth = element.querySelector(".person-mouth");
        mouth.setAttribute("d", "M20 16q2 1 4 0");
        mouth.setAttribute("fill", "none");
        for (const eye of element.querySelectorAll(".person-eye")) {
          eye.setAttribute("r", "1.25");
        }
        for (const pupil of element.querySelectorAll(".person-pupil")) {
          pupil.setAttribute("r", "0.45");
        }
      }

      if (entity.hidden && !entity.exitTarget && !playerHidden && distance > noticeRadius + 100) {
        const box = entity.hidingTarget;
        entity.exitTarget = getBoxExitTarget(entity, box, playerX, playerY);
      }

      if (entity.hidden) {
        element.classList.add("is-hidden");
        if (entity.exitTarget) {
          const targetX = entity.exitTarget.x - entity.x;
          const targetY = entity.exitTarget.y - entity.y;
          const targetDistance = Math.hypot(targetX, targetY);
          const stepDistance = fleeSpeed * elapsed;

          if (targetDistance <= stepDistance) {
            const exitedBox = entity.hidingTarget;
            entity.x = entity.exitTarget.x;
            entity.y = entity.exitTarget.y;
            entity.exitTarget = null;
            entity.hidden = false;
            element.classList.remove("is-hidden");
            entity.hidingTarget = null;
            entity.hideCooldownUntil = currentTime + 10000;
            if (exitedBox?.occupant === entity) exitedBox.occupant = null;
          } else if (targetDistance > 0) {
            entity.x += targetX / targetDistance * stepDistance;
            entity.y += targetY / targetDistance * stepDistance;
          }
          element.style.left = `${entity.x}px`;
          element.style.top = `${entity.y}px`;
        } else {
          element.style.left = `${entity.x}px`;
          element.style.top = `${entity.y}px`;
        }
        entity.dialogue.hidden = true;
        continue;
      }

      if (entity.immobilized) entity.dialogue.hidden = true;

      if (isPlayerDetected) {
        if (entity.weapon) {
          releaseBoxClaim(entity);
          let targetDistance = Math.hypot(entity.weaponShelf.x - entity.x, entity.weaponShelf.y - entity.y);

          if (entity.weaponReady) {
            targetDistance = distance;
            if (!playerHidden && sharesScreen && targetDistance <= entity.weapon.range
              && currentTime >= entity.weaponAttackAt) {
              entity.weaponAttackAt = currentTime + entity.weapon.cooldown;
              if (entity.weapon.type === "ranged") {
                const projectile = document.createElement("i");
                projectile.className = "weapon-projectile";
                projectile.style.left = `${entity.x}px`;
                projectile.style.top = `${entity.y - 20}px`;
                projectile.style.setProperty("--travel-x", `${playerX - entity.x}px`);
                projectile.style.setProperty("--travel-y", `${playerY - entity.y}px`);
                world.appendChild(projectile);
                window.setTimeout(() => projectile.remove(), 420);
              } else {
                entity.weaponVisual.classList.remove("weapon-strike");
                void entity.weaponVisual.offsetWidth;
                entity.weaponVisual.classList.add("weapon-strike");
              }
              window.dispatchEvent(new CustomEvent("weaponhit", {
                detail: { sizeLoss: entity.weapon.sizeLoss }
              }));
            }
          }

          if (!entity.weaponReady) {
            entity.weaponPath ??= findPathToShelf(entity, entity.weaponShelf);
            entity.weaponPathIndex ??= 0;
            const movementSpeed = fleeSpeed * (entity.immobilized ? 0.18 : 1);
            const waypoint = entity.weaponPath[entity.weaponPathIndex];

            if (!waypoint) {
              entity.weaponReady = true;
              entity.weaponVisual = document.createElement("span");
              entity.weaponVisual.className = `person-weapon person-weapon-${entity.weapon.type}`;
              entity.weaponVisual.setAttribute(
                "aria-label",
                entity.weapon.type === "melee" ? "Improvised melee weapon" : "Long-range weapon"
              );
              element.appendChild(entity.weaponVisual);
            } else {
              const waypointX = waypoint.x - entity.x;
              const waypointY = waypoint.y - entity.y;
              const waypointDistance = Math.hypot(waypointX, waypointY);
              const stepDistance = movementSpeed * elapsed;

              if (waypointDistance <= stepDistance + 4) {
                entity.x = waypoint.x;
                entity.y = waypoint.y;
                entity.weaponPathIndex += 1;
              } else if (waypointDistance > 0) {
                entity.x += waypointX / waypointDistance * stepDistance;
                entity.y += waypointY / waypointDistance * stepDistance;
              }
            }
          } else if (entity.weapon.type === "ranged") {
            const direction = distance === 0
              ? { x: Math.cos(index), y: Math.sin(index) }
              : { x: offsetX / distance, y: offsetY / distance };
            const directionX = distance > entity.weapon.range ? -direction.x : direction.x;
            const directionY = distance > entity.weapon.range ? -direction.y : direction.y;
            const movementSpeed = fleeSpeed * (entity.immobilized ? 0.18 : 1);
            entity.x = Math.min(maxX, Math.max(minX, entity.x + directionX * movementSpeed * elapsed));
            entity.y = Math.min(maxY, Math.max(minY, entity.y + directionY * movementSpeed * elapsed));
          } else if (targetDistance > entity.weapon.range) {
            const directionX = distance === 0 ? Math.cos(index) : -offsetX / distance;
            const directionY = distance === 0 ? Math.sin(index) : -offsetY / distance;
            const movementSpeed = fleeSpeed * (entity.immobilized ? 0.18 : 1);
            entity.x = Math.min(maxX, Math.max(minX, entity.x + directionX * movementSpeed * elapsed));
            entity.y = Math.min(maxY, Math.max(minY, entity.y + directionY * movementSpeed * elapsed));
          }
          element.style.left = `${entity.x}px`;
          element.style.top = `${entity.y}px`;
        } else {
          if (entity.waitingForBox && !entity.waitingForBox.occupant
            && entity.waitingForBox.challenger === entity) {
            entity.hidingTarget = entity.waitingForBox;
            entity.hidingTarget.occupant = entity;
            entity.hidingTarget.challenger = null;
            entity.waitingForBox = null;
          }

          if (!entity.hidingTarget && !entity.waitingForBox && !isStartled && canHide) {
            const nearbyBoxes = boxes
              .map((box) => ({
                box,
                distance: Math.hypot(box.x - entity.x, box.y - entity.y),
                playerDistance: Math.hypot(box.x - playerX, box.y - playerY)
              }))
              .filter(({ box, distance: boxDistance }) => boxDistance <= 380
                && !box.challenger
                && (!box.occupant || (box.occupant.hidden && !box.occupant.exitTarget)))
              .sort((a, b) => (
                a.distance + (a.playerDistance < distance ? 120 : 0)
                - b.distance - (b.playerDistance < distance ? 120 : 0)
              ));

            if (nearbyBoxes.length) {
              const targetBox = nearbyBoxes[0].box;
              if (!targetBox.occupant) {
                entity.hidingTarget = targetBox;
                targetBox.occupant = entity;
              } else if (currentTime >= entity.boxChallengeCooldownUntil) {
                if (Math.random() < boxEjectionChance) {
                  const occupant = targetBox.occupant;
                  targetBox.challenger = entity;
                  entity.waitingForBox = targetBox;
                  occupant.exitTarget = getBoxExitTarget(occupant, targetBox, entity.x, entity.y);
                  occupant.scaredUntil = currentTime + scareDuration;
                } else {
                  entity.boxChallengeCooldownUntil = currentTime + 3000;
                }
              }
            }
          }

          let directionX;
          let directionY;
          if (entity.waitingForBox) {
            directionX = 0;
            directionY = 0;
          } else if (isStartled) {
            directionX = distance === 0 ? Math.cos(index) : offsetX / distance;
            directionY = distance === 0 ? Math.sin(index) : offsetY / distance;
          } else if (entity.hidingTarget) {
            const targetX = entity.hidingTarget.x;
            const targetY = entity.hidingTarget.y;
            const targetOffsetX = targetX - entity.x;
            const targetOffsetY = targetY - entity.y;
            const targetDistance = Math.hypot(targetOffsetX, targetOffsetY);

            const movementSpeed = fleeSpeed * (entity.immobilized ? 0.18 : 1);
            if (targetDistance < movementSpeed * elapsed + 8) {
              entity.x = targetX;
              entity.y = targetY;
              entity.hidden = true;
              element.classList.add("is-hidden");
            } else {
              directionX = targetOffsetX / targetDistance;
              directionY = targetOffsetY / targetDistance;
            }
          } else {
            directionX = distance === 0 ? Math.cos(index) : offsetX / distance;
            directionY = distance === 0 ? Math.sin(index) : offsetY / distance;
          }

          if (entity.hidden) {
            element.style.left = `${entity.x}px`;
            element.style.top = `${entity.y}px`;
            continue;
          }

          const edgeAvoidance = 50;

          if (entity.x < minX + edgeAvoidance) {
            directionX += (minX + edgeAvoidance - entity.x) / edgeAvoidance;
          } else if (entity.x > maxX - edgeAvoidance) {
            directionX -= (entity.x - (maxX - edgeAvoidance)) / edgeAvoidance;
          }

          if (entity.y < minY + edgeAvoidance) {
            directionY += (minY + edgeAvoidance - entity.y) / edgeAvoidance;
          } else if (entity.y > maxY - edgeAvoidance) {
            directionY -= (entity.y - (maxY - edgeAvoidance)) / edgeAvoidance;
          }

          const directionLength = Math.hypot(directionX, directionY) || 1;
          directionX /= directionLength;
          directionY /= directionLength;
          const movementSpeed = fleeSpeed * (entity.immobilized ? 0.18 : 1);
          const nextX = Math.min(maxX, Math.max(minX, entity.x + directionX * movementSpeed * elapsed));
          const nextY = Math.min(maxY, Math.max(minY, entity.y + directionY * movementSpeed * elapsed));
          entity.x = nextX;
          if (!collidesWithShelfBottom(entity.x, entity.y, nextY, minX, minY)) {
            entity.y = nextY;
          }
          element.style.left = `${entity.x}px`;
          element.style.top = `${entity.y}px`;
        }
      } else {
        entity.hidingTarget = null;
        if (currentTime >= entity.wanderUntil) {
          entity.wanderAngle = Math.random() * Math.PI * 2;
          entity.wanderUntil = currentTime + 1200 + Math.random() * 2800;
        }

        let directionX = Math.cos(entity.wanderAngle);
        let directionY = Math.sin(entity.wanderAngle);
        const edgeAvoidance = 50;
        if (entity.x < minX + edgeAvoidance) {
          directionX += (minX + edgeAvoidance - entity.x) / edgeAvoidance;
        } else if (entity.x > maxX - edgeAvoidance) {
          directionX -= (entity.x - (maxX - edgeAvoidance)) / edgeAvoidance;
        }
        if (entity.y < minY + edgeAvoidance) {
          directionY += (minY + edgeAvoidance - entity.y) / edgeAvoidance;
        } else if (entity.y > maxY - edgeAvoidance) {
          directionY -= (entity.y - (maxY - edgeAvoidance)) / edgeAvoidance;
        }
        const directionLength = Math.hypot(directionX, directionY) || 1;
        directionX /= directionLength;
        directionY /= directionLength;
        const movementSpeed = wanderSpeed * (entity.immobilized ? 0.18 : 1);
        const nextX = Math.min(maxX, Math.max(minX, entity.x + directionX * movementSpeed * elapsed));
        const nextY = Math.min(maxY, Math.max(minY, entity.y + directionY * movementSpeed * elapsed));
        entity.x = nextX;
        if (!collidesWithShelfBottom(entity.x, entity.y, nextY, minX, minY)) {
          entity.y = nextY;
        }
        element.style.left = `${entity.x}px`;
        element.style.top = `${entity.y}px`;
      }

      const entityBounds = element.getBoundingClientRect();
      const isTouching = playerBounds.left < entityBounds.right
        && playerBounds.right > entityBounds.left
        && playerBounds.top < entityBounds.bottom
        && playerBounds.bottom > entityBounds.top;

      if (isTouching && !entity.hidden) {
        releaseBoxClaim(entity);
        const bloodPosition = {
          x: entity.x,
          y: entity.y,
          weaponType: entity.weapon?.type
        };
        entity.dialogue.remove();
        element.remove();
        window.dispatchEvent(new CustomEvent("figureeaten", { detail: bloodPosition }));

        if (!exitReady && entities.every((remainingEntity) => !remainingEntity.element.isConnected)) {
          exitReady = true;
          const box = boxes.reduce((closest, candidate) => {
            const candidateDistance = Math.hypot(candidate.x - playerX, candidate.y - playerY);
            return candidateDistance < closest.distance
              ? { box: candidate, distance: candidateDistance }
              : closest;
          }, { box: null, distance: Infinity }).box;

          window.dispatchEvent(new CustomEvent("allfiguresconsumed", {
            detail: {
              box: box.element,
              x: box.x,
              y: box.y
            }
          }));
        }
      }
    }

    requestAnimationFrame(updateEntities);
  }

})();
