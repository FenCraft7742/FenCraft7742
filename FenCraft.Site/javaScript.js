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
    document.body.classList.toggle("dark");
}

function toggleTheme() {
  const dark = document.body.classList.toggle("dark");
  localStorage.setItem("fencraft-theme", dark ? "dark" : "light");
}

// Beim Laden der Seite gespeicherte Einstellung anwenden
if (localStorage.getItem("fencraft-theme") === "dark") {
  document.body.classList.add("dark");
}