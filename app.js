import {
  MODELS,
  ROUND_HOURS,
  fetchForecast,
  preferredModelOnDay,
  readDayPreferred,
  readHour,
  readHourPreferred,
  hoursOfDay,
  outlookDates,
  isStorm,
  fmt1,
  rainStory,
  windLine,
  roundSlots,
  todayInVienna,
  formatDayHeading,
  formatClock,
  summarizeHours,
  minutelyForHour,
  runAgeLabel,
  modelById,
} from "./weather.js";
import {
  loadState,
  saveState,
  saveForecast,
  loadForecast,
} from "./storage.js";
import { showRadar, hideRadar } from "./radar.js";

const state = loadState();
let forecast = null;
let status = "idle";
let openDay = null;
let further = false;
let radarOn = false;

const $ = (id) => document.getElementById(id);

function course() {
  return state.courses.find((c) => c.id === state.activeId) || state.courses[0];
}

function persist() {
  saveState(state);
}

function modelsOpen() {
  return !!state.expanded[state.activeId];
}

function badge(modelId) {
  if (!modelId || modelId === "icon_d2") return "";
  const m = modelById(modelId);
  const cls = modelId === "ecmwf_ifs025" ? "ifs" : "eu";
  return `<span class="badge ${cls}">${m?.short || modelId}</span>`;
}

function render() {
  const c = course();
  $("course-name").textContent = c.name;
  $("course-club").textContent = c.club || "";
  const age = forecast ? runAgeLabel(forecast.fetchedAt) : "";
  const src = forecast ? preferredModelOnDay(forecast, todayInVienna()) : null;
  const srcShort = src ? modelById(src)?.short : "—";
  let meta = status === "loading" ? "Loading…" : `${srcShort} · ${age}`;
  if (status === "cached") meta += " · cached";
  if (status === "error") meta = "Could not refresh · " + (age ? `cached ${age}` : "no data");
  $("meta").textContent = meta;
  $("models-toggle").textContent = modelsOpen() ? "Hide models" : "+ All models";
  renderRound();
  renderOutlook();
  renderDaySheet();
  renderRoundSheet();
}

function renderRound() {
  const tee = state.tees[state.activeId];
  const box = $("round-body");
  if (!tee?.date || !tee?.time) {
    box.innerHTML = `
      <p class="round-summary">No tee time set</p>
      <p class="round-sub">Enter a date and 24h time, down to the minute.</p>
      <div class="round-actions">
        <button class="btn primary" data-act="edit-tee">Set tee time</button>
      </div>`;
    return;
  }
  const win = roundSlots(tee.date, tee.time);
  const rows = forecast
    ? win.slots.map((iso) => readHourPreferred(forecast, iso)).filter(Boolean)
    : [];
  const sum = summarizeHours(rows);
  const day = formatDayHeading(tee.date);
  const endClock = win.endLabel.slice(-5);
  let summary = `${day} ${tee.time}–${endClock}`;
  let sub = `${ROUND_HOURS} h round · hours ${formatClock(win.slots[0])}–${formatClock(win.slots.at(-1))}`;
  if (sum) {
    sub = `${rainStory(sum.rain)} · ${fmt1(sum.teeTemp)}° at tee · ${windLine(sum.wind, sum.gust)}`;
    if (sum.storm) sub += ` · <span class="storm">storm</span>`;
    if (sum.models.some((m) => m !== "icon_d2")) {
      sub += badge(sum.models[0]);
    }
  }
  box.innerHTML = `
    <p class="round-summary">${summary}</p>
    <p class="round-sub">${sub}</p>
    <div class="round-actions">
      <button class="btn primary" data-act="open-round">Round window</button>
      <button class="btn" data-act="edit-tee">Edit</button>
    </div>`;
}

function renderOutlook() {
  if (!forecast) {
    $("outlook").innerHTML = `<div class="card">${status === "loading" ? "Loading outlook…" : "No forecast yet."}</div>`;
    return;
  }
  const dates = outlookDates(forecast, 16);
  const today = todayInVienna();
  const shown = further ? dates : dates.filter((d) => d <= shiftPlus(today, 6));
  const extra = dates.length > shown.length;
  const daysHtml = shown
    .map((d) => {
      const row = readDayPreferred(forecast, d);
      if (!row) return "";
      const hours = hoursOfDay(forecast, d)
        .map((iso) => readHourPreferred(forecast, iso))
        .filter(Boolean);
      const storm = isStorm(row.code) || hours.some((h) => isStorm(h.code));
      const story = [rainStory(row.precip), windLine(row.wind, row.gust)]
        .filter(Boolean)
        .join(" · ");
      return `<button class="day" data-day="${d}">
        <div>
          <div class="when">${formatDayHeading(d)}${badge(row.model)}</div>
        </div>
        <div class="story">${story}${storm ? ' · <span class="storm">storm</span>' : ""}</div>
        <div class="temps">${fmt1(row.tmax)}° / ${fmt1(row.tmin)}°</div>
      </button>`;
    })
    .join("");
  $("outlook").innerHTML = `
    <div class="toolbar">
      <h2>Outlook</h2>
    </div>
    ${daysHtml}
    ${extra ? `<div class="toolbar"><button class="btn" data-act="further">Further days</button></div>` : ""}
  `;
}

function shiftPlus(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

function hourBlock(iso, expand) {
  const pref = readHourPreferred(forecast, iso);
  if (!pref) return "";
  const main = hourLine(pref, false);
  if (!expand) return main;
  const subs = MODELS.filter((m) => m.id !== pref.model)
    .map((m) => {
      const row = readHour(forecast, iso, m.id);
      return row ? hourLine(row, true) : "";
    })
    .join("");
  return main + subs;
}

function hourLine(row, sub) {
  const rain = row.precip != null && row.precip >= 0.05 ? fmtPrecipLocal(row.precip) : "dry";
  const storm = isStorm(row.code) ? ' <span class="storm">storm</span>' : "";
  if (sub) {
    return `<div class="hour-row sub">
      <span></span>
      <span>${modelById(row.model)?.short}</span>
      <span class="t">${fmt1(row.temp)}°</span>
      <span>${rain}${storm}</span>
      <span>${windLine(row.wind, row.gust, row.dir)}</span>
    </div>`;
  }
  return `<div class="hour-row">
    <span>${formatClock(row.time)}</span>
    <span class="t">${fmt1(row.temp)}°</span>
    <span>${rain}${storm}</span>
    <span>${windLine(row.wind, row.gust, row.dir)}</span>
  </div>`;
}

function fmtPrecipLocal(n) {
  if (n < 1) return `${n.toFixed(1)} mm`;
  return `${Math.round(n * 10) / 10} mm`;
}

function sparkline(isoHours) {
  if (!forecast) return "";
  const pts = isoHours.flatMap((iso) => minutelyForHour(forecast, iso));
  if (pts.length < 2 || pts.every((p) => p < 0.05)) return "";
  const max = Math.max(1, ...pts);
  const bars = pts
    .map((p) => `<i style="height:${Math.max(8, Math.round((p / max) * 100))}%"></i>`)
    .join("");
  return `<div class="spark" title="15-min rain ICON-D2">${bars}</div>`;
}

function renderDaySheet() {
  const dlg = $("day-sheet");
  if (!openDay || !forecast) {
    if (dlg.open) dlg.close();
    return;
  }
  const row = readDayPreferred(forecast, openDay);
  const hours = hoursOfDay(forecast, openDay);
  const expand = modelsOpen();
  const htmlHours = hours.map((iso) => hourBlock(iso, expand)).join("");
  $("day-sheet-title").textContent = formatDayHeading(openDay);
  $("day-sheet-body").innerHTML = `
    <p class="hint">${row ? `${fmt1(row.tmax)}° / ${fmt1(row.tmin)}° · ${rainStory(row.precip)}` : ""}${badge(row?.model)}</p>
    ${openDay === todayInVienna() ? sparkline(hours.slice(0, 8)) : ""}
    ${htmlHours || "<p>No hourly data.</p>"}
  `;
  if (!dlg.open) dlg.showModal();
}

function renderRoundSheet() {
  const dlg = $("round-sheet");
  if (dlg.dataset.show !== "1" || !forecast) {
    return;
  }
  const tee = state.tees[state.activeId];
  if (!tee) return;
  const win = roundSlots(tee.date, tee.time);
  const expand = modelsOpen();
  const rows = win.slots.map((iso) => hourBlock(iso, expand)).join("");
  const today = todayInVienna();
  const spark = tee.date === today ? sparkline(win.slots) : "";
  $("round-sheet-title").textContent = `Round ${tee.time}`;
  $("round-sheet-body").innerHTML = `
    <p class="hint">${formatDayHeading(tee.date)} ${tee.time}–${win.endLabel.slice(-5)} · covering ${formatClock(win.slots[0])}–${formatClock(win.slots.at(-1))}</p>
    ${spark}
    ${rows || "<p>No model data for this window yet.</p>"}
  `;
}

async function refresh(force) {
  const c = course();
  const cached = loadForecast(c.id);
  if (cached && !forecast) {
    forecast = cached;
    status = "cached";
    render();
  }
  if (!force && cached && Date.now() - cached.fetchedAt < 10 * 60 * 1000) {
    forecast = cached;
    status = "ok";
    render();
    return;
  }
  status = "loading";
  render();
  try {
    const data = await fetchForecast(c.lat, c.lon);
    forecast = data;
    saveForecast(c.id, data);
    status = "ok";
  } catch (err) {
    console.error(err);
    if (cached) {
      forecast = cached;
      status = "cached";
    } else {
      status = "error";
    }
  }
  render();
}

function selectCourse(id) {
  state.activeId = id;
  persist();
  forecast = loadForecast(id);
  openDay = null;
  radarOn = false;
  hideRadar($("radar-wrap"));
  $("radar-btn").textContent = "Radar";
  refresh(false);
}

function renderPlaces() {
  $("places-list").innerHTML = state.courses
    .map((c, i) => {
      const def = c.id === state.activeId ? " · current" : "";
      return `<div class="list-item" data-id="${c.id}">
        <div class="grow">
          <div class="name">${c.name}</div>
          <div class="sub">${c.club || ""}${def}</div>
        </div>
        <button class="btn" data-act="up" data-i="${i}" ${i === 0 ? "disabled" : ""}>↑</button>
        <button class="btn" data-act="down" data-i="${i}" ${i === state.courses.length - 1 ? "disabled" : ""}>↓</button>
        <button class="btn" data-act="use">Open</button>
        <button class="btn danger" data-act="del">✕</button>
      </div>`;
    })
    .join("");
}

function renderSwitcher() {
  $("switcher-list").innerHTML = state.courses
    .map((c) => {
      const on = c.id === state.activeId ? " primary" : "";
      return `<button class="btn${on}" style="width:100%;margin:6px 0;text-align:left" data-id="${c.id}">
        <strong>${c.name}</strong><br><span class="hint">${c.club || ""}</span>
      </button>`;
    })
    .join("");
}

document.addEventListener("click", (e) => {
  const act = e.target.closest("[data-act]")?.dataset.act;
  const dayBtn = e.target.closest("[data-day]");
  if (dayBtn) {
    openDay = dayBtn.dataset.day;
    render();
    return;
  }
  if (!act) return;
  if (act === "refresh") refresh(true);
  if (act === "switch") {
    renderSwitcher();
    $("switcher").showModal();
  }
  if (act === "places") {
    renderPlaces();
    $("places").showModal();
  }
  if (act === "further") {
    further = true;
    render();
  }
  if (act === "models") {
    state.expanded[state.activeId] = !modelsOpen();
    persist();
    render();
  }
  if (act === "edit-tee") {
    const tee = state.tees[state.activeId] || {};
    $("tee-date").value = tee.date || todayInVienna();
    $("tee-time").value = tee.time || "09:00";
    $("tee-editor").showModal();
  }
  if (act === "save-tee") {
    state.tees[state.activeId] = {
      date: $("tee-date").value,
      time: $("tee-time").value,
    };
    persist();
    $("tee-editor").close();
    render();
  }
  if (act === "clear-tee") {
    delete state.tees[state.activeId];
    persist();
    $("tee-editor").close();
    render();
  }
  if (act === "open-round") {
    $("round-sheet").dataset.show = "1";
    if (!$("round-sheet").open) $("round-sheet").showModal();
    renderRoundSheet();
  }
  if (act === "close-day") {
    openDay = null;
    $("day-sheet").close();
  }
  if (act === "close-round") {
    $("round-sheet").dataset.show = "0";
    $("round-sheet").close();
  }
  if (act === "close") {
    e.target.closest("dialog")?.close();
  }
  if (act === "add-course") {
    $("add-name").value = "";
    $("add-search").value = "";
    $("add-results").innerHTML = "";
    $("add-lat").value = "";
    $("add-lon").value = "";
    $("add-sheet").showModal();
  }
  if (act === "radar") {
    radarOn = !radarOn;
    $("radar-btn").textContent = radarOn ? "Hide radar" : "Radar";
    if (radarOn) {
      const c = course();
      showRadar($("radar-wrap"), c.lat, c.lon);
    } else {
      hideRadar($("radar-wrap"));
    }
  }
});

$("switcher-list").addEventListener("click", (e) => {
  const id = e.target.closest("[data-id]")?.dataset.id;
  if (!id) return;
  $("switcher").close();
  selectCourse(id);
});

$("places-list").addEventListener("click", (e) => {
  const row = e.target.closest(".list-item");
  if (!row) return;
  const id = row.dataset.id;
  const act = e.target.closest("[data-act]")?.dataset.act;
  const i = state.courses.findIndex((c) => c.id === id);
  if (act === "use") {
    $("places").close();
    selectCourse(id);
  }
  if (act === "del") {
    if (state.courses.length < 2) return;
    state.courses.splice(i, 1);
    if (state.activeId === id) state.activeId = state.courses[0].id;
    persist();
    renderPlaces();
    render();
  }
  if (act === "up" && i > 0) {
    [state.courses[i - 1], state.courses[i]] = [state.courses[i], state.courses[i - 1]];
    persist();
    renderPlaces();
  }
  if (act === "down" && i < state.courses.length - 1) {
    [state.courses[i + 1], state.courses[i]] = [state.courses[i], state.courses[i + 1]];
    persist();
    renderPlaces();
  }
});

$("add-search-btn").addEventListener("click", searchPlaces);
$("add-search").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchPlaces();
  }
});

async function searchPlaces() {
  const q = $("add-search").value.trim();
  if (!q) return;
  $("add-results").textContent = "Searching…";
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=de&format=json`;
  const data = await fetch(url).then((r) => r.json());
  const hits = data.results || [];
  if (!hits.length) {
    $("add-results").textContent = "No matches.";
    return;
  }
  $("add-results").innerHTML = hits
    .map(
      (h) => `<button class="search-hit" data-lat="${h.latitude}" data-lon="${h.longitude}" data-name="${encodeURIComponent(h.name)}">
        <strong>${h.name}</strong><br>
        <span class="hint">${[h.admin1, h.country].filter(Boolean).join(", ")} · ${h.latitude.toFixed(3)}, ${h.longitude.toFixed(3)}</span>
      </button>`
    )
    .join("");
}

$("add-results").addEventListener("click", (e) => {
  const hit = e.target.closest(".search-hit");
  if (!hit) return;
  $("add-lat").value = hit.dataset.lat;
  $("add-lon").value = hit.dataset.lon;
  if (!$("add-name").value) $("add-name").value = decodeURIComponent(hit.dataset.name);
});

$("add-save").addEventListener("click", () => {
  const name = $("add-name").value.trim();
  const lat = Number($("add-lat").value);
  const lon = Number($("add-lon").value);
  if (!name || Number.isNaN(lat) || Number.isNaN(lon)) return;
  const id = `c_${Date.now()}`;
  state.courses.push({ id, name, club: "", lat, lon });
  persist();
  $("add-sheet").close();
  $("places").close();
  selectCourse(id);
});

$("day-sheet").addEventListener("close", () => {
  openDay = null;
});
$("round-sheet").addEventListener("close", () => {
  $("round-sheet").dataset.show = "0";
});
document.querySelectorAll("dialog").forEach((d) => {
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close();
  });
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

refresh(false);
render();
