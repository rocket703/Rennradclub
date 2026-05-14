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
let eventOccurrences = [];

async function initCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;

    try {
        const path = window.location.pathname.includes('Sponsoren') ? '../events.json' : 'events.json';
        const resp = await fetch(path);
        if (!resp.ok) throw new Error('Datei nicht gefunden');
        allEvents = await resp.json();
    } catch (err) {
        console.warn('Kalender-Daten konnten nicht geladen werden (evtl. falsche Seite?)');
        allEvents = [];
    }

    eventOccurrences = buildOccurrences(allEvents);
    render();
    renderUpcomingEvents();
}

function buildOccurrences(events) {
    const occurrences = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxHorizon = new Date(today);
    maxHorizon.setMonth(maxHorizon.getMonth() + 12);

    for (const ev of events) {
        if (ev.datum) {
            occurrences.push({ ...ev, datum: ev.datum });
            continue;
        }

        if (!ev.startDatum) continue;

        const start = parseDate(ev.startDatum);
        if (!start) continue;

        const end = ev.endDatum ? parseDate(ev.endDatum) : new Date(start);
        if (!end) continue;
        if (end < start) continue;

        const frequency = (ev.frequency || ev.freq || '').toString().toLowerCase();

        if (frequency === 'weekly' || frequency === 'wöchentlich') {
            const occurrence = new Date(start);
            const titleMatch = ev.titel ? ev.titel.match(/^(.*?)(?:#\s*(\d+))\s*$/i) : null;
            const titleBase = titleMatch ? titleMatch[1].trim() : ev.titel;
            let counter = titleMatch ? parseInt(titleMatch[2], 10) : null;

            while (occurrence <= end && occurrence <= maxHorizon) {
                const occurrenceTitle = counter !== null ? `${titleBase} #${counter}` : ev.titel;
                occurrences.push({ ...ev, titel: occurrenceTitle, datum: formatDate(occurrence) });
                if (counter !== null) counter += 1;
                occurrence.setDate(occurrence.getDate() + 7);
            }
        } else {
            occurrences.push({ ...ev, datum: formatDate(start) });
        }
    }

    return occurrences.sort((a, b) => new Date(a.datum) - new Date(b.datum));
}

function parseDate(value) {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatReadable(dateString) {
    const date = parseDate(dateString);
    if (!date) return dateString;
    return date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
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

    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const eventsByDate = eventOccurrences.reduce((acc, event) => {
        if (event.datum && event.datum.startsWith(monthKey)) {
            acc[event.datum] = acc[event.datum] || [];
            acc[event.datum].push(event);
        }
        return acc;
    }, {});

    for (let i = 0; i < shift; i++) {
        grid.appendChild(document.createElement('div'));
    }

    for (let d = 1; d <= days; d++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.innerText = d;
        const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const matches = eventsByDate[dateKey];

        if (matches && matches.length > 0) {
            cell.classList.add('has-event');
            cell.onclick = (e) => { e.stopPropagation(); showDetails(matches); };
        }
        grid.appendChild(cell);
    }
}

function showDetails(matches) {
    const event = Array.isArray(matches) ? matches[0] : matches;
    const title = document.getElementById('eventTitle');
    if (title) title.innerText = event.titel;
    const desc = document.getElementById('eventDesc');
    if (desc) {
        const extra = Array.isArray(matches) && matches.length > 1 ? `\n\n+${matches.length - 1} weiterer Termin` : '';
        desc.innerText = `${event.description || event.info || ''}${extra}`;
    }
    const eventFooter = document.getElementById('eventFooter');
    if (eventFooter) {
        eventFooter.innerHTML = `
            <div class="footer-left">
                <div class="fact-item">
                    <img src="img/icons/calendar.svg" alt="Datum" />
                    <span>${formatReadable(event.datum)}</span>
                </div>
                <div class="fact-item">
                    <img src="img/icons/clock.svg" alt="Uhrzeit" />
                    <span>${event.time || '—'}</span>
                </div>
                <div class="fact-item">
                    <img src="img/icons/location.svg" alt="Ort" />
                    <span>${event.location || 'Ort offen'}</span>
                </div>
            </div>
            <div class="footer-right">
                ${event.kilometer ? `<div class="fact-item"><span>${event.kilometer} km</span></div>` : ''}
                ${event.tempo ? `<div class="fact-item"><span>${event.tempo} km/h</span></div>` : ''}
            </div>
        `;
    }
    const card = document.getElementById('calendarCard');
    if (card) card.classList.add('show-details');
}

function renderUpcomingEvents() {
    const container = document.getElementById('upcomingList');
    if (!container) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = eventOccurrences.filter(ev => {
        const evDate = parseDate(ev.datum);
        return evDate && evDate >= today;
    }).slice(0, 3);

    if (upcoming.length === 0) {
        container.innerHTML = '<div class="empty-state">Keine kommenden Termine vorhanden.</div>';
        return;
    }

    container.innerHTML = upcoming.map(ev => {
        return `
            <article class="upcoming-item">
                <div class="item-band"></div>
                <div class="upcoming-card-head">
                    <div>
                        <h4>${ev.titel}</h4>
                        <p class="item-subtitle">${ev.description || ev.info || ''}</p>
                    </div>
                </div>
                <div class="event-footer">
                    <div class="footer-left">
                        <div class="fact-item">
                            <img src="img/icons/calendar.svg" alt="Datum" />
                            <span>${formatReadable(ev.datum)}</span>
                        </div>
                        <div class="fact-item">
                            <img src="img/icons/clock.svg" alt="Uhrzeit" />
                            <span>${ev.time || '—'}</span>
                        </div>
                        <div class="fact-item">
                            <img src="img/icons/location.svg" alt="Ort" />
                            <span>${ev.location || 'Ort offen'}</span>
                        </div>
                    </div>
                    <div class="footer-right">
                        <div class="fact-item">
                            <span>${ev.kilometer || '—'} km</span>
                        </div>
                        <div class="fact-item">
                            <span>${ev.tempo || '—'} km/h</span>
                        </div>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

window.flipBack = function() {
    const card = document.getElementById('calendarCard');
    if (card) card.classList.remove('show-details');
};

// Event Listener für Kalender-Navigation
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

if (prevBtn) {
    prevBtn.onclick = () => { currentMonth.setMonth(currentMonth.getMonth() - 1); render(); };
}
if (nextBtn) {
    nextBtn.onclick = () => { currentMonth.setMonth(currentMonth.getMonth() + 1); render(); };
}

initCalendar();

// KONTAKTFORMULAR RESPONSE
const form = document.getElementById('registration-form');
const result = document.getElementById('result');

form.addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(form);
  const object = Object.fromEntries(formData);
  const json = JSON.stringify(object);

  result.innerHTML = "Bitte warten...";
  result.style.color = "var(--text-color)";

  fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
          },
          body: json
      })
      .then(async (response) => {
          let json = await response.json();
          if (response.status == 200) {
              result.innerHTML = "Vielen Dank! Deine Nachricht wurde erfolgreich versendet.";
              result.style.color = "#28a745";
              form.reset(); // Leert das Formular nach Erfolg
          } else {
              console.log(response);
              result.innerHTML = "Fehler: " + json.message;
              result.style.color = "#dc3545"; // Ein Fehler-Rot
          }
      })
      .catch(error => {
          console.log(error);
          result.innerHTML = "Etwas ist schiefgelaufen. Bitte versuche es später erneut.";
      })
      .then(function() {
          // Nachricht nach 5 Sekunden wieder ausblenden (optional)
          setTimeout(() => {
              result.innerHTML = "";
          }, 5000);
      });
});