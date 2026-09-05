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
  isFog,
  isNightHour,
  skyKind,
  daySkyKind,
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
import { t, lang, applyStaticI18n } from "./i18n.js";

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

function sunTimes(dateStr) {
  const d = forecast ? readDayPreferred(forecast, dateStr) : null;
  return { sunrise: d?.sunrise, sunset: d?.sunset };
}

function hourSky(row) {
  const { sunrise, sunset } = sunTimes(row.time.slice(0, 10));
  return skyKind(row.code, isNightHour(row.time, sunrise, sunset));
}

function skyIcon(kind, size = 22) {
  const svg = {
    sun: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="#c47b00"/><g stroke="#c47b00" stroke-width="2" stroke-linecap="round" fill="none"><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M5.2 18.8l1.6-1.6M17.2 6.8l1.6-1.6"/></g></svg>`,
    suncloud: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="8.5" r="3.2" fill="#c47b00"/><path fill="#5c5a52" d="M8 14.5a4.2 4.2 0 0 1 .4-8.4 5.2 5.2 0 0 1 10 .9 3.8 3.8 0 1 1 .4 7.5H8.2z"/></svg>`,
    moon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4a5568" d="M14.2 3.2a8.5 8.5 0 1 0 6.1 14.3A8.2 8.2 0 0 1 14.2 3.2z"/></svg>`,
    mooncloud: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4a5568" d="M9.8 4.2a6.2 6.2 0 0 0 4.4 10.4 6 6 0 0 1-7.8-8.8 6 6 0 0 0 3.4-1.6z"/><path fill="#5c5a52" d="M8 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.6 1 3.6 3.6 0 1 1 .4 7H8.2z"/></svg>`,
    cloud: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#5c5a52" d="M7.5 18a5 5 0 0 1 .5-10 6.2 6.2 0 0 1 12 1.2A4.5 4.5 0 1 1 20.5 18H7.6z"/></svg>`,
    fog: `<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#6a6860" stroke-width="2" stroke-linecap="round" fill="none"><path d="M3 9h13M6 13h15M4 17h12"/></g></svg>`,
  };
  return `<span class="sky" data-sky="${kind}" style="width:${size}px;height:${size}px">${svg[kind] || svg.cloud}</span>`;
}

function render() {
  const c = course();
  $("course-name").textContent = c.name;
  $("course-club").textContent = c.club || "";
  const age = forecast ? runAgeLabel(forecast.fetchedAt) : "";
  const src = forecast ? preferredModelOnDay(forecast, todayInVienna()) : null;
  const srcShort = src ? modelById(src)?.short : "—";
  let meta = status === "loading" ? t("loading") : `${srcShort} · ${age}`;
  if (status === "cached") meta += ` · ${t("cached")}`;
  if (status === "error")
    meta = `${t("refreshFail")} · ${age ? `${t("cached")} ${age}` : t("noData")}`;
  $("meta").textContent = meta;
  $("models-toggle").textContent = modelsOpen() ? t("hideModels") : t("allModels");
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
      <p class="round-summary">${t("noTee")}</p>
      <p class="round-sub">${t("noTeeHint")}</p>
      <div class="round-actions">
        <button class="btn primary" data-act="edit-tee">${t("setTee")}</button>
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
  let sub = `${ROUND_HOURS} ${t("hRound")} · ${t("hours")} ${formatClock(win.slots[0])}–${formatClock(win.slots.at(-1))}`;
  let sky = "";
  if (sum) {
    const kind = rows.some((r) => isFog(r.code)) ? "fog" : hourSky(rows[0]);
    sky = skyIcon(kind, 26);
    sub = `${rainStory(sum.rain)} · ${fmt1(sum.teeTemp)}° ${t("atTee")} · ${windLine(sum.wind, sum.gust)}`;
    if (sum.storm) sub += ` · <span class="storm">${t("storm")}</span>`;
    if (sum.models.some((m) => m !== "icon_d2")) {
      sub += badge(sum.models[0]);
    }
  }
  box.innerHTML = `
    <p class="round-summary">${sky}${summary}</p>
    <p class="round-sub">${sub}</p>
    <div class="round-actions">
      <button class="btn primary" data-act="open-round">${t("roundWindow")}</button>
      <button class="btn" data-act="edit-tee">${t("edit")}</button>
    </div>`;
}

function renderOutlook() {
  if (!forecast) {
    $("outlook").innerHTML = `<div class="card">${status === "loading" ? t("loadingOutlook") : t("noForecast")}</div>`;
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
      const kind = daySkyKind(hours, row.sunrise, row.sunset);
      const stormMark = storm ? ` · <span class="storm">${t("storm")}</span>` : "";
      return `<button class="day" data-day="${d}">
        <div>
          <div class="when">${formatDayHeading(d)}${badge(row.model)}</div>
        </div>
        ${skyIcon(kind, 28)}
        <div class="story">${story}${stormMark}</div>
        <div class="temps">${fmt1(row.tmax)}° / ${fmt1(row.tmin)}°</div>
      </button>`;
    })
    .join("");
  $("outlook").innerHTML = `
    <div class="toolbar">
      <h2>${t("outlook")}</h2>
    </div>
    ${daysHtml}
    ${extra ? `<div class="toolbar"><button class="btn" data-act="further">${t("further")}</button></div>` : ""}
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
  const rain = row.precip != null && row.precip >= 0.05 ? fmtPrecipLocal(row.precip) : t("dry");
  const storm = isStorm(row.code) ? ` <span class="storm">${t("storm")}</span>` : "";
  if (sub) {
    return `<div class="hour-row sub">
      <span></span>
      <span></span>
      <span class="t">${modelById(row.model)?.short} ${fmt1(row.temp)}°</span>
      <span>${rain}${storm}</span>
      <span>${windLine(row.wind, row.gust, row.dir)}</span>
    </div>`;
  }
  return `<div class="hour-row">
    <span>${formatClock(row.time)}</span>
    ${skyIcon(hourSky(row), 18)}
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
    ${htmlHours || `<p>${t("noHourly")}</p>`}
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
  $("round-sheet-title").textContent = `${t("round")} ${tee.time}`;
  $("round-sheet-body").innerHTML = `
    <p class="hint">${formatDayHeading(tee.date)} ${tee.time}–${win.endLabel.slice(-5)} · ${t("covering")} ${formatClock(win.slots[0])}–${formatClock(win.slots.at(-1))}</p>
    ${spark}
    ${rows || `<p>${t("noRoundData")}</p>`}
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
  $("radar-btn").textContent = t("radar");
  refresh(false);
}

function renderPlaces() {
  $("places-list").innerHTML = state.courses
    .map((c, i) => {
      const def = c.id === state.activeId ? ` · ${t("current")}` : "";
      return `<div class="list-item" data-id="${c.id}">
        <div class="grow">
          <div class="name">${c.name}</div>
          <div class="sub">${c.club || ""}${def}</div>
        </div>
        <button class="btn" data-act="up" data-i="${i}" ${i === 0 ? "disabled" : ""}>↑</button>
        <button class="btn" data-act="down" data-i="${i}" ${i === state.courses.length - 1 ? "disabled" : ""}>↓</button>
        <button class="btn" data-act="use">${t("open")}</button>
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
    $("add-where").value = "";
    $("add-picked").hidden = true;
    $("add-picked").textContent = "";
    $("add-sheet").showModal();
  }
  if (act === "radar") {
    radarOn = !radarOn;
    $("radar-btn").textContent = radarOn ? t("hideRadar") : t("radar");
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

$("add-search-btn").addEventListener("click", () => searchPlaces(false));
$("add-search-world").addEventListener("click", () => searchPlaces(true));
$("add-search").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchPlaces(false);
  }
});

function placeWhere(h) {
  const bits = [];
  if (h.admin3 && h.admin3 !== h.name) bits.push(h.admin3);
  let bezirk = h.admin2 || "";
  bezirk = bezirk.replace(/^Politischer /, "").replace(/^Regierungsbezirk /, "");
  if (bezirk && bezirk !== h.admin3 && bezirk !== h.admin1) bits.push(bezirk);
  if (h.admin1) bits.push(h.admin1);
  if (h.country) bits.push(h.country);
  return bits.join(" · ");
}

async function searchPlaces(everywhere) {
  const q = $("add-search").value.trim();
  if (!q) return;
  $("add-results").textContent = t("searching");
  const params = new URLSearchParams({
    name: q,
    count: "10",
    language: lang,
    format: "json",
  });
  if (!everywhere) params.set("country", "AT");
  const data = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`
  ).then((r) => r.json());
  let hits = data.results || [];
  if (!hits.length && !everywhere) {
    $("add-results").textContent = t("nothingAt");
    return searchPlaces(true);
  }
  if (!hits.length) {
    $("add-results").textContent = t("noMatches");
    return;
  }
  $("add-results").innerHTML = hits
    .map((h) => {
      const where = placeWhere(h);
      return `<button class="search-hit" type="button" data-lat="${h.latitude}" data-lon="${h.longitude}" data-name="${encodeURIComponent(h.name)}" data-where="${encodeURIComponent(where)}">
        <strong>${h.name}</strong><br>
        <span class="hint">${where}</span>
      </button>`;
    })
    .join("");
}

$("add-results").addEventListener("click", (e) => {
  const hit = e.target.closest(".search-hit");
  if (!hit) return;
  const name = decodeURIComponent(hit.dataset.name);
  const where = decodeURIComponent(hit.dataset.where || "");
  $("add-lat").value = hit.dataset.lat;
  $("add-lon").value = hit.dataset.lon;
  $("add-where").value = where;
  if (!$("add-name").value) $("add-name").value = name;
  $("add-picked").hidden = false;
  $("add-picked").textContent = where ? `${name} — ${where}` : name;
  $("add-results").querySelectorAll(".search-hit").forEach((b) => b.classList.remove("picked"));
  hit.classList.add("picked");
});

$("add-save").addEventListener("click", () => {
  const name = $("add-name").value.trim();
  const lat = Number($("add-lat").value);
  const lon = Number($("add-lon").value);
  if (!name || Number.isNaN(lat) || Number.isNaN(lon)) return;
  const id = `c_${Date.now()}`;
  state.courses.push({ id, name, club: $("add-where").value, lat, lon });
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

applyStaticI18n();
refresh(false);
render();
