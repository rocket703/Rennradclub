// --- ALLGEMEINE SEITEN-LOGIK (Reveal & Menu) ---

// Reveal on Scroll: Macht Sektionen sichtbar
const revealElements = () => {
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(el => {
        const windowHeight = window.innerHeight;
        const revealTop = el.getBoundingClientRect().top;
        const revealPoint = 150;
        if (revealTop < windowHeight - revealPoint) {
            el.classList.add('active');
        }
    });
};

window.addEventListener('scroll', revealElements);
window.addEventListener('load', revealElements);

// Burger Menü Logik
const menuTrigger = document.getElementById('menu-trigger');
const mainNav = document.getElementById('main-nav');

if (menuTrigger && mainNav) {
    menuTrigger.onclick = () => {
        menuTrigger.classList.toggle('active');
        mainNav.classList.toggle('active');
    };
    document.querySelectorAll('.main-nav a').forEach(link => {
        link.onclick = () => {
            menuTrigger.classList.remove('active');
            mainNav.classList.remove('active');
        };
    });
}

// --- SCROLL-FELGEN LOGIK ---
window.addEventListener('scroll', () => {
    const rim = document.getElementById('rim-image');
    if (rim) {
        // Berechnet die Drehung basierend auf dem Scroll-Wert
        rim.style.transform = `rotate(${window.pageYOffset / 2}deg)`;
    }
});

// --- KALENDER-LOGIK (Nur ausführen, wenn Kalender-Elemente da sind) ---

let currentMonth = new Date();
let allEvents = [];

async function initCalendar() {
    // Wir prüfen, ob wir überhaupt auf einer Seite mit Kalender sind
    const grid = document.getElementById('calendarGrid');
    if (!grid) return; 

    try {
        // Pfad-Check: Wenn wir im Unterordner sind, müssen wir '../' davor setzen
        const path = window.location.pathname.includes('Sponsoren') ? '../events.json' : 'events.json';
        const resp = await fetch(path);
        if (!resp.ok) throw new Error("Datei nicht gefunden");
        allEvents = await resp.json();
        render();
    } catch (err) {
        console.warn("Kalender-Daten konnten nicht geladen werden (evtl. falsche Seite?)");
        render(); 
    }
}

function render() {
    const grid = document.getElementById('calendarGrid');
    const label = document.getElementById('monthDisplay');
    if (!grid || !label) return;

    grid.innerHTML = '';
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();

    label.innerText = currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

    const firstDay = new Date(y, m, 1).getDay();
    const shift = (firstDay === 0) ? 6 : firstDay - 1;
    const days = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < shift; i++) {
        grid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= days; d++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.innerText = d;
        const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const match = allEvents.find(e => e.datum === dateKey);
        if (match) {
            cell.classList.add('has-event');
            cell.onclick = (e) => { e.stopPropagation(); showDetails(match); };
        }
        grid.appendChild(cell);
    }
}

function showDetails(ev) {
    const title = document.getElementById('eventTitle');
    if(title) title.innerText = ev.titel;
    const date = document.getElementById('eventDate');
    if(date) date.innerText = ev.datum;
    const desc = document.getElementById('eventDesc');
    if(desc) desc.innerText = ev.info;
    
    const card = document.getElementById('calendarCard');
    if(card) card.classList.add('is-flipped');
}

window.flipBack = function() {
    const card = document.getElementById('calendarCard');
    if(card) card.classList.remove('is-flipped');
};

// Event Listener für Kalender-Navigation (Nur wenn Buttons da sind!)
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

if (prevBtn) {
    prevBtn.onclick = () => { currentMonth.setMonth(currentMonth.getMonth() - 1); render(); };
}
if (nextBtn) {
    nextBtn.onclick = () => { currentMonth.setMonth(currentMonth.getMonth() + 1); render(); };
}

initCalendar();