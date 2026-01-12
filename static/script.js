(() => {
  // === Instellingen ===
  const ROTATE_MS = 5500;   // hoe vaak sjtop wisselt
  const FETCH_MS  = 20000;  // hoe vaak sjtop-lies opnieuw van backend
  const BIER_MS   = 1500;   // bier-status check

  // === Elementen ===
  const elKlok   = document.getElementById('klok');
  const elLabel  = document.getElementById('volgende-tekst');

  const elWrap   = document.getElementById('halte-wrap');
  const elHalte  = document.getElementById('huidige-halte');

  const elRouteWin = document.getElementById('route-window');
  const elRouteLst = document.getElementById('halte-lijst');

  const elUp1 = document.getElementById('up1');
  const elUp2 = document.getElementById('up2');

  const elBierOverlay = document.getElementById('bier-overlay');
  const elBierNaam    = document.getElementById('bier-naam-tekst');

  if (!elHalte || !elKlok || !elRouteLst) return;

  let haltes = [];
  let idx = 0;
  let lastJson = "";
  let builtFor = "";

  const clean = (v) => (v ?? "").toString().trim();

  // === Kloek ===
  function updateKlok() {
    const nu = new Date();
    elKlok.textContent = nu.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  }

  // === Text-fit helper (voor lange sjtop-naome) ===
  function fitToBox(elText, elBox, minPx = 18) {
    if (!elText || !elBox) return;

    elText.style.fontSize = ""; // reset naar CSS clamp
    let safety = 34;

    while (safety-- > 0) {
      const tooWide  = elText.scrollWidth  > elBox.clientWidth;
      const tooHigh  = elText.scrollHeight > elBox.clientHeight;

      if (!tooWide && !tooHigh) break;

      const cur = parseFloat(getComputedStyle(elText).fontSize);
      if (!Number.isFinite(cur) || cur <= minPx) break;

      elText.style.fontSize = (cur * 0.92) + "px";
    }
  }

  function pop(el) {
    if (!el) return;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  // === Route-lijst bouwen ===
  function buildRouteListIfNeeded() {
    const key = JSON.stringify(haltes);
    if (key === builtFor) return;
    builtFor = key;

    elRouteLst.innerHTML = "";
    haltes.forEach((h, i) => {
      const li = document.createElement('li');
      li.className = 'route-item';
      li.dataset.idx = String(i);

      const span = document.createElement('span');
      span.className = 'txt';
      span.textContent = clean(h) || "—";

      li.appendChild(span);
      elRouteLst.appendChild(li);
    });

    // direct centreren (zonder animatie-jank bij eerste paint)
    requestAnimationFrame(() => centerCurrent(true));
  }

  // === Route centreren op current item ===
  function centerCurrent(skipTransition = false) {
    if (!elRouteWin || !elRouteLst) return;
    const cur = elRouteLst.querySelector(`.route-item[data-idx="${idx}"]`);
    if (!cur) return;

    if (skipTransition) {
      elRouteLst.style.transition = "none";
    } else {
      elRouteLst.style.transition = "";
    }

    const centerY = elRouteWin.clientHeight / 2;
    const target = centerY - (cur.offsetTop + cur.offsetHeight / 2);

    elRouteLst.style.transform = `translate3d(0, ${target}px, 0)`;

    if (skipTransition) {
      // transition terugzetten na 1 frame
      requestAnimationFrame(() => { elRouteLst.style.transition = ""; });
    }
  }

  function markRoute() {
    const items = elRouteLst.querySelectorAll('.route-item');
    items.forEach((li) => {
      li.classList.remove('is-current','is-next','is-next2');
      const i = Number(li.dataset.idx);
      if (i === idx) li.classList.add('is-current');
      if (haltes.length && i === ((idx + 1) % haltes.length)) li.classList.add('is-next');
      if (haltes.length && i === ((idx + 2) % haltes.length)) li.classList.add('is-next2');
    });
  }

  // === Render ===
  function render() {
    if (!Array.isArray(haltes) || haltes.length === 0) {
      elLabel.textContent = "Völgende sjtop";
      elHalte.textContent = "Gein sjtoppe";
      if (elUp1) elUp1.textContent = "—";
      if (elUp2) elUp2.textContent = "—";
      elRouteLst.innerHTML = "";
      fitToBox(elHalte, elWrap);
      return;
    }

    if (idx >= haltes.length) idx = 0;

    const current = clean(haltes[idx]) || "—";
    const next1 = clean(haltes[(idx + 1) % haltes.length]) || "—";
    const next2 = clean(haltes[(idx + 2) % haltes.length]) || "—";

    elLabel.textContent = "Völgende sjtop";
    elHalte.textContent = current;

    if (elUp1) elUp1.textContent = next1;
    if (elUp2) elUp2.textContent = next2;

    buildRouteListIfNeeded();
    markRoute();
    centerCurrent(false);

    // dynamisch fitten (current + upcoming)
    fitToBox(elHalte, elWrap);
    if (elUp1) fitToBox(elUp1, elUp1.parentElement, 16);
    if (elUp2) fitToBox(elUp2, elUp2.parentElement, 16);
  }

  function rotate() {
    if (!Array.isArray(haltes) || haltes.length === 0) {
      render();
      return;
    }
    idx = (idx + 1) % haltes.length;
    pop(elHalte);
    render();
  }

  // === Backend ophalen ===
  async function fetchHaltes() {
    try {
      const r = await fetch('/api/haltes', { cache: 'no-store' });
      const data = await r.json();
      if (!Array.isArray(data)) return;

      const json = JSON.stringify(data);
      if (json !== lastJson) {
        lastJson = json;
        haltes = data;
        builtFor = ""; // force rebuild
        idx = (haltes.length ? (idx % haltes.length) : 0);
        pop(elHalte);
        render();
      }
    } catch (e) {
      console.log("Kon sjtoppe neet laje:", e);
    }
  }

  async function checkBierStatus() {
    if (!elBierOverlay || !elBierNaam) return;

    try {
      const r = await fetch('/api/bier_status', { cache: 'no-store' });
      const data = await r.json();

      if (data && data.bier_modus === true) {
        elBierOverlay.style.display = 'flex';
        elBierNaam.textContent = clean(data.bier_haalder) || "IEMAND";
      } else {
        elBierOverlay.style.display = 'none';
      }
    } catch (e) {
      console.log("Kon bier-status neet checke:", e);
    }
  }

  // === Start ===
  updateKlok();
  setInterval(updateKlok, 1000);

  fetchHaltes();
  setInterval(fetchHaltes, FETCH_MS);

  render();
  setInterval(rotate, ROTATE_MS);

  checkBierStatus();
  setInterval(checkBierStatus, BIER_MS);

  window.addEventListener('resize', () => {
    centerCurrent(true);
    fitToBox(elHalte, elWrap);
    if (elUp1) fitToBox(elUp1, elUp1.parentElement, 16);
    if (elUp2) fitToBox(elUp2, elUp2.parentElement, 16);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateKlok();
      fetchHaltes();
      checkBierStatus();
      requestAnimationFrame(() => {
        centerCurrent(true);
        fitToBox(elHalte, elWrap);
      });
    }
  });
})();
