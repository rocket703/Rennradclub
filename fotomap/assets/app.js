'use strict';

const DEFAULT_CENTER = [52.1205, 11.6276];
const DEFAULT_ZOOM = 12;

const statusElement = document.getElementById('status');
const gpxInput = document.getElementById('gpxInput');
const clearGpxButton = document.getElementById('clearGpxButton');

const map = L.map('map', {
  zoomControl: true,
  preferCanvas: true
}).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const photoLayer = L.layerGroup().addTo(map);
const gpxLayer = L.layerGroup().addTo(map);

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function photoPopup(photo) {
  const dateLine = photo.takenAt
    ? `<span>Aufnahme: ${escapeHtml(photo.takenAt)}</span>`
    : '';

  return `
    <div class="photo-popup">
      <div class="photo-popup__name">${escapeHtml(photo.name)}</div>
      <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.name)}" loading="lazy">
      <div class="photo-popup__meta">
        ${dateLine}
        <span>GPS: ${Number(photo.lat).toFixed(6)}, ${Number(photo.lon).toFixed(6)}</span>
      </div>
    </div>
  `;
}

function addPhotoMarker(photo) {
  const lat = Number(photo.lat);
  const lon = Number(photo.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const marker = L.circleMarker([lat, lon], {
    radius: 8,
    color: '#ffffff',
    weight: 2,
    fillColor: '#168b45',
    fillOpacity: 1
  }).addTo(photoLayer);

  marker.bindPopup(photoPopup(photo), {
    maxWidth: 350
  });

  return [lat, lon];
}

async function loadSavedPhotos() {
  statusElement.textContent = 'Fotos werden geladen …';

  try {
    const response = await fetch('./data/photos.json', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const manifest = await response.json();
    const photos = Array.isArray(manifest) ? manifest : (manifest.photos ?? []);
    const locations = [];

    photoLayer.clearLayers();

    for (const photo of photos) {
      const location = addPhotoMarker(photo);
      if (location) {
        locations.push(location);
      }
    }

    statusElement.textContent = `${locations.length} Foto(s) auf der Karte`;

    if (locations.length === 1) {
      map.setView(locations[0], 16);
    } else if (locations.length > 1) {
      map.fitBounds(locations, {
        padding: [45, 45],
        maxZoom: 16
      });
    }
  } catch (error) {
    console.error('Fotomap konnte nicht geladen werden:', error);
    statusElement.textContent = 'Fotos konnten nicht geladen werden';
  }
}

function readGpxPoints(xmlDocument) {
  const tracks = [];
  const trackSegments = xmlDocument.getElementsByTagNameNS('*', 'trkseg');

  for (const segment of trackSegments) {
    const points = [];
    const trackPoints = segment.getElementsByTagNameNS('*', 'trkpt');

    for (const point of trackPoints) {
      const lat = Number(point.getAttribute('lat'));
      const lon = Number(point.getAttribute('lon'));

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        points.push([lat, lon]);
      }
    }

    if (points.length > 1) {
      tracks.push(points);
    }
  }

  if (tracks.length === 0) {
    const routePoints = xmlDocument.getElementsByTagNameNS('*', 'rtept');
    const points = [];

    for (const point of routePoints) {
      const lat = Number(point.getAttribute('lat'));
      const lon = Number(point.getAttribute('lon'));

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        points.push([lat, lon]);
      }
    }

    if (points.length > 1) {
      tracks.push(points);
    }
  }

  return tracks;
}

async function displayGpxFile(file) {
  const text = await file.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');

  if (xml.querySelector('parsererror')) {
    throw new Error(`${file.name}: GPX-Datei konnte nicht gelesen werden.`);
  }

  const tracks = readGpxPoints(xml);

  if (tracks.length === 0) {
    throw new Error(`${file.name}: Keine Strecke gefunden.`);
  }

  const allPoints = [];

  for (const track of tracks) {
    L.polyline(track, {
      color: '#1769aa',
      weight: 5,
      opacity: 0.85
    })
      .bindTooltip(escapeHtml(file.name))
      .addTo(gpxLayer);

    allPoints.push(...track);
  }

  return allPoints;
}

gpxInput.addEventListener('change', async () => {
  if (gpxInput.files.length === 0) {
    return;
  }

  statusElement.textContent = 'GPX wird geladen …';
  const allGpxPoints = [];

  try {
    for (const file of gpxInput.files) {
      const points = await displayGpxFile(file);
      allGpxPoints.push(...points);
    }

    if (allGpxPoints.length > 0) {
      map.fitBounds(allGpxPoints, {
        padding: [40, 40]
      });
    }

    statusElement.textContent = `${gpxInput.files.length} GPX-Datei(en) angezeigt`;
  } catch (error) {
    console.error(error);
    statusElement.textContent = 'GPX konnte nicht geladen werden';
    window.alert(error.message);
  } finally {
    gpxInput.value = '';
  }
});

clearGpxButton.addEventListener('click', () => {
  gpxLayer.clearLayers();
  statusElement.textContent = 'GPX-Strecken entfernt';
});

loadSavedPhotos();
