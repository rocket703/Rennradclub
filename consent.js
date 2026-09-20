/* =========================================================
   Cookie-Banner (Klaro, selbst gehostet)
   Schalter: true  = Banner sichtbar
             false = unsichtbar, kein Consent-Cookie,
                     OpenStreetMap lädt auf der Fotomap wie bisher
   Trotzdem anzeigen: ?consent=1 an die URL hängen
   ========================================================= */

(() => {
    "use strict";

    const CONSENT_BANNER_VISIBLE = false;

    const currentScript = document.currentScript;
    const siteRoot = currentScript?.src
        ? new URL(".", currentScript.src)
        : new URL(".", window.location.href);

    const forceShow = new URLSearchParams(window.location.search).get("consent") === "1";
    const visible = CONSENT_BANNER_VISIBLE || forceShow;
    const privacyUrl = new URL("Datenschutz/", siteRoot).href;
    const leafletVersion = "1.9.4";

    let leafletLoading = null;
    const consentListeners = new Set();

    function dispatchConsentChange() {
        document.dispatchEvent(new CustomEvent("rcm-consent-change"));
        consentListeners.forEach((listener) => listener());
    }

    function loadLeaflet() {
        if (window.L) {
            return Promise.resolve(window.L);
        }

        if (leafletLoading) {
            return leafletLoading;
        }

        leafletLoading = new Promise((resolve, reject) => {
            const css = document.createElement("link");
            css.rel = "stylesheet";
            css.href = `https://unpkg.com/leaflet@${leafletVersion}/dist/leaflet.css`;
            document.head.appendChild(css);

            const script = document.createElement("script");
            script.src = `https://unpkg.com/leaflet@${leafletVersion}/dist/leaflet.js`;
            script.onload = () => resolve(window.L);
            script.onerror = () => reject(new Error("Leaflet konnte nicht geladen werden."));
            document.head.appendChild(script);
        });

        return leafletLoading;
    }

    function osmAllowed() {
        if (!visible) {
            return true;
        }

        const manager = window.klaro?.getManager?.();
        return Boolean(manager?.getConsent?.("osm"));
    }

    window.RCM_CONSENT = {
        visible,
        privacyUrl,
        showSettings() {
            window.klaro?.show?.();
        },
        osmAllowed,
        whenOsmAllowed(onAllow, onDeny) {
            let started = false;
            let denied = false;

            const apply = () => {
                if (osmAllowed()) {
                    if (started) {
                        return;
                    }
                    started = true;
                    loadLeaflet().then(onAllow).catch((error) => {
                        console.error(error);
                        onDeny?.();
                    });
                    return;
                }

                if (!denied) {
                    denied = true;
                    onDeny?.();
                }
            };

            consentListeners.add(apply);
            apply();
        }
    };

    if (!visible) {
        return;
    }

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = new URL("consent.css", siteRoot).href;
    document.head.appendChild(css);

    window.klaroConfig = {
        version: 1,
        elementID: "klaro",
        additionalClass: "rcm-klaro",
        storageMethod: "cookie",
        cookieName: "klaro",
        cookieExpiresAfterDays: 365,
        default: false,
        mustConsent: false,
        acceptAll: true,
        hideDeclineAll: false,
        hideLearnMore: false,
        htmlTexts: true,
        disablePoweredBy: true,
        lang: "de",
        privacyPolicy: privacyUrl,
        translations: {
            de: {
                privacyPolicyUrl: privacyUrl,
                consentModal: {
                    title: "Cookies und Dienste",
                    description: "Lege fest, welche Dienste wir laden dürfen. Notwendig ist nur die Speicherung deiner Auswahl."
                },
                consentNotice: {
                    description: "Wir setzen keine Analyse- oder Werbe-Cookies. OpenStreetMap auf der Fotomap laden wir erst, wenn du zustimmst. Details stehen in der {privacyPolicy}.",
                    learnMore: "Einstellungen"
                },
                purposes: {
                    essential: "Notwendig",
                    functional: "Karte"
                },
                purposeItem: {
                    service: "Dienst",
                    services: "Dienste"
                },
                ok: "Akzeptieren",
                save: "Auswahl speichern",
                decline: "Ablehnen",
                close: "Schließen",
                acceptAll: "Akzeptieren",
                acceptSelected: "Speichern",
                service: {
                    disableAll: {
                        title: "Alle Dienste",
                        description: "Mit diesem Schalter kannst du alle optionalen Dienste an- oder ausschalten."
                    },
                    optOut: {
                        title: "(Opt-out)",
                        description: "Dieser Dienst wird standardmäßig geladen."
                    },
                    required: {
                        title: "(immer aktiv)",
                        description: "Dieser Dienst ist immer erforderlich."
                    }
                },
                contextualConsent: {
                    acceptAlways: "Immer erlauben",
                    acceptOnce: "Diesmal erlauben",
                    description: "Soll {title} geladen werden?"
                },
                privacyPolicy: {
                    name: "Datenschutzerklärung",
                    text: "Mehr dazu in unserer {privacyPolicy}."
                },
                poweredBy: "",
                consent: {
                    title: "Einwilligungsspeicher",
                    description: "Speichert, welche Dienste du erlaubt oder abgelehnt hast."
                },
                osm: {
                    title: "OpenStreetMap",
                    description: "Kartenkacheln und die Bibliothek Leaflet für die Fotomap. Dabei wird deine IP-Adresse an OpenStreetMap und unpkg übermittelt."
                }
            }
        },
        services: [
            {
                name: "consent",
                title: "Einwilligungsspeicher",
                purposes: ["essential"],
                required: true,
                cookies: ["klaro"]
            },
            {
                name: "osm",
                title: "OpenStreetMap",
                purposes: ["functional"],
                default: false,
                callback(consent) {
                    if (typeof consent === "boolean") {
                        dispatchConsentChange();
                    }
                }
            }
        ]
    };

    const script = document.createElement("script");
    script.src = new URL("vendor/klaro/klaro-no-css.js", siteRoot).href;
    script.onload = () => {
        const manager = window.klaro?.getManager?.();
        manager?.watch?.({
            update(obj, name) {
                if (name === "saveConsents" || name === "applyConsents" || name === "consents") {
                    dispatchConsentChange();
                }
            }
        });
        dispatchConsentChange();
        addSettingsLink();
    };
    document.head.appendChild(script);

    function addSettingsLink() {
        const footer = document.querySelector(".footer-links");
        if (!footer || footer.querySelector("[data-consent-settings]")) {
            return;
        }

        const pipe = document.createElement("span");
        pipe.className = "pipe";
        pipe.textContent = " | ";

        const link = document.createElement("a");
        link.href = "#";
        link.dataset.consentSettings = "true";
        link.textContent = "Cookies";
        link.addEventListener("click", (event) => {
            event.preventDefault();
            window.RCM_CONSENT.showSettings();
        });

        footer.append(pipe, link);
    }
})();
