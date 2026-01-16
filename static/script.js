(() => {
    const FETCH_MS = 20000;
    const BIER_MS = 1500;
    const CONFIG_MS = 15000;

    const elLabel = document.getElementById('volgende-tekst');
    const elWrap = document.getElementById('halte-wrap');
    const elHalte = document.getElementById('huidige-halte');

    const elRouteWin = document.getElementById('route-window');
    const elRouteLst = document.getElementById('halte-lijst');

    const elBierOverlay = document.getElementById('bier-overlay');
    const elBierNaam = document.getElementById('bier-naam-tekst');

    if (!elHalte || !elRouteLst) return;

    let haltes = [];
    let idx = 0;
    let lastJson = "";
    let builtFor = "";

    let rotateMs = 5500;
    let rotateTimer = null;

    const clean = (v) => (v ?? "").toString().trim();

    // Functie om tekst passend te maken in een container (voor hoofdhalte én lijst)
    // minPx bepaalt hoe klein het mag worden
    function fitToBox(elText, elBox, minPx = 14, maxPx = 150) {
        if (!elText || !elBox) return;

        // Reset eerst naar redelijk groot
        elText.style.fontSize = maxPx + "px";

        // Binary search of simple loop om te verkleinen tot het past
        // We doen een simpele loop omlaag voor precisie
        let size = maxPx;

        // Extra veiligheid: gebruik scrollWidth vs clientWidth
        // Voor de lijst items (die flex zijn) moeten we naar de parent kijken
        const boxW = elBox.clientWidth;
        const boxH = elBox.clientHeight || 100; // fallback

        while (size > minPx) {
            // Check of het past. We geven wat marge (0.95)
            if (elText.scrollWidth <= boxW * 0.95 && elText.scrollHeight <= boxH) {
                break;
            }
            size = size * 0.90; // verklein met 10%
            elText.style.fontSize = size + "px";
        }
    }

    // Specifieke resize loop voor alle route items
    function resizeAllRouteItems() {
        const items = elRouteLst.querySelectorAll('.route-item');
        items.forEach(li => {
            const span = li.querySelector('.txt');
            // We gebruiken de LI als box. 
            // Omdat er pijltjes zijn (::before/::after), trekken we wat breedte af.
            // Pijlen zijn ong 1.2em. Laten we veilig rekenen.
            if (span) {
                // Reset
                span.style.fontSize = "3.5rem";
                // Check overflow
                let safety = 20;
                while (safety-- > 0) {
                    if (span.scrollWidth < li.clientWidth * 0.80) break; // 80% breedte ivm pijlen
                    const cur = parseFloat(getComputedStyle(span).fontSize);
                    if (cur < 12) break;
                    span.style.fontSize = (cur * 0.90) + "px";
                }
            }
        });
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

        // Meteen resizen na bouwen
        requestAnimationFrame(() => {
            resizeAllRouteItems();
            centerCurrent(true);
        });
    }

    function centerCurrent(skipTransition = false) {
        if (!elRouteWin || !elRouteLst) return;
        const cur = elRouteLst.querySelector(`.route-item[data-idx="${idx}"]`);
        if (!cur) return;

        elRouteLst.style.transition = skipTransition ? "none" : "";

        // Centreer de actieve item in het venster
        const centerY = elRouteWin.clientHeight / 2;
        const target = centerY - (cur.offsetTop + cur.offsetHeight / 2);
        elRouteLst.style.transform = `translate3d(0, ${target}px, 0)`;

        if (skipTransition) requestAnimationFrame(() => { elRouteLst.style.transition = ""; });
    }

    function markRoute() {
        const items = elRouteLst.querySelectorAll('.route-item');
        items.forEach((li) => {
            li.classList.remove('is-current');
            const i = Number(li.dataset.idx);
            if (i === idx) li.classList.add('is-current');
        });
    }

    function render() {
        if (!Array.isArray(haltes) || haltes.length === 0) {
            elLabel.textContent = "Völgende sjtop";
            elHalte.textContent = "Gein sjtoppe";
            elRouteLst.innerHTML = "";
            fitToBox(elHalte, elWrap, 20, 200);
            return;
        }

        if (idx >= haltes.length) idx = 0;

        elLabel.textContent = "Völgende sjtop";
        elHalte.textContent = clean(haltes[idx]) || "—";

        buildRouteListIfNeeded();
        markRoute();
        centerCurrent(false);

        // Resize hoofdbord
        fitToBox(elHalte, elWrap, 20, 300);
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
            console.log("Error:", e);
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

    // Init
    fetchConfig();
    setInterval(fetchConfig, CONFIG_MS);

    fetchHaltes();
    setInterval(fetchHaltes, FETCH_MS);

    render();
    startRotateTimer();

    checkBierStatus();
    setInterval(checkBierStatus, BIER_MS);

    window.addEventListener('resize', () => {
        resizeAllRouteItems();
        centerCurrent(true);
        fitToBox(elHalte, elWrap, 20, 300);
    });
})();