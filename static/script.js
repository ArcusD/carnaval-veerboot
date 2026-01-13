(() => {
    const FETCH_MS = 20000;
    const BIER_MS = 1500;
    const CONFIG_MS = 15000;

    const elKlok = document.getElementById('klok');
    const elLabel = document.getElementById('volgende-tekst');

    // Main elements
    const elWrap = document.getElementById('halte-wrap');
    const elHalte = document.getElementById('huidige-halte');

    // Sub elements
    const elPrev = document.getElementById('vorige-tekst');
    const elNext = document.getElementById('daarna-tekst');

    const elBierOverlay = document.getElementById('bier-overlay');
    const elBierNaam = document.getElementById('bier-naam-tekst');

    if (!elHalte || !elKlok) return;

    let haltes = [];
    let idx = 0;
    let lastJson = "";

    let rotateMs = 5500;
    let rotateTimer = null;

    const clean = (v) => (v ?? "").toString().trim();

    function updateKlok() {
        const nu = new Date();
        elKlok.textContent = nu.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    }

    // Schaalt tekst zodat het ALTIJD op 1 regel past
    function fitToBox(elText, elBox, minPx = 20) {
        if (!elText || !elBox) return;

        // Reset naar groot om te beginnen
        elText.style.fontSize = "300px";

        // Veiligheid: max iterations
        let safety = 50;

        // Kijken of het past, anders kleiner maken
        // We kijken vooral naar width (scrollWidth) omdat height meestal wel past door flex
        while (safety-- > 0) {
            // 40px marge voor de zekerheid
            const tooWide = elText.scrollWidth > (elBox.clientWidth - 40);
            const tooHigh = elText.scrollHeight > (elBox.clientHeight - 10);

            if (!tooWide && !tooHigh) break;

            const cur = parseFloat(getComputedStyle(elText).fontSize);
            if (!Number.isFinite(cur) || cur <= minPx) break;

            // Stapjes van 10% kleiner
            elText.style.fontSize = (cur * 0.90) + "px";
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
        } catch (e) { }
    }

    function render() {
        if (!Array.isArray(haltes) || haltes.length === 0) {
            elLabel.textContent = "Völgende sjtop";
            elHalte.textContent = "Gein sjtoppe";
            elPrev.textContent = "-";
            elNext.textContent = "-";
            fitToBox(elHalte, elWrap);
            return;
        }

        if (idx >= haltes.length) idx = 0;

        // Bereken indexen (loop rond)
        const n = haltes.length;
        const prevIdx = (idx - 1 + n) % n;
        const nextIdx = (idx + 1) % n;

        // Update tekst
        elLabel.textContent = "Völgende sjtop";
        elHalte.textContent = clean(haltes[idx]) || "—";

        elPrev.textContent = clean(haltes[prevIdx]);
        elNext.textContent = clean(haltes[nextIdx]);

        // Schaal de grote tekst
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
        } catch (e) { }
    }

    // start
    updateKlok();
    setInterval(updateKlok, 1000);

    fetchConfig();
    setInterval(fetchConfig, CONFIG_MS);

    fetchHaltes();
    setInterval(fetchHaltes, FETCH_MS);

    checkBierStatus();
    setInterval(checkBierStatus, BIER_MS);

    // Resize handler
    window.addEventListener('resize', () => {
        fitToBox(elHalte, elWrap);
    });

    // Visibility handler (voor als tabblad op achtergrond was)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            updateKlok();
            fetchConfig();
            fetchHaltes();
            checkBierStatus();
            requestAnimationFrame(() => fitToBox(elHalte, elWrap));
        }
    });

    // Initiele render
    render();
    startRotateTimer();
})();