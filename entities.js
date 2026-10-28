(() => {
  const player = document.getElementById("circle");
  const entityPositions = [
    [0.12, 0.18],
    [0.5, 0.14],
    [0.86, 0.2],
    [0.27, 0.48],
    [0.73, 0.48],
    [0.15, 0.8],
    [0.5, 0.86],
    [0.85, 0.79]
  ];

  function createEntity([x, y]) {
    const entity = document.createElement("div");
    entity.className = "entity";
    entity.setAttribute("aria-hidden", "true");
    entity.style.cssText = `
      position: fixed;
      top: ${y * 100}%;
      left: ${x * 100}%;
      z-index: 0;
      width: 44px;
      height: 76px;
      transform: translate(-50%, -50%);
      pointer-events: none;
    `;
    entity.innerHTML = `
      <svg viewBox="0 0 44 76" width="44" height="76">
        <g fill="none" stroke="#262626" stroke-linecap="round" stroke-width="4">
          <circle cx="22" cy="10" r="7" fill="#808080" />
          <path d="M22 18v27M22 26 9 38M22 26l13 12M22 45 12 66M22 45l10 21" />
        </g>
      </svg>
    `;
    document.body.appendChild(entity);
    return entity;
  }

  const entities = entityPositions.map(createEntity);

  function checkCollisions() {
    const playerBounds = player.getBoundingClientRect();

    for (let index = entities.length - 1; index >= 0; index--) {
      const entity = entities[index];
      if (!entity.isConnected) continue;

      const entityBounds = entity.getBoundingClientRect();
      const isTouching = playerBounds.left < entityBounds.right
        && playerBounds.right > entityBounds.left
        && playerBounds.top < entityBounds.bottom
        && playerBounds.bottom > entityBounds.top;

      if (isTouching) {
        entity.remove();
        player.style.width = `${player.offsetWidth + 16}px`;
        player.style.height = `${player.offsetHeight + 16}px`;
      }
    }

    requestAnimationFrame(checkCollisions);
  }

  requestAnimationFrame(checkCollisions);
})();
