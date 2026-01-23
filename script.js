document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menu-trigger');
    const mainNav = document.getElementById('main-nav');
    const rim = document.getElementById('rim-image');

    menuBtn.onclick = () => {
        menuBtn.classList.toggle('active');
        mainNav.classList.toggle('active');
    };

    document.querySelectorAll('.main-nav a').forEach(link => {
        link.onclick = () => {
            menuBtn.classList.remove('active');
            mainNav.classList.remove('active');
        };
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('active');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    window.onscroll = () => {
        if (rim) rim.style.transform = `rotate(${window.pageYOffset / 2}deg)`;
    };

    document.querySelectorAll('.event-card').forEach(card => {
        card.onclick = () => card.classList.toggle('is-flipped');
    });
});
// KALENDER MIT ANTEHENDEN EVENTS
let currentMonth = new Date();
let allEvents = [];

// Diese Funktion startet alles
async function initCalendar() {
    try {
        const response = await fetch('events.json');
        if (!response.ok) throw new Error("JSON konnte nicht geladen werden");
        allEvents = await response.json();
        console.log("Daten geladen:", allEvents);
        render();
    } catch (err) {
        console.error(err);
        document.getElementById('monthDisplay').innerText = "Fehler beim Laden";
        // Trotz Fehler leeren Kalender zeichnen
        render(); 
    }
}

function render() {
    const grid = document.getElementById('calendarGrid');
    const display = document.getElementById('monthDisplay');
    grid.innerHTML = '';

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    display.innerText = currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const shift = (firstDay === 0) ? 6 : firstDay - 1; // Montag als Wochenstart
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 1. Leere Zellen für Vormonat
    for (let i = 0; i < shift; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell';
        grid.appendChild(empty);
    }

    // 2. Echte Tage zeichnen
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.innerText = d;

        // Datum für Abgleich bauen (Format: YYYY-MM-DD)
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        const found = allEvents.find(e => e.datum === dateKey);
        if (found) {
            cell.classList.add('has-event');
            cell.onclick = () => showEvent(found);
        }

        grid.appendChild(cell);
    }
}

function showEvent(ev) {
    document.getElementById('eventTitle').innerText = ev.titel;
    document.getElementById('eventDate').innerText = ev.datum;
    document.getElementById('eventDesc').innerText = ev.info;
    document.getElementById('calendarCard').classList.add('flipped');
}

function flipBack() {
    document.getElementById('calendarCard').classList.remove('flipped');
}

// Button-Events
document.getElementById('prevBtn').onclick = () => { currentMonth.setMonth(currentMonth.getMonth() - 1); render(); };
document.getElementById('nextBtn').onclick = () => { currentMonth.setMonth(currentMonth.getMonth() + 1); render(); };

// Startschuss
initCalendar();