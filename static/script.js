(() => {
    const FETCH_MS = 20000;
    const BIER_MS = 1500;
    const CONFIG_MS = 15000;

    const elHugeText = document.getElementById('huge-text');
    const elHugeWrap = document.getElementById('huge-wrap');
    const elPrevText = document.getElementById('prev-text');
    const elNextText = document.getElementById('next-text');
    const elBierOverlay = document.getElementById('bier-overlay');
    const elBierNaam = document.getElementById('bier-naam-tekst');

    // Header elementen voor resizing
    const elTitel = document.getElementById('titel');
    const elTitelContainer = document.getElementById('titel-container');

    if (!elHugeText) return;

    let haltes = [];
    let idx = 0;
    let lastJson = "";
    let rotateMs = 5500;
    let rotateTimer = null;

    const clean = (v) => (v ?? "").toString().trim();

    // Resize functie voor de hoofdhalte (bestaand)
    function fitToBox(elText, elBox, minPx = 40, maxPx = 500) {
        if (!elText || !elBox) return;
        elText.style.fontSize = maxPx + "px";
        let size = maxPx;
        const boxW = elBox.clientWidth * 0.96;
        const boxH = elBox.clientHeight * 0.90 || 200;
        while (size > minPx) {
            if (elText.scrollWidth <= boxW && elText.scrollHeight <= boxH) break;
            size = size * 0.90;
            elText.style.fontSize = size + "px";
        }
    }

    // NIEUWE resize functie specifiek voor de header titel
    function fitHeaderTitle() {
        if (!elTitel || !elTitelContainer) return;

        // Begin groot
        let size = 120; // Start pixels (ongeveer 7.5rem)
        elTitel.style.fontSize = size + "px";

        // De container breedte is de ruimte die overblijft naast het logo
        const availableW = elTitelContainer.clientWidth;
        const availableH = elTitelContainer.clientHeight;

        while (size > 16) { // Minimum grootte
            // Past het in de breedte én hoogte?
            if (elTitel.scrollWidth <= availableW && elTitel.scrollHeight <= availableH) {
                break;
            }
            size = size * 0.95; // Stapjes van 5% kleiner
            elTitel.style.fontSize = size + "px";
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

    function render() {
        const total = haltes.length;
        if (total === 0) {
            elHugeText.textContent = "Gein sjtoppe";
            elPrevText.textContent = "—";
            elNextText.textContent = "—";
            fitToBox(elHugeText, elHugeWrap);
            return;
        }

        if (idx >= total) idx = 0;

        elHugeText.textContent = clean(haltes[idx]) || "—";

        const idxPrev = ((idx - 1) % total + total) % total;
        elPrevText.textContent = clean(haltes[idxPrev]) || "—";

        const idxNext = (idx + 1) % total;
        elNextText.textContent = clean(haltes[idxNext]) || "—";

        requestAnimationFrame(() => {
            fitToBox(elHugeText, elHugeWrap);
        });
    }

    function rotate() {
        if (haltes.length === 0) return render();
        idx = (idx + 1) % haltes.length;
        pop(elHugeText);
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
                if (idx >= haltes.length) idx = 0;
                pop(elHugeText);
                render();
            }
        } catch (e) { }
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

    fetchConfig();
    setInterval(fetchConfig, CONFIG_MS);
    fetchHaltes();
    setInterval(fetchHaltes, FETCH_MS);
    render();
    startRotateTimer();
    checkBierStatus();
    setInterval(checkBierStatus, BIER_MS);

    // Initial header fit
    requestAnimationFrame(fitHeaderTitle);

    window.addEventListener('resize', () => {
        fitToBox(elHugeText, elHugeWrap);
        fitHeaderTitle();
    });
})();