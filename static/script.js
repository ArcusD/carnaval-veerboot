(() => {
    // Instellingen
    const FETCH_MS = 20000; // Checken voor nieuwe haltes lijst
    const BIER_MS = 1500;  // Checken voor bier alarm
    const CONFIG_MS = 15000; // Checken voor rotatie snelheid

    // Elementen ophalen (Nieuwe ID's)
    const elHugeText = document.getElementById('huge-text');
    const elHugeWrap = document.getElementById('huge-wrap');

    const elPrevText = document.getElementById('prev-text');
    const elNextText = document.getElementById('next-text');

    const elBierOverlay = document.getElementById('bier-overlay');
    const elBierNaam = document.getElementById('bier-naam-tekst');

    // Stop als belangrijke elementen missen
    if (!elHugeText || !elPrevText || !elNextText) {
        console.error("HTML elementen niet gevonden. Check index.html.");
        return;
    }

    // Status variabelen
    let haltes = [];
    let idx = 0;
    let lastJson = "";

    let rotateMs = 5500;
    let rotateTimer = null;

    // Hulpfunctie om tekst schoon te maken
    const clean = (v) => (v ?? "").toString().trim();

    // FUNCTIE: Tekst passend maken in een container
    // Alleen nodig voor de GROTE tekst
    function fitToBox(elText, elBox, minPx = 40, maxPx = 500) {
        if (!elText || !elBox) return;

        // Begin met een enorme lettergrootte
        elText.style.fontSize = maxPx + "px";

        let size = maxPx;
        // Gebruik de breedte van de container (minus wat padding veiligheid)
        const boxW = elBox.clientWidth * 0.96;
        const boxH = elBox.clientHeight * 0.90 || 200;

        // Simpele loop: maak kleiner zolang het niet past
        while (size > minPx) {
            // Check of de tekst breder of hoger is dan de container
            if (elText.scrollWidth <= boxW && elText.scrollHeight <= boxH) {
                break; // Het past!
            }
            // Maak 10% kleiner en probeer opnieuw
            size = size * 0.90;
            elText.style.fontSize = size + "px";
        }
    }

    // Animatie effect
    function pop(el) {
        el.classList.remove('pop');
        void el.offsetWidth; // Forceer repaint
        el.classList.add('pop');
    }

    // Timer beheer
    function startRotateTimer() {
        if (rotateTimer) clearInterval(rotateTimer);
        rotateTimer = setInterval(rotate, rotateMs);
    }

    // --- HOOFDFUNCTIE: Render de teksten ---
    function render() {
        const total = haltes.length;

        if (total === 0) {
            elHugeText.textContent = "Gein sjtoppe";
            elPrevText.textContent = "—";
            elNextText.textContent = "—";
            fitToBox(elHugeText, elHugeWrap);
            return;
        }

        // Zorg dat index geldig blijft
        if (idx >= total) idx = 0;

        // 1. Huidige (Grote) Halte
        elHugeText.textContent = clean(haltes[idx]) || "—";

        // 2. Vorige Halte (Index - 1). De modulo truc handelt negatieve getallen af.
        const idxPrev = ((idx - 1) % total + total) % total;
        elPrevText.textContent = clean(haltes[idxPrev]) || "—";

        // 3. Volgende Halte (Index + 1). Modulo handelt 'wraparound' naar 0 af.
        const idxNext = (idx + 1) % total;
        elNextText.textContent = clean(haltes[idxNext]) || "—";

        // Pas de grootte van de grote tekst aan
        // We wachten heel even zodat de browser de nieuwe tekstbreedte kent
        requestAnimationFrame(() => {
            fitToBox(elHugeText, elHugeWrap);
        });
    }

    // --- Rotatie Logica ---
    function rotate() {
        if (haltes.length === 0) return render();
        // Naar volgende index
        idx = (idx + 1) % haltes.length;
        // Animatie op de grote tekst
        pop(elHugeText);
        render();
    }

    // --- API Functies ---
    async function fetchHaltes() {
        try {
            const r = await fetch('/api/haltes', { cache: 'no-store' });
            const data = await r.json();
            if (!Array.isArray(data)) return;

            const json = JSON.stringify(data);
            // Alleen updaten als de lijst echt veranderd is
            if (json !== lastJson) {
                lastJson = json;
                haltes = data;
                // Reset index als de lijst korter is geworden
                if (idx >= haltes.length) idx = 0;

                pop(elHugeText);
                render();
            }
        } catch (e) { console.error("Fout bij haltes ophalen:", e); }
    }

    async function fetchConfig() {
        try {
            const r = await fetch('/api/config', { cache: 'no-store' });
            const cfg = await r.json();
            const newMs = Number(cfg?.rotate_ms);
            // Update snelheid alleen als het een geldige, nieuwe waarde is
            if (Number.isFinite(newMs) && newMs >= 1000 && newMs <= 60000 && newMs !== rotateMs) {
                rotateMs = newMs;
                startRotateTimer();
            }
        } catch (e) { }
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

    // --- Start alles op ---
    fetchConfig();
    setInterval(fetchConfig, CONFIG_MS);

    fetchHaltes();
    setInterval(fetchHaltes, FETCH_MS);

    // Initiële render
    render();
    startRotateTimer();

    checkBierStatus();
    setInterval(checkBierStatus, BIER_MS);

    // Resize tekst als het venster van grootte verandert
    window.addEventListener('resize', () => {
        fitToBox(elHugeText, elHugeWrap);
    });
})();