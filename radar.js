let map;
let overlay;
let frames = [];
let frameIndex = 0;
let timer;
let leafletReady;

function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletReady) return leafletReady;
  leafletReady = new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("Leaflet failed"));
    document.head.appendChild(s);
  });
  return leafletReady;
}

export async function showRadar(el, lat, lon) {
  stopRadar();
  el.hidden = false;
  const mapEl = el.querySelector("#radar-map");
  const label = el.querySelector("#radar-label");
  try {
    await loadLeaflet();
  } catch {
    label.textContent = "Radar map failed to load";
    return;
  }
  if (map) {
    map.remove();
    map = null;
  }
  map = window.L.map(mapEl, { zoomControl: true, attributionControl: true }).setView(
    [lat, lon],
    8
  );
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 16,
  }).addTo(map);
  window.L.circleMarker([lat, lon], {
    radius: 7,
    color: "#0d5c2e",
    fillColor: "#0d5c2e",
    fillOpacity: 1,
    weight: 2,
  }).addTo(map);

  const meta = await fetch("https://api.rainviewer.com/public/weather-maps.json").then((r) =>
    r.json()
  );
  const past = meta.radar?.past || [];
  const nowcast = meta.radar?.nowcast || [];
  frames = [...past, ...nowcast].map((f) => ({
    time: f.time,
    url: `${meta.host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
  }));
  if (!frames.length) {
    label.textContent = "No radar frames";
    return;
  }
  frameIndex = Math.max(0, past.length - 1);
  paintFrame();
  timer = setInterval(() => {
    frameIndex = (frameIndex + 1) % frames.length;
    paintFrame();
  }, 700);

  function paintFrame() {
    const f = frames[frameIndex];
    if (overlay) map.removeLayer(overlay);
    overlay = window.L.tileLayer(f.url, { opacity: 0.72, zIndex: 10 });
    overlay.addTo(map);
    const d = new Date(f.time * 1000);
    label.textContent = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Vienna",
    });
  }
}

export function stopRadar() {
  if (timer) clearInterval(timer);
  timer = null;
}

export function hideRadar(el) {
  stopRadar();
  el.hidden = true;
  if (map) {
    map.remove();
    map = null;
    overlay = null;
  }
}
