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
  const ctx = canvas.getContext("2d");
  const main = canvas.closest("main");
  const dpr = window.devicePixelRatio || 1;

  const SIZE = 400; // Maximale Größe, in die die Texturen eingepasst werden
  let x = 180, y = 140;
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
  let angle = 0;

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

  document.addEventListener("keydown", e => keys[e.key] = true);
  document.addEventListener("keyup", e => keys[e.key] = false);

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
    if (keys["ArrowUp"] || keys["w"]) dy -= 1;
    if (keys["ArrowDown"] || keys["s"]) dy += 1;
    if (keys["ArrowLeft"] || keys["a"]) dx -= 1;
    if (keys["ArrowRight"] || keys["d"]) dx += 1;

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