let haltes = [];
let index = 0;

// 1. Haal de data op uit jouw Python backend
async function updateData() {
    try {
        const response = await fetch('/api/haltes');
        const nieuweHaltes = await response.json();
        
        // Alleen updaten als er data is
        if (nieuweHaltes.length > 0) {
            haltes = nieuweHaltes;
        }
    } catch (error) {
        console.error("Kon haltes niet laden:", error);
    }
}

// 2. Wissel van halte op het scherm
function roteerScherm() {
    // Als de lijst leeg is (geen haltes ingevoerd in admin)
    if (haltes.length === 0) {
        document.getElementById('huidige-halte').innerText = "Geine deens"; // Zittesj
        return;
    }

    // Zorg dat we niet crashen als de index te hoog is
    if (index >= haltes.length) index = 0;

    // Toon de tekst
    document.getElementById('huidige-halte').innerText = haltes[index];

    // Tel eentje op voor de volgende keer
    index++;
}

// 3. Een klokje
function updateKlok() {
    const nu = new Date();
    const tijd = nu.toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'}); 
    document.getElementById('klok').innerText = tijd;
}

// --- DE START ---

updateData();
setInterval(updateKlok, 1000);
setInterval(roteerScherm, 5000);
setInterval(updateData, 30000);