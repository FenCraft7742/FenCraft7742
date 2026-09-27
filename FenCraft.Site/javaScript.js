  const app      = document.getElementById('app');
  const toggle   = document.getElementById('toggle');
  const backdrop = document.getElementById('backdrop');
  const mobile   = window.matchMedia('(max-width: 768px)');

  function setSidebar(open) {
    app.dataset.sidebar = open ? 'open' : 'closed';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Seitenleiste schließen' : 'Seitenleiste öffnen');
  }

  const isOpen = () => app.dataset.sidebar === 'open';

  // Startzustand: am Desktop offen, am Handy geschlossen
  setSidebar(!mobile.matches);

  toggle.addEventListener('click', () => setSidebar(!isOpen()));

  // Mobil: Klick auf den abgedunkelten Bereich, Escape oder ein Menülink schließt die Leiste
  backdrop.addEventListener('click', () => setSidebar(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobile.matches && isOpen()) {
      setSidebar(false);
      toggle.focus();
    }
  });

  document.querySelectorAll('.nav a').forEach((link) => {
    link.addEventListener('click', () => {
      if (mobile.matches) setSidebar(false);
    });
  });

  // Beim Wechsel zwischen Handy- und Desktop-Ansicht den passenden Startzustand setzen
  mobile.addEventListener('change', (e) => setSidebar(!e.matches));

function toggleTheme() {
  const dark = document.body.classList.toggle("dark");
  localStorage.setItem("fencraft-theme", dark ? "dark" : "light");
}

// Beim Laden der Seite gespeicherte Einstellung anwenden
if (localStorage.getItem("fencraft-theme") === "dark") {
  document.body.classList.add("dark");
}



const canvas = document.getElementById("game");

// Der Spiel-Code läuft nur, wenn auf der aktuellen Seite auch ein
// Canvas mit id="game" existiert (z. B. nur auf P1.html).
if (canvas) {
  // Nur auf dieser Seite (P1.html) das Scrollen komplett sperren,
  // damit WASD/Pfeiltasten das Auto steuern und nicht die Seite
  // scrollen, und man auch per Maus/Touch nicht runterscrollen kann.
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.documentElement.style.height = "100%";
  document.body.style.height = "100%";

  const ctx = canvas.getContext("2d");
  const main = canvas.closest("main");
  const dpr = window.devicePixelRatio || 1;

  const SIZE = 200; // Maximale Größe, in die die Texturen eingepasst werden
  let x = 190, y = 130;
  const startX = x, startY = y; // Startposition für den Reset-Button merken
  const keys = {};

  // Textur laden. Pfad relativ zur HTML-Datei (nicht absolut, sonst
  // funktioniert das Laden im Browser nicht) - Ordner IMG/Sprites/Car/
  // muss im Projektordner liegen, nicht auf dem Desktop.
  const texture = new Image();
  texture.onerror = () => console.warn("Konnte Textur nicht laden:", texture.src);
  texture.src = "IMG/Sprites/Car/chassie.png";

  // Separates Wheel-Sprite: eine Textur fürs Drehen (während Bewegung),
  // eine für den Stillstand.
  const wheelMoving = new Image();
  wheelMoving.onerror = () => console.warn("Konnte Textur nicht laden:", wheelMoving.src);
  wheelMoving.src = "IMG/Sprites/Car/wheelMoving.png";

  const wheelIdle = new Image();
  wheelIdle.onerror = () => console.warn("Konnte Textur nicht laden:", wheelIdle.src);
  wheelIdle.src = "IMG/Sprites/Car/wheelIdle.png";

  let isMoving = false;

  // Aktueller Blickwinkel des Blocks (in Radiant). Bleibt beim Stillstand
  // einfach auf dem zuletzt genutzten Wert stehen.
  let angle = Math.PI / 1; 


  // Merkt sich die zuletzt gesetzte CSS-Größe, damit wir nicht bei
  // jedem Frame unnötig neu skalieren.
  let lastW = 0, lastH = 0;

  function resizeCanvasIfNeeded() {
    const w = main.clientWidth;
    const h = main.clientHeight;
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;

    // Anzeigegröße (CSS)
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    // interne Zeichenauflösung (für scharfe Darstellung)
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Bewegungstasten, die gedrückt werden dürfen. e.key wird bei
  // Buchstaben normalisiert (kleingeschrieben), damit z. B. Feststell-
  // taste (Caps Lock) oder Groß-/Kleinschreibung die Steuerung nicht
  // blockiert. Zusätzlich wird für diese Tasten das Standardverhalten
  // des Browsers (Scrollen mit Pfeiltasten/Leertaste) unterdrückt.
  const movementKeys = new Set([
    "arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"
  ]);

  function normalizeKey(key) {
    return key.length === 1 ? key.toLowerCase() : key.toLowerCase();
  }

  document.addEventListener("keydown", e => {
    const k = normalizeKey(e.key);
    keys[k] = true;
    if (movementKeys.has(k)) e.preventDefault();
  });
  document.addEventListener("keyup", e => {
    keys[normalizeKey(e.key)] = false;
  });

  // ---------- Maussteuerung für das Auto ----------
  const steerButtonCar = document.getElementById("steerButtonCar");
  let mouseSteering = false;
  // Mausposition relativ zum Canvas (Startwert = aktuelle Autoposition)
  let mouseX = x, mouseY = y;

  function updateCarButtonLabel() {
    if (steerButtonCar) {
      steerButtonCar.textContent = mouseSteering ? "Maussteuerung: An" : "Maussteuerung: Aus";
    }
  }

  if (steerButtonCar) {
    steerButtonCar.addEventListener("click", () => {
      mouseSteering = !mouseSteering;
      updateCarButtonLabel();
    });
  }

  // ---------- Reset-Button für das Auto ----------
  const resetCarButton = document.getElementById("resetCarButton");
  if (resetCarButton) {
    resetCarButton.addEventListener("click", () => {
      x = startX;
      y = startY;
      angle = 2 * Math.PI / 2; // Startwinkel (nach links)
      isMoving = false;
      mouseSteering = false;
      updateCarButtonLabel();
    });
  }

  // Mausposition in Canvas-Koordinaten umrechnen (nicht in
  // Fenster-Koordinaten, da der Canvas skaliert/verschoben sein kann)
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  // Berechnet den Skalierungsfaktor, mit dem ein Bild in eine "maxSize"-Box
  // passt (größere Seite = maxSize), ohne das Seitenverhältnis zu verzerren.
  function computeFitScale(img, maxSize) {
    if (!(img.complete && img.naturalWidth > 0)) return null;
    return maxSize / Math.max(img.naturalWidth, img.naturalHeight);
  }

  // Liefert die TATSÄCHLICH gezeichnete Breite/Höhe des Autos (Chassis),
  // basierend auf dessen echtem Seitenverhältnis - statt der pauschalen
  // SIZE, die nur die größere Seite begrenzt. Wird für Positions- und
  // Rand-Berechnungen gebraucht, damit die Grenzen zum sichtbaren Bild
  // passen. Solange das Bild noch nicht geladen ist, SIZE x SIZE als
  // Notlösung.
  function getCarSize() {
    const scale = computeFitScale(texture, SIZE);
    if (!scale) return { w: SIZE, h: SIZE };
    return { w: texture.naturalWidth * scale, h: texture.naturalHeight * scale };
  }

  function update() {
    let dx = 0, dy = 0;

    if (mouseSteering) {
      // Automatische Fahrt in Richtung Mauszeiger: Richtung zur Maus
      // berechnen und normieren, damit die Geschwindigkeit konstant
      // bleibt (unabhängig von der Entfernung zur Maus).
      const { w: carW, h: carH } = getCarSize();
      const cx = x + carW / 2;
      const cy = y + carH / 2;
      const toX = mouseX - cx;
      const toY = mouseY - cy;
      const dist = Math.hypot(toX, toY);

      // Kurz vor dem Ziel anhalten, damit das Auto nicht zittert
      if (dist > 4) {
        dx = toX / dist;
        dy = toY / dist;
      }
    } else {
      if (keys["arrowup"] || keys["w"]) dy -= 1;
      if (keys["arrowdown"] || keys["s"]) dy += 1;
      if (keys["arrowleft"] || keys["a"]) dx -= 1;
      if (keys["arrowright"] || keys["d"]) dx += 1;
    }

    // Nur drehen, wenn sich der Block tatsächlich bewegt -
    // sonst bleibt er in der zuletzt geschauten Richtung stehen.
    isMoving = dx !== 0 || dy !== 0;
    if (isMoving) {
      angle = Math.atan2(dy, dx);
    }

    x += dx * 5;
    y += dy * 5;

    // Aktuelle "logische" Canvas-Größe (CSS-Pixel, nicht die skalierten)
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    // Echte Bildmaße statt der starren SIZE-Box verwenden.
    const { w: carW, h: carH } = getCarSize();

    // Links/rechts: wieder Wrap-around wie oben/unten.
    if (x + carW < 0) x = w;
    else if (x > w) x = -carW;

    // Oben/unten: Wrap-around.
    if (y + carH < 0) y = h;
    else if (y > h) y = -carH;
  }

  // Zeichnet ein Bild zentriert um den aktuellen Nullpunkt (nach translate)
  // mit einem vorgegebenen, für alle Sprites GLEICHEN Skalierungsfaktor.
  // Wichtig: Chassis und Rad müssen mit demselben Faktor gezeichnet werden,
  // sonst passen sie nicht zusammen, wenn sie unterschiedliche native
  // Pixelgrößen haben (z. B. chassie.png 1024x512, wheelMoving.png 800x800).
  function drawWithScale(img, scale) {
    if (!(img.complete && img.naturalWidth > 0) || !scale) return false;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    return true;
  }

  function draw() {
    // clearRect braucht die "logische" (CSS-)Größe, nicht die skalierte
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    const { w: carW, h: carH } = getCarSize();
    const cx = x + carW / 2;
    const cy = y + carH / 2;

    const wheelTexture = isMoving ? wheelMoving : wheelIdle;

    // Ein einziger Skalierungsfaktor für alles - abgeleitet vom Chassis.
    // Falls das Chassis noch nicht geladen ist, als Notlösung vom
    // aktuellen Rad-Bild ableiten, damit trotzdem etwas Sinnvolles
    // gezeichnet wird.
    const scale = computeFitScale(texture, SIZE) || computeFitScale(wheelTexture, SIZE);

    // --- Wheel-Sprite (unter dem Hauptblock) ---
    // Dreht sich mit der Blickrichtung des Autos mit (wie am Chassis
    // befestigt), aber ohne eigene zusätzliche Spin-Animation.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle + Math.PI);
    if (!drawWithScale(wheelTexture, scale)) {
      // Fallback, damit ein fehlendes Rad-Bild nicht einfach "unsichtbar"
      // ist, sondern klar erkennbar auffällt (halbtransparentes Rad-Oval).
      ctx.fillStyle = "rgba(255, 0, 255, 0.5)";
      ctx.beginPath();
      ctx.ellipse(0, 0, SIZE / 2, SIZE / 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // --- Hauptblock (dreht sich in Bewegungsrichtung) ---
    ctx.save();
    ctx.translate(cx, cy);
    // Offset richtet sich danach, wohin die Textur standardmäßig
    // (unrotiert) zeigt:
    //   zeigt sie nach rechts -> kein Offset (0)
    //   zeigt sie nach unten  -> - Math.PI / 2
    //   zeigt sie nach links  -> + Math.PI   (dein Fall)
    //   zeigt sie nach oben   -> + Math.PI / 2
    ctx.rotate(angle + Math.PI);

    if (!drawWithScale(texture, scale)) {
      // Fallback, solange das Bild noch lädt oder falls es fehlt
      ctx.fillStyle = "dodgerblue";
      ctx.fillRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);
    }

    ctx.restore();
  }

  function loop() {
    resizeCanvasIfNeeded(); // jeden Frame prüfen -> folgt auch der Sidebar-Animation
    update();
    draw();
    requestAnimationFrame(loop);
  }
  loop();
}

// ---------- Maussteuerung für den Kopf (nur auf P2.html vorhanden) ----------
const cubeContainer = document.getElementById("cubeContainer");
const cube          = document.getElementById("cube");

if (cubeContainer && cube) {
  let steering = false;

  // Ursprüngliche Stelle im DOM merken, damit der Kopf nach dem
  // Steuern wieder exakt dorthin zurückkommt.
  const originalParent = cubeContainer.parentNode;
  const originalNextSibling = cubeContainer.nextSibling;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // Positioniert den Container so, dass sein Mittelpunkt exakt auf
  // den übergebenen Bildschirmkoordinaten liegt (kein Nachlaufen).
  function positionAt(clientX, clientY) {
    const w = cubeContainer.offsetWidth;
    const h = cubeContainer.offsetHeight;
    cubeContainer.style.left = (clientX - w / 2) + "px";
    cubeContainer.style.top = (clientY - h / 2) + "px";
  }

  // Mausgeschwindigkeit (für die Kopfdrehung) und aktuelle Drehung
  let lastMouseX = null, lastMouseY = null;
  let velX = 0, velY = 0; // grobe Bewegungsgeschwindigkeit der Maus
  let rotX = 0, rotY = 0; // aktuelle Drehung des Kopfes

  function enableSteering(clickEvent) {
    steering = true;

    // WICHTIG: Der Kopf wird während der Steuerung direkt ins <body>
    // gehängt. Grund für den bisherigen Versatz nach rechts: ein
    // Vorfahre (.page) hat CSS "perspective" gesetzt, wodurch sich
    // "position: fixed" nicht mehr auf das ganze Browserfenster
    // bezieht, sondern auf .page - und .page sitzt wegen der
    // Sidebar nicht bei x=0. Direkt im body gibt es dieses Problem
    // nicht mehr, der Kopf liegt dann exakt auf dem Mauszeiger.
    document.body.appendChild(cubeContainer);

    cubeContainer.classList.add("free-drive");
    cube.classList.add("no-spin"); // Dauer-Rotation aus, Drehung übernimmt jetzt die Maus

    lastMouseX = null; // Geschwindigkeit neu beginnen, kein Sprung beim Start
    lastMouseY = null;
    velX = 0; velY = 0;

    if (clickEvent) positionAt(clickEvent.clientX, clickEvent.clientY);
  }

  function disableSteering() {
    steering = false;
    cubeContainer.classList.remove("free-drive");
    cube.classList.remove("no-spin");

    // Inline-Styles wieder entfernen, damit der Kopf wieder von
    // allein dreht und an seiner normalen Stelle sitzt.
    cubeContainer.style.left = "";
    cubeContainer.style.top = "";
    cube.style.transform = "";
    rotX = 0; rotY = 0; velX = 0; velY = 0;

    // Zurück an die ursprüngliche Stelle im DOM (auf Seite 2).
    if (originalNextSibling) {
      originalParent.insertBefore(cubeContainer, originalNextSibling);
    } else {
      originalParent.appendChild(cubeContainer);
    }
  }

  // Klick auf den Kopf selbst schaltet die Steuerung um. Die Klicks
  // werden hier gestoppt (stopPropagation), damit derselbe Klick nicht
  // sofort auch den "Klick daneben"-Listener unten auslöst.
  cube.addEventListener("click", (e) => {
    e.stopPropagation();
    if (steering) disableSteering();
    else enableSteering(e);
  });

  // Klick irgendwo anders auf der Seite beendet die Steuerung wieder -
  // sonst wäre es kaum möglich, den Kopf noch gezielt zu treffen,
  // um ihn zu stoppen.
  document.addEventListener("click", () => {
    if (steering) disableSteering();
  });

  // ---------- Reset-Button für den Kopf ----------
  const resetHeadButton = document.getElementById("resetHeadButton");
  if (resetHeadButton) {
    resetHeadButton.addEventListener("click", (e) => {
      e.stopPropagation(); // soll nicht gleichzeitig als "Klick daneben" zählen
      if (steering) disableSteering();
    });
  }

  // Kopf bleibt bei jeder Mausbewegung exakt zentriert auf dem
  // Mauszeiger - keine Verzögerung, kein Nachlaufen. Nebenbei wird
  // die aktuelle Bewegungsgeschwindigkeit der Maus gemessen, damit
  // der Kopf beim Bewegen zur jeweiligen Seite drehen kann.
  document.addEventListener("mousemove", (e) => {
    if (!steering) return;
    positionAt(e.clientX, e.clientY);

    if (lastMouseX !== null) {
      velX = e.clientX - lastMouseX;
      velY = e.clientY - lastMouseY;
    }
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  const maxTilt = 45;          // Grad - wie weit der Kopf sich maximal zur Seite dreht
  const tiltSensitivity = 3.5; // wie stark er auf die Mausgeschwindigkeit reagiert
  const smoothing = 0.25;      // wie zügig er der Zieldrehung folgt

  function rotationLoop() {
    if (steering) {
      const targetRotY = clamp(velX * tiltSensitivity, -maxTilt, maxTilt);
      const targetRotX = clamp(-velY * tiltSensitivity, -maxTilt, maxTilt);
      rotY += (targetRotY - rotY) * smoothing;
      rotX += (targetRotX - rotX) * smoothing;
      cube.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg)`;

      // Geschwindigkeit klingt von Frame zu Frame ab - bleibt die
      // Maus stehen, dreht sich der Kopf von selbst wieder gerade
      // nach vorn (schaut den Mauszeiger direkt an).
      velX *= 0.75;
      velY *= 0.75;
    }
    requestAnimationFrame(rotationLoop);
  }
  rotationLoop();
}