
(() => {
  const canvas = document.getElementById("background");
  const ctx = canvas.getContext("2d");

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
  let nextGlitch = performance.now() + 3500;
  let glitchEnd = 0;
  let lastFrameChange = 0;

  // Change between title, controls, and gameplay
  function setScreen(next) {
    screen = next;
    frame = 0;
    glitchEnd = 0;
    nextGlitch = performance.now() + 3500;

    if (next === "game") {
      canvas.dispatchEvent(new CustomEvent("hive:start"));
    }
  }

  // Draw menu and glitch animations
  function draw(now) {
    if (screen === "game") {
      requestAnimationFrame(draw);
      return;
    }

    if (now >= nextGlitch && glitchEnd === 0) {
      glitchEnd = now + 250;
      lastFrameChange = 0;
    }

    if (glitchEnd !== 0) {
      if (now >= glitchEnd) {
        frame = 0;
        glitchEnd = 0;
        nextGlitch = now + 3000 + Math.random() * 3000;
      } else if (now - lastFrameChange >= 65) {
        frame = 1 + Math.floor(Math.random() * 3);
        lastFrameChange = now;
      }
    }

    const img = images[screen][frame];

    if (img.complete && img.naturalWidth > 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }

    requestAnimationFrame(draw);
  }

  // Detect clicks on buttons
  canvas.addEventListener("click", event => {
    if (screen === "game") return;

    const rect = canvas.getBoundingClientRect();

    const x = (event.clientX - rect.left)
      * canvas.width / rect.width;

    const y = (event.clientY - rect.top)
      * canvas.height / rect.height;

    if (screen === "title") {
      // Temporary START and CONTROLS hitboxes
      if (y >= 65 && y <= 90) {
        if (x < 128) {
          setScreen("game");
        } else {
          setScreen("controls");
        }
      }
    } else if (screen === "controls") {
      // BACK button
      if (x >= 90 && x <= 170 && y >= 90) {
        setScreen("title");
      }
    }
  });

  requestAnimationFrame(draw);
})();

