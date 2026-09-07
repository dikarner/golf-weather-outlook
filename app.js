import {
  MODELS,
  MIX_ID,
  ROUND_HOURS,
  fetchForecast,
  readDayMix,
  readHour,
  readHourMix,
  hoursOfDay,
  outlookDates,
  isStorm,
  isFog,
  isNightHour,
  skyKind,
  daySkyKind,
  fmt1,
  rainStory,
  fmtPop,
  windLine,
  roundSlots,
  todayInVienna,
  daySheetFocusHour,
  formatDayHeading,
  formatClock,
  summarizeHours,
  minutelyForHour,
  runAgeLabel,
  modelById,
  modelWeight,
} from "./weather.js";
import {
  HERE_ID,
  loadState,
  saveState,
  saveForecast,
  loadForecast,
  clearForecast,
  saveHere,
  loadHere,
} from "./storage.js";
import { showRadar, hideRadar } from "./radar.js";
import { t, lang, applyStaticI18n } from "./i18n.js";

const state = loadState();
let herePlace = loadHere();
let forecast = null;
let status = "idle";
let openDay = null;
let further = false;
let radarOn = false;
let geoNote = "";
let geoHelp = "";

const $ = (id) => document.getElementById(id);

function course() {
  if (state.activeId === HERE_ID && herePlace) return herePlace;
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
  if (modelId === MIX_ID) return `<span class="badge mix">${t("mix")}</span>`;
  const m = modelById(modelId);
  const cls = modelId === "ecmwf_ifs025" ? "ifs" : "eu";
  return `<span class="badge ${cls}">${m?.short || modelId}</span>`;
}

function sunTimes(dateStr) {
  const d = forecast ? readDayMix(forecast, dateStr) : null;
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
  $("round-card").hidden = !c.golf;
  const age = forecast ? runAgeLabel(forecast.fetchedAt) : "";
  const mix = forecast ? readDayMix(forecast, todayInVienna()) : null;
  const srcShort =
    mix?.model === MIX_ID ? t("mix") : modelById(mix?.model)?.short || "—";
  let meta = status === "loading" ? t("loading") : `${srcShort} · ${age}`;
  if (status === "cached") meta += ` · ${t("cached")}`;
  if (status === "error")
    meta = `${t("refreshFail")} · ${age ? `${t("cached")} ${age}` : t("noData")}`;
  $("meta").textContent = geoNote || meta;
  const help = $("geo-help");
  if (help) {
    help.hidden = !geoHelp;
    help.textContent = geoHelp;
  }
  $("models-toggle").textContent = modelsOpen() ? t("hideModels") : t("allModels");
  const hereBtn = $("here-btn");
  if (hereBtn) hereBtn.classList.toggle("primary", state.activeId === HERE_ID);
  renderRound();
  renderOutlook();
  renderDaySheet();
  renderRoundSheet();
}
