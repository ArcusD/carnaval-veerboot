(() => {
  // === Instellingen ===
  const ROTATE_MS = 5500;   // hoe vaak sjtop wisselt
  const FETCH_MS  = 20000;  // hoe vaak lijst opnieuw van backend
  const BIER_MS   = 1500;   // bier-status check

  // === Elementen ===
  const elKlok   = document.getElementById('klok');
  const elLabel  = document.getElementById('volgende-tekst');
  const elHalte  = document.getElementById('huidige-halte');
  const elWrap   = document.getElementById('halte-wrap');
  const elKomLbl = document.getElementById('komend-label');
  const elKomLst = document.getElementById('komende-lijst');

  const elBierOverlay = document.getElementById('bier-overlay');
  const elBierNaam    = document.getElementById('bier-naam-tekst');

  if (!elHalte || !elKlok) return; // safety

  let haltes = [];
  let idx = 0;
  let lastJson = "";

  // === Helpers ===
  const clean = (v) => (v ?? "").toString().trim();

  function updateKlok() {
    const nu = new Date();
    elKlok.textContent = nu.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  }

  function popHalte() {
    elHalte.classList.remove('pop');
    // force reflow om animatie opnieuw te triggeren
    void elHalte.offsetWidth;
    elHalte.classList.add('pop');
  }

  function setUpcoming(items) {
    if (!elKomLst) return;
    elKomLst.innerHTML = "";

    const filled = items.filter(Boolean);
    const show = filled.length ? filled : ["—", "—", "—"];

    show.slice(0, 3).forEach((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      elKomLst.appendChild(li);
    });
  }

  // Text-fit: als 't te lang is, verklein automatisch tot 't past
  function fitText() {
    if (!elWrap) return;

    elHalte.style.fontSize = ""; // reset (laat CSS clamp starten)
    let safety = 26;

    while (safety-- > 0) {
      const tooWide  = elHalte.scrollWidth  > elWrap.clientWidth;
      const tooHigh  = elHalte.scrollHeight > elWrap.clientHeight;

      if (!tooWide && !tooHigh) break;

      const cur = parseFloat(getComputedStyle(elHalte).fontSize);
      if (!Number.isFinite(cur) || cur < 18) break;
      elHalte.style.fontSize = (cur * 0.92) + "px";
    }
  }

  function render() {
    if (!Array.isArray(haltes) || haltes.length === 0) {
      elLabel.textContent = "Völgende sjtop";
      elHalte.textContent = "Gein sjtoppe";
      if (elKomLbl) elKomLbl.textContent = "Dao nao:";
      setUpcoming([]);
      fitText();
      return;
    }

    if (idx >= haltes.length) idx = 0;

    const current = clean(haltes[idx]) || "—";
    elLabel.textContent = "Völgende sjtop";
    elHalte.textContent = current;

    // Volgende 3 sjtoppe
    const next = [];
    for (let i = 1; i <= 3; i++) {
      next.push(clean(haltes[(idx + i) % haltes.length]));
    }
    if (elKomLbl) elKomLbl.textContent = "Dao nao:";
    setUpcoming(next);

    fitText();
  }

  function rotate() {
    if (!Array.isArray(haltes) || haltes.length === 0) {
      render();
      return;
    }
    idx = (idx + 1) % haltes.length;
    popHalte();
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
        idx = (haltes.length ? (idx % haltes.length) : 0);
        popHalte();
        render();
      }
    } catch (e) {
      // stil falen: scherm mot doorblieve loepe
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

  window.addEventListener('resize', fitText);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateKlok();
      fetchHaltes();
      checkBierStatus();
      setTimeout(fitText, 50);
    }
  });
})();
