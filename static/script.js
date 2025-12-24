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
    if (haltes.length === 0) {
        document.getElementById('huidige-halte').innerText = "Geen dienst";
        return;
    }

    // Zorg dat we niet crashen als de index te hoog is
    if (index >= haltes.length) index = 0;

    // Toon de tekst
    document.getElementById('huidige-halte').innerText = haltes[index];

    // Tel eentje op voor de volgende keer
    index++;
}

// 3. Een klokje (altijd fijn op een informatiebord)
function updateKlok() {
    const nu = new Date();
    // Zorgt voor 14:05 ipv 14:5
    const tijd = nu.toLocaleTimeString('nl-NL', {hour: '2-digit', minute:'2-digit'}); 
    document.getElementById('klok').innerText = tijd;
}

// --- DE START ---

// Start direct met data halen
updateData();

// Elke seconde de klok updaten
setInterval(updateKlok, 1000);

// Elke 5 seconden een nieuwe halte tonen
setInterval(roteerScherm, 5000);

// Elke 30 seconden checken of jij nieuwe haltes hebt toegevoegd in de admin
setInterval(updateData, 30000);