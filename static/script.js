(() => {
  const FETCH_MS  = 20000;
  const BIER_MS   = 1500;
  const CONFIG_MS = 15000;

  const elKlok   = document.getElementById('klok');
  const elLabel  = document.getElementById('volgende-tekst');

  const elWrap   = document.getElementById('halte-wrap');
  const elHalte  = document.getElementById('huidige-halte');

  const elRouteWin = document.getElementById('route-window');
  const elRouteLst = document.getElementById('halte-lijst');

  const elBierOverlay = document.getElementById('bier-overlay');
  const elBierNaam    = document.getElementById('bier-naam-tekst');

  if (!elHalte || !elKlok || !elRouteLst) return;

  let haltes = [];
  let idx = 0;
  let lastJson = "";
  let builtFor = "";

  let rotateMs = 5500;
  let rotateTimer = null;

  const clean = (v) => (v ?? "").toString().trim();

  function updateKlok() {
    const nu = new Date();
    elKlok.textContent = nu.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  }

  function fitToBox(elText, elBox, minPx = 18) {
    if (!elText || !elBox) return;
    elText.style.fontSize = "";
    let safety = 36;

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
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  function startRotateTimer() {
    if (rotateTimer) clearInterval(rotateTimer);
    rotateTimer = setInterval(rotate, rotateMs);
  }

  async function fetchConfig() {
    try {
      const r = await fetch('/api/config', { cache: 'no-store' });
      const cfg = await r.json();

      const newMs = Number(cfg?.rotate_ms);
      if (Number.isFinite(newMs) && newMs >= 1000 && newMs <= 60000 && newMs !== rotateMs) {
        rotateMs = newMs;
        startRotateTimer();
      }
    } catch (e) {
      // stil falen
    }
  }

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

    requestAnimationFrame(() => centerCurrent(true));
  }

  function centerCurrent(skipTransition = false) {
    if (!elRouteWin || !elRouteLst) return;
    const cur = elRouteLst.querySelector(`.route-item[data-idx="${idx}"]`);
    if (!cur) return;

    if (skipTransition) elRouteLst.style.transition = "none";
    else elRouteLst.style.transition = "";

    const centerY = elRouteWin.clientHeight / 2;
    const target = centerY - (cur.offsetTop + cur.offsetHeight / 2);
    elRouteLst.style.transform = `translate3d(0, ${target}px, 0)`;

    if (skipTransition) requestAnimationFrame(() => { elRouteLst.style.transition = ""; });
  }

  function markRoute() {
    const n = haltes.length || 0;
    const prev = n ? (idx - 1 + n) % n : -1;
    const next1 = n ? (idx + 1) % n : -1;
    const next2 = n ? (idx + 2) % n : -1;

    const items = elRouteLst.querySelectorAll('.route-item');
    items.forEach((li) => {
      li.classList.remove('is-prev','is-current','is-next','is-next2');
      const i = Number(li.dataset.idx);

      if (i === prev)  li.classList.add('is-prev');
      if (i === idx)   li.classList.add('is-current'); // dit is "völgende"
      if (i === next1) li.classList.add('is-next');
      if (i === next2) li.classList.add('is-next2');
    });
  }

  function render() {
    if (!Array.isArray(haltes) || haltes.length === 0) {
      elLabel.textContent = "Völgende sjtop";
      elHalte.textContent = "Gein sjtoppe";
      elRouteLst.innerHTML = "";
      fitToBox(elHalte, elWrap);
      return;
    }

    if (idx >= haltes.length) idx = 0;

    elLabel.textContent = "Völgende sjtop";
    elHalte.textContent = clean(haltes[idx]) || "—";

    buildRouteListIfNeeded();
    markRoute();
    centerCurrent(false);

    fitToBox(elHalte, elWrap);
  }

  function rotate() {
    if (!Array.isArray(haltes) || haltes.length === 0) return render();
    idx = (idx + 1) % haltes.length;
    pop(elHalte);
    render();
  }

  async function fetchHaltes() {
    try {
      const r = await fetch('/api/haltes', { cache: 'no-store' });
      const data = await r.json();
      if (!Array.isArray(data)) return;

      const json = JSON.stringify(data);
      if (json !== lastJson) {
        lastJson = json;
        haltes = data;
        builtFor = "";
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

  // start
  updateKlok();
  setInterval(updateKlok, 1000);

  fetchConfig();
  setInterval(fetchConfig, CONFIG_MS);

  fetchHaltes();
  setInterval(fetchHaltes, FETCH_MS);

  render();
  startRotateTimer();

  checkBierStatus();
  setInterval(checkBierStatus, BIER_MS);

  window.addEventListener('resize', () => {
    centerCurrent(true);
    fitToBox(elHalte, elWrap);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateKlok();
      fetchConfig();
      fetchHaltes();
      checkBierStatus();
      requestAnimationFrame(() => {
        centerCurrent(true);
        fitToBox(elHalte, elWrap);
      });
    }
  });
})();
