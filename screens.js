
(() => {
  const canvas = document.getElementById("background");
  const ctx = canvas.getContext("2d");

  // Original artwork dimensions
  const MENU_WIDTH = 1424;
  const MENU_HEIGHT = 710;

  const GAME_WIDTH = 256;
  const GAME_HEIGHT = 128;

  const paths = {
    title: [
      "images/Title Screen/Title_1.png",
      "images/Title Screen/Title_2.png",
      "images/Title Screen/Title_3.png",
      "images/Title Screen/Title_4.png"
    ],

    controls: [
      "images/Controls Screen/Controls_1.png",
      "images/Controls Screen/Controls_2.png",
      "images/Controls Screen/Controls_3.png",
      "images/Controls Screen/Controls_4.png"
    ]
  };

  const images = {};

  for (const [name, files] of Object.entries(paths)) {
    images[name] = files.map(path => {
      const img = new Image();
      img.src = path;
      return img;
    });
  }

  let screen = "title";
  let frame = 0;
  let nextGlitch = performance.now() + 3000;
  let glitchEnd = 0;
  let lastFrameChange = 0;

  // Change between screens
  function setScreen(next) {
    screen = next;
    frame = 0;
    glitchEnd = 0;
    nextGlitch = performance.now() + 3000;

    if (next === "game") {
      canvas.width = GAME_WIDTH;
      canvas.height = GAME_HEIGHT;

      canvas.dispatchEvent(
        new CustomEvent("hive:start")
      );
    } else {
      canvas.width = MENU_WIDTH;
      canvas.height = MENU_HEIGHT;
    }
  }

  // Begin with title screen
  setScreen("title");

  // Draw menu animations
  function draw(now) {
    if (screen === "game") {
      requestAnimationFrame(draw);
      return;
    }

    // Start glitch
    if (now >= nextGlitch && glitchEnd === 0) {
      glitchEnd = now + 350;
      lastFrameChange = 0;
    }

    // Switch glitch frames
    if (glitchEnd !== 0) {
      if (now >= glitchEnd) {
        frame = 0;
        glitchEnd = 0;

        nextGlitch =
          now + 3000 + Math.random() * 3000;
      } else if (now - lastFrameChange >= 80) {
        frame = 1 + Math.floor(Math.random() * 3);
        lastFrameChange = now;
      }
    }

    const img = images[screen][frame];

    if (img.complete && img.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(
        img,
        0,
        0,
        canvas.width,
        canvas.height
      );
    }

    requestAnimationFrame(draw);
  }

  // Handle button clicks
  canvas.addEventListener("click", event => {
    if (screen === "game") return;

    const rect = canvas.getBoundingClientRect();

    const x = (event.clientX - rect.left)
      * canvas.width / rect.width;

    const y = (event.clientY - rect.top)
      * canvas.height / rect.height;

    if (screen === "title") {

      // START button
      if (
        x >= 500 && x <= 950 &&
        y >= 340 && y <= 500
      ) {
        setScreen("game");
        return;
      }

      // CONTROLS button
      if (
        x >= 450 && x <= 1000 &&
        y >= 500 && y <= 680
      ) {
        setScreen("controls");
        return;
      }

    } else if (screen === "controls") {

      // BACK button
      if (
        x >= 500 && x <= 950 &&
        y >= 490 && y <= 700
      ) {
        setScreen("title");
      }
    }
  });

  requestAnimationFrame(draw);
})();
