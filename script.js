/* =========================================================
   Radsportclub Magdeburg e.V. – Website-Script
   ========================================================= */

(() => {
    "use strict";

    /* ---------------------------------------------------------
       GRUNDLAGEN / PFADE
       --------------------------------------------------------- */

    const currentScript = document.currentScript;
    const siteRoot = currentScript?.src
        ? new URL(".", currentScript.src)
        : new URL(".", window.location.href);

    const assetUrl = (path) => new URL(path, siteRoot).href;
    const eventsUrl = new URL("events.json", siteRoot).href;

    const DAY_MS = 24 * 60 * 60 * 1000;

    function startOfDay(date) {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
    }

    function parseDate(value) {
        if (!value || typeof value !== "string") return null;

        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return null;

        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);

        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month ||
            date.getDate() !== day
        ) {
            return null;
        }

        return date;
    }

    function formatDate(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function formatReadable(dateString) {
        const date = parseDate(dateString);
        if (!date) return dateString || "";

        return date.toLocaleDateString("de-DE", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    /* ---------------------------------------------------------
       REVEAL ON SCROLL
       --------------------------------------------------------- */

    const reveals = document.querySelectorAll(".reveal");

    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("active");
                    observer.unobserve(entry.target);
                });
            },
            {
                threshold: 0.08,
                rootMargin: "0px 0px -70px 0px"
            }
        );

        reveals.forEach((element) => revealObserver.observe(element));
    } else {
        reveals.forEach((element) => element.classList.add("active"));
    }


    /* ---------------------------------------------------------
       MOBILE NAVIGATION
       --------------------------------------------------------- */

    const menuTrigger = document.getElementById("menu-trigger");
    const mainNav = document.getElementById("main-nav");

    function closeMenu() {
        if (!menuTrigger || !mainNav) return;

        menuTrigger.classList.remove("active");
        mainNav.classList.remove("active");
        menuTrigger.setAttribute("aria-expanded", "false");
        menuTrigger.setAttribute("aria-label", "Menü öffnen");
    }

    function openMenu() {
        if (!menuTrigger || !mainNav) return;

        menuTrigger.classList.add("active");
        mainNav.classList.add("active");
        menuTrigger.setAttribute("aria-expanded", "true");
        menuTrigger.setAttribute("aria-label", "Menü schließen");
    }

    if (menuTrigger && mainNav) {
        menuTrigger.addEventListener("click", () => {
            const isOpen = mainNav.classList.contains("active");
            isOpen ? closeMenu() : openMenu();
        });

        mainNav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                if (window.innerWidth <= 1023) {
                    closeMenu();
                }
            });
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeMenu();
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth >= 1024) {
                closeMenu();
            }
        });
    }


    /* ---------------------------------------------------------
       SCROLL-FELGE
       --------------------------------------------------------- */

    const rim = document.getElementById("rim-image");
    let scrollFrame = null;

    if (rim) {
        const updateRim = () => {
            rim.style.transform = `rotate(${window.scrollY / 2}deg)`;
            scrollFrame = null;
        };

        window.addEventListener(
            "scroll",
            () => {
                if (scrollFrame !== null) return;
                scrollFrame = window.requestAnimationFrame(updateRim);
            },
            { passive: true }
        );

        updateRim();
    }


    /* ---------------------------------------------------------
       KALENDER
       --------------------------------------------------------- */

    const calendarGrid = document.getElementById("calendarGrid");
    const monthDisplay = document.getElementById("monthDisplay");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const upcomingList = document.getElementById("upcomingList");

    let allEvents = [];
    let currentMonth = new Date();
    currentMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
    );

    /**
     * Erzeugt nur die Termine, die für den angeforderten Zeitraum gebraucht
     * werden. Dadurch können wöchentliche Termine ohne endDatum unbegrenzt
     * weiterlaufen, ohne tausende zukünftige Einträge vorzuberechnen.
     */
    function getOccurrencesForRange(events, rangeStart, rangeEnd) {
        const occurrences = [];
        const from = startOfDay(rangeStart);
        const to = startOfDay(rangeEnd);

        for (const event of events) {
            // Einmaliger Termin
            if (event.datum) {
                const date = parseDate(event.datum);
                if (date && date >= from && date <= to) {
                    occurrences.push({
                        ...event,
                        datum: formatDate(date)
                    });
                }
                continue;
            }

            // Wiederkehrender Termin
            if (!event.startDatum) continue;

            const start = parseDate(event.startDatum);
            if (!start) continue;

            const frequency = String(event.frequency || event.freq || "")
                .trim()
                .toLowerCase();

            const explicitEnd = event.endDatum
                ? parseDate(event.endDatum)
                : null;

            if (explicitEnd && explicitEnd < start) continue;

            if (frequency === "weekly" || frequency === "wöchentlich") {
                const seriesEnd = explicitEnd && explicitEnd < to
                    ? explicitEnd
                    : to;

                if (seriesEnd < from || start > to) continue;

                let occurrence = new Date(start);

                // Direkt zum ersten möglichen Termin im gewünschten Zeitraum springen.
                if (occurrence < from) {
                    const daysSinceStart = Math.floor(
                        (from.getTime() - start.getTime()) / DAY_MS
                    );
                    const weeksToSkip = Math.floor(daysSinceStart / 7);
                    occurrence.setDate(
                        occurrence.getDate() + weeksToSkip * 7
                    );

                    while (occurrence < from) {
                        occurrence.setDate(occurrence.getDate() + 7);
                    }
                }

                while (occurrence <= seriesEnd && occurrence <= to) {
                    occurrences.push({
                        ...event,
                        datum: formatDate(occurrence)
                    });

                    occurrence = new Date(occurrence);
                    occurrence.setDate(occurrence.getDate() + 7);
                }

                continue;
            }

            // Ohne bekannte Wiederholungsregel wird startDatum als Einzeltermin behandelt.
            if (start >= from && start <= to) {
                occurrences.push({
                    ...event,
                    datum: formatDate(start)
                });
            }
        }

        return occurrences.sort((a, b) => {
            const dateCompare = parseDate(a.datum) - parseDate(b.datum);
            if (dateCompare !== 0) return dateCompare;
            return String(a.time || "").localeCompare(String(b.time || ""), "de");
        });
    }

    async function initCalendar() {
        if (!calendarGrid) return;

        try {
            const response = await fetch(eventsUrl, {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error("events.json enthält kein Array.");
            }

            allEvents = data;
        } catch (error) {
            console.warn("Kalender-Daten konnten nicht geladen werden:", error);
            allEvents = [];

            if (upcomingList) {
                upcomingList.innerHTML =
                    '<div class="empty-state">Termine konnten gerade nicht geladen werden.</div>';
            }
        }

        renderCalendar();
        renderUpcomingEvents();
    }

    function renderCalendar() {
        if (!calendarGrid || !monthDisplay) return;

        calendarGrid.innerHTML = "";

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);

        const occurrences = getOccurrencesForRange(
            allEvents,
            monthStart,
            monthEnd
        );

        monthDisplay.textContent = currentMonth.toLocaleDateString("de-DE", {
            month: "long",
            year: "numeric"
        });

        const firstDay = monthStart.getDay();
        const shift = firstDay === 0 ? 6 : firstDay - 1;
        const daysInMonth = monthEnd.getDate();

        const eventsByDate = occurrences.reduce((result, event) => {
            if (!result[event.datum]) {
                result[event.datum] = [];
            }

            result[event.datum].push(event);
            return result;
        }, {});

        for (let i = 0; i < shift; i += 1) {
            const spacer = document.createElement("div");
            spacer.className = "day-cell day-cell-empty";
            spacer.setAttribute("aria-hidden", "true");
            calendarGrid.appendChild(spacer);
        }

        const todayKey = formatDate(startOfDay(new Date()));

        for (let day = 1; day <= daysInMonth; day += 1) {
            const cell = document.createElement("div");
            const dateKey = formatDate(new Date(year, month, day));
            const matches = eventsByDate[dateKey] || [];

            cell.className = "day-cell";
            cell.textContent = String(day);

            if (dateKey === todayKey) {
                cell.classList.add("is-today");
            }

            if (matches.length > 0) {
                cell.classList.add("has-event");
                cell.setAttribute("role", "button");
                cell.setAttribute("tabindex", "0");
                cell.setAttribute(
                    "aria-label",
                    `${formatReadable(dateKey)}: ${matches.map((event) => event.titel).join(", ")}`
                );

                const openDetails = (event) => {
                    event.stopPropagation();
                    showDetails(matches);
                };

                cell.addEventListener("click", openDetails);
                cell.addEventListener("keydown", (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetails(event);
                    }
                });
            }

            calendarGrid.appendChild(cell);
        }
    }

    function eventFactsHtml(event, includeDate = true) {
        const left = [];
        const right = [];

        if (includeDate && event.datum) {
            left.push(`
                <div class="fact-item">
                    <img src="${assetUrl("img/icons/calendar.svg")}" alt="" />
                    <span>${escapeHtml(formatReadable(event.datum))}</span>
                </div>
            `);
        }

        if (event.time) {
            left.push(`
                <div class="fact-item">
                    <img src="${assetUrl("img/icons/clock.svg")}" alt="" />
                    <span>${escapeHtml(event.time)}</span>
                </div>
            `);
        }

        if (event.location) {
            left.push(`
                <div class="fact-item">
                    <img src="${assetUrl("img/icons/location.svg")}" alt="" />
                    <span>${escapeHtml(event.location)}</span>
                </div>
            `);
        }

        if (event.kilometer) {
            right.push(`
                <div class="fact-item">
                    <span>${escapeHtml(event.kilometer)} km</span>
                </div>
            `);
        }

        if (event.tempo) {
            right.push(`
                <div class="fact-item">
                    <span>${escapeHtml(event.tempo)} km/h</span>
                </div>
            `);
        }

        return `
            <div class="footer-left">${left.join("")}</div>
            ${right.length > 0 ? `<div class="footer-right">${right.join("")}</div>` : ""}
        `;
    }

    function showDetails(matches) {
        const events = Array.isArray(matches) ? matches : [matches];
        if (events.length === 0) return;

        const title = document.getElementById("eventTitle");
        const desc = document.getElementById("eventDesc");
        const eventFooter = document.getElementById("eventFooter");
        const card = document.getElementById("calendarCard");

        if (events.length === 1) {
            const event = events[0];

            if (title) title.textContent = event.titel || "Termin";
            if (desc) {
                desc.textContent = event.description || event.info || "";
            }
            if (eventFooter) {
                eventFooter.innerHTML = eventFactsHtml(event);
            }
        } else {
            if (title) {
                title.textContent = `${events.length} Termine`;
            }

            if (desc) {
                desc.textContent = events
                    .map((event) => {
                        const time = event.time ? ` (${event.time})` : "";
                        return `${event.titel || "Termin"}${time}`;
                    })
                    .join("\n");
            }

            if (eventFooter) {
                const first = events[0];
                eventFooter.innerHTML = `
                    <div class="footer-left">
                        <div class="fact-item">
                            <img src="${assetUrl("img/icons/calendar.svg")}" alt="" />
                            <span>${escapeHtml(formatReadable(first.datum))}</span>
                        </div>
                    </div>
                `;
            }
        }

        card?.classList.add("show-details");
    }

    function renderUpcomingEvents() {
        if (!upcomingList) return;

        const today = startOfDay(new Date());

        // Genug Vorlauf für Einzeltermine; wöchentliche Termine werden trotzdem
        // nur für diesen Bereich erzeugt und laufen in der Kalendernavigation
        // unbegrenzt weiter.
        const horizon = new Date(today);
        horizon.setFullYear(horizon.getFullYear() + 2);

        const upcoming = getOccurrencesForRange(
            allEvents,
            today,
            horizon
        ).slice(0, 3);

        if (upcoming.length === 0) {
            upcomingList.innerHTML =
                '<div class="empty-state">Keine kommenden Termine vorhanden.</div>';
            return;
        }

        upcomingList.innerHTML = upcoming
            .map((event) => `
                <article class="upcoming-item">
                    <div class="item-band" aria-hidden="true"></div>

                    <div class="upcoming-card-head">
                        <div>
                            <h4>${escapeHtml(event.titel || "Termin")}</h4>
                            <p class="item-subtitle">
                                ${escapeHtml(event.description || event.info || "")}
                            </p>
                        </div>
                    </div>

                    <div class="event-footer">
                        ${eventFactsHtml(event)}
                    </div>
                </article>
            `)
            .join("");
    }

    window.flipBack = function flipBack() {
        document
            .getElementById("calendarCard")
            ?.classList.remove("show-details");
    };

    prevBtn?.setAttribute("aria-label", "Vorheriger Monat");
    nextBtn?.setAttribute("aria-label", "Nächster Monat");

    prevBtn?.addEventListener("click", () => {
        currentMonth = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() - 1,
            1
        );
        renderCalendar();
    });

    nextBtn?.addEventListener("click", () => {
        currentMonth = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + 1,
            1
        );
        renderCalendar();
    });

    initCalendar();


    /* ---------------------------------------------------------
       KONTAKTFORMULAR
       --------------------------------------------------------- */

    const form = document.getElementById("registration-form");
    const result = document.getElementById("result");
    const submitButton = document.getElementById("submit-btn");

    if (form && result) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const originalButtonText = submitButton?.textContent || "Absenden";

            result.textContent = "Bitte warten …";
            result.style.color = "var(--black)";

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Wird gesendet …";
            }

            try {
                const formData = new FormData(form);
                const payload = Object.fromEntries(formData.entries());

                const response = await fetch(
                    "https://api.web3forms.com/submit",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify(payload)
                    }
                );

                const responseData = await response.json();

                if (!response.ok) {
                    throw new Error(
                        responseData?.message || "Die Nachricht konnte nicht versendet werden."
                    );
                }

                result.textContent =
                    "Vielen Dank! Deine Nachricht wurde erfolgreich versendet.";
                result.style.color = "#28a745";
                form.reset();
            } catch (error) {
                console.error("Kontaktformular:", error);
                result.textContent =
                    "Etwas ist schiefgelaufen. Bitte versuche es später erneut.";
                result.style.color = "#dc3545";
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }

                window.setTimeout(() => {
                    result.textContent = "";
                }, 5000);
            }
        });
    }
})();
