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
window.addEventListener('load', revealElements); // Check beim Laden

// Burger Menü Logik
const menuTrigger = document.getElementById('menu-trigger');
const mainNav = document.getElementById('main-nav');

if(menuTrigger && mainNav) {
    menuTrigger.onclick = () => {
        menuTrigger.classList.toggle('active');
        mainNav.classList.toggle('active');
    };
    // Menü schließen wenn ein Link geklickt wird
    document.querySelectorAll('.main-nav a').forEach(link => {
        link.onclick = () => {
            menuTrigger.classList.remove('active');
            mainNav.classList.remove('active');
        };
    });
}

// --- KALENDER-LOGIK ---

let currentMonth = new Date();
let allEvents = [];

async function initCalendar() {
    try {
        const resp = await fetch('events.json');
        if (!resp.ok) throw new Error("Datei nicht gefunden");
        allEvents = await resp.json();
        render();
    } catch (err) {
        console.error("Kalender-Fehler:", err);
        render(); 
    }
}

function render() {
    const grid = document.getElementById('calendarGrid');
    const label = document.getElementById('monthDisplay');
    if(!grid || !label) return;

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
            cell.onclick = (e) => {
                e.stopPropagation();
                showDetails(match);
            };
        }
        grid.appendChild(cell);
    }
}

function showDetails(ev) {
    document.getElementById('eventTitle').innerText = ev.titel;
    document.getElementById('eventDate').innerText = ev.datum;
    document.getElementById('eventDesc').innerText = ev.info;
    const card = document.getElementById('calendarCard');
    if(card) card.classList.add('is-flipped');
}

function flipBack() {
    const card = document.getElementById('calendarCard');
    if(card) card.classList.remove('is-flipped');
}

document.getElementById('prevBtn').onclick = () => { currentMonth.setMonth(currentMonth.getMonth() - 1); render(); };
document.getElementById('nextBtn').onclick = () => { currentMonth.setMonth(currentMonth.getMonth() + 1); render(); };

initCalendar();
// --- SCROLL-FELGEN LOGIK ---
window.addEventListener('scroll', () => {
    const rim = document.getElementById('rim-image');
    if (rim) {
        // Die Zahl (2) bestimmt, wie schnell sich die Felge dreht. 
        // Höhere Zahl = langsamere Drehung.
        rim.style.transform = `rotate(${window.pageYOffset / 2}deg)`;
    }
});