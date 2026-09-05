import { t, locale, lang } from "./i18n.js";

export const MODELS = [
  { id: "icon_d2", short: "D2", name: "ICON-D2" },
  { id: "icon_eu", short: "EU", name: "ICON-EU" },
  { id: "chmi_aladin_central_europe_2km", short: "ALD", name: "ALADIN" },
  { id: "ecmwf_ifs025", short: "IFS", name: "ECMWF IFS" },
];

export const MIX_ID = "mix";

/**
 * Relative mix weights by days ahead (0 = today in Vienna).
 * 0 = leave that model out of the mix (it still appears under + All models).
 * Native ranges via Open-Meteo: D2 ~2 d, ALADIN ~3 d, ICON-EU ~5 d, IFS ~15 d.
 *
 *  today  +1  +2  +3  +4  +5   then +6… IFS only
 * D2    5   4   1   —   —   —
 * ALD   3   3   3   1   —   —
 * EU    2   2   4   4   4   2
 * IFS   1   1   2   2   3   4
 */
const WEIGHTS = {
  icon_d2: [5, 4, 1, 0, 0, 0],
  icon_eu: [2, 2, 4, 4, 4, 2],
  chmi_aladin_central_europe_2km: [3, 3, 3, 1, 0, 0],
  ecmwf_ifs025: [1, 1, 2, 2, 3, 4],
};

export function modelWeight(modelId, daysAhead) {
  const row = WEIGHTS[modelId];
  if (!row) return 0;
  const d = Math.max(0, daysAhead);
  if (d >= 6) return modelId === "ecmwf_ifs025" ? 1 : 0;
  return row[d] ?? 0;
}

export const ROUND_HOURS = 5;
export const TZ = "Europe/Vienna";

const HOURLY_VARS = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
];

const DAILY_VARS = [
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "weather_code",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "sunrise",
  "sunset",
];

export function forecastUrl(lat, lon) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: HOURLY_VARS.join(","),
    minutely_15: "precipitation,weather_code",
    daily: DAILY_VARS.join(","),
    models: MODELS.map((m) => m.id).join(","),
    forecast_days: "16",
    timezone: TZ,
    wind_speed_unit: "kmh",
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

export async function fetchForecast(lat, lon) {
  const res = await fetch(forecastUrl(lat, lon));
  if (!res.ok) throw new Error(`Forecast HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.reason || "Forecast error");
  data.fetchedAt = Date.now();
  return data;
}

export function modelById(id) {
  if (id === MIX_ID) return { id: MIX_ID, short: "Mix", name: "Mix" };
  return MODELS.find((m) => m.id === id);
}

function col(block, variable, modelId) {
  if (!block) return null;
  return block[`${variable}_${modelId}`] ?? null;
}

export function hourIndex(data, isoHour) {
  const times = data.hourly?.time || [];
  return times.indexOf(isoHour);
}

export function preferredModelAt(data, isoHour) {
  const i = hourIndex(data, isoHour);
  if (i < 0) return null;
  for (const m of MODELS) {
    const temps = col(data.hourly, "temperature_2m", m.id);
    if (temps && temps[i] != null) return m.id;
  }
  return null;
}

export function preferredModelOnDay(data, dateStr) {
  const noon = `${dateStr}T12:00`;
  const atNoon = preferredModelAt(data, noon);
  if (atNoon) return atNoon;
  const times = data.hourly?.time || [];
  for (const t of times) {
    if (t.startsWith(dateStr)) {
      const m = preferredModelAt(data, t);
      if (m) return m;
    }
  }
  return MODELS[MODELS.length - 1].id;
}

export function readHour(data, isoHour, modelId) {
  const i = hourIndex(data, isoHour);
  if (i < 0) return null;
  const h = data.hourly;
  const pick = (v) => {
    const arr = col(h, v, modelId);
    return arr ? arr[i] : null;
  };
  const temp = pick("temperature_2m");
  if (temp == null) return null;
  return {
    time: isoHour,
    model: modelId,
    temp,
    feels: pick("apparent_temperature"),
    precip: pick("precipitation"),
    code: pick("weather_code"),
    wind: pick("wind_speed_10m"),
    gust: pick("wind_gusts_10m"),
    dir: pick("wind_direction_10m"),
  };
}

export function readHourPreferred(data, isoHour) {
  const model = preferredModelAt(data, isoHour);
  if (!model) return null;
  return readHour(data, isoHour, model);
}

export function readHourMix(data, isoHour, today) {
  const ahead = daysAhead(isoHour.slice(0, 10), today);
  const parts = collectParts((id) => readHour(data, isoHour, id), ahead);
  if (!parts.length) return null;
  return blendHour(parts, isoHour);
}

function dailyIndex(data, dateStr) {
  return (data.daily?.time || []).indexOf(dateStr);
}

export function readDay(data, dateStr, modelId) {
  const i = dailyIndex(data, dateStr);
  if (i < 0) return null;
  const d = data.daily;
  const pick = (v) => {
    const arr = col(d, v, modelId);
    return arr ? arr[i] : null;
  };
  const tmax = pick("temperature_2m_max");
  const tmin = pick("temperature_2m_min");
  if (tmax == null && tmin == null) return null;
  return {
    date: dateStr,
    model: modelId,
    tmax,
    tmin,
    precip: pick("precipitation_sum"),
    code: pick("weather_code"),
    wind: pick("wind_speed_10m_max"),
    gust: pick("wind_gusts_10m_max"),
    sunrise: pick("sunrise"),
    sunset: pick("sunset"),
  };
}

export function readDayPreferred(data, dateStr) {
  const model = preferredModelOnDay(data, dateStr);
  const row = readDay(data, dateStr, model);
  if (row) return row;
  for (const m of MODELS) {
    const alt = readDay(data, dateStr, m.id);
    if (alt) return alt;
  }
  return null;
}

export function readDayMix(data, dateStr, today) {
  const ahead = daysAhead(dateStr, today);
  const parts = collectParts((id) => readDay(data, dateStr, id), ahead);
  if (!parts.length) return null;
  return blendDay(parts, dateStr);
}

function collectParts(readOne, ahead) {
  const parts = [];
  for (const m of MODELS) {
    const row = readOne(m.id);
    if (!row) continue;
    const w = modelWeight(m.id, ahead);
    if (w > 0) parts.push({ w, row });
  }
  if (parts.length) return parts;
  for (const m of MODELS) {
    const row = readOne(m.id);
    if (row) parts.push({ w: 1, row });
  }
  return parts;
}

function weightedMean(parts, getter) {
  let s = 0;
  let w = 0;
  for (const p of parts) {
    const v = getter(p.row);
    if (v == null || Number.isNaN(Number(v))) continue;
    s += Number(v) * p.w;
    w += p.w;
  }
  return w ? s / w : null;
}

function vectorDir(parts, getter) {
  let sx = 0;
  let sy = 0;
  let w = 0;
  for (const p of parts) {
    const deg = getter(p.row);
    if (deg == null || Number.isNaN(Number(deg))) continue;
    const rad = (Number(deg) * Math.PI) / 180;
    sx += p.w * Math.sin(rad);
    sy += p.w * Math.cos(rad);
    w += p.w;
  }
  if (!w) return null;
  return ((Math.atan2(sx, sy) * 180) / Math.PI + 360) % 360;
}

function pickCode(parts) {
  const stormPart = parts.find((p) => isStorm(p.row.code));
  if (stormPart) return stormPart.row.code;
  const fogPart = parts.find((p) => isFog(p.row.code));
  if (fogPart) return fogPart.row.code;
  return parts.reduce((a, b) => (b.w > a.w ? b : a)).row.code;
}

function blendHour(parts, isoHour) {
  const one = parts.length === 1;
  return {
    time: isoHour,
    model: one ? parts[0].row.model : MIX_ID,
    models: parts.map((p) => p.row.model),
    temp: weightedMean(parts, (r) => r.temp),
    feels: weightedMean(parts, (r) => r.feels),
    precip: weightedMean(parts, (r) => r.precip),
    code: pickCode(parts),
    wind: weightedMean(parts, (r) => r.wind),
    gust: weightedMean(parts, (r) => r.gust),
    dir: vectorDir(parts, (r) => r.dir),
  };
}

function blendDay(parts, dateStr) {
  const one = parts.length === 1;
  const top = parts.reduce((a, b) => (b.w > a.w ? b : a));
  const sun = parts.find((p) => p.row.sunrise)?.row;
  return {
    date: dateStr,
    model: one ? parts[0].row.model : MIX_ID,
    models: parts.map((p) => p.row.model),
    tmax: weightedMean(parts, (r) => r.tmax),
    tmin: weightedMean(parts, (r) => r.tmin),
    precip: weightedMean(parts, (r) => r.precip),
    code: pickCode(parts),
    wind: weightedMean(parts, (r) => r.wind),
    gust: weightedMean(parts, (r) => r.gust),
    sunrise: sun?.sunrise || top.row.sunrise,
    sunset: sun?.sunset || top.row.sunset,
  };
}

export function hoursOfDay(data, dateStr) {
  return (data.hourly?.time || []).filter((t) => t.startsWith(dateStr));
}

export function outlookDates(data, days = 16) {
  const times = data.daily?.time || [];
  return times.slice(0, days);
}

export function isStorm(code) {
  return code === 95 || code === 96 || code === 97 || code === 99;
}

export function isFog(code) {
  return code === 45 || code === 48;
}

/** Hour midpoint vs sunrise/sunset. No sun icon at night. */
export function isNightHour(isoHour, sunrise, sunset) {
  if (!isoHour) return false;
  const mid = `${isoHour.slice(0, 13)}:30`;
  if (sunrise && sunset) return mid < sunrise || mid >= sunset;
  const h = Number(isoHour.slice(11, 13));
  return h < 6 || h >= 19;
}

/**
 * sun | suncloud | moon | mooncloud | cloud | fog
 * Clear night is moon, never sun.
 */
export function skyKind(code, night) {
  if (isFog(code)) return "fog";
  if (code == null || code <= 1) return night ? "moon" : "sun";
  if (code === 2) return night ? "mooncloud" : "suncloud";
  return "cloud";
}

/** Outlook row: daytime sky; fog wins if it shows up in the morning. */
export function daySkyKind(hours, sunrise, sunset) {
  if (!hours?.length) return "sun";
  const morning = hours.filter((h) => {
    const hr = Number(h.time.slice(11, 13));
    return hr >= 5 && hr <= 11 && isFog(h.code);
  });
  if (morning.length) return "fog";
  const daytime = hours.filter((h) => !isNightHour(h.time, sunrise, sunset));
  const pick = daytime.find((h) => h.time.includes("T12:")) || daytime[Math.floor(daytime.length / 2)] || hours[0];
  return skyKind(pick.code, false);
}

export function compass(deg) {
  if (deg == null || Number.isNaN(deg)) return "";
  const dirs =
    lang === "de"
      ? ["N", "NO", "O", "SO", "S", "SW", "W", "NW"]
      : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export function fmt1(n) {
  if (n == null) return "–";
  return Math.round(n).toString();
}

export function fmtPrecip(n) {
  if (n == null || n < 0.05) return "dry";
  if (n < 1) return `${n.toFixed(1)} mm`;
  return `${Math.round(n * 10) / 10} mm`;
}

export function rainStory(precip) {
  if (precip == null || precip < 0.2) return t("dry");
  if (precip < 1) return `${precip.toFixed(1)} mm`;
  return `${Math.round(precip)} mm`;
}

export function windLine(speed, gust, dir) {
  const s = fmt1(speed);
  const g = gust != null ? ` g${fmt1(gust)}` : "";
  const c = compass(dir);
  return c ? `${c} ${s}${g}` : `${s}${g}`;
}

/** Floor tee time to hour slots that overlap [tee, tee+duration). */
export function roundSlots(dateStr, timeStr, durationHours = ROUND_HOURS) {
  const [hh, mm] = timeStr.split(":").map(Number);
  const startMin = hh * 60 + mm;
  const endMin = startMin + durationHours * 60;
  const slots = [];
  let t = Math.floor(startMin / 60) * 60;
  while (t < endMin) {
    const dayShift = Math.floor(t / (24 * 60));
    const tod = ((t % (24 * 60)) + 24 * 60) % (24 * 60);
    const h = Math.floor(tod / 60);
    const isoDate = shiftDate(dateStr, dayShift);
    slots.push(`${isoDate}T${String(h).padStart(2, "0")}:00`);
    t += 60;
  }
  const endH = Math.floor(endMin / 60);
  const endM = endMin % 60;
  const endShift = Math.floor(endH / 24);
  const endClockH = ((endH % 24) + 24) % 24;
  const endDate = shiftDate(dateStr, endShift);
  return {
    startLabel: `${dateStr} ${timeStr}`,
    endLabel: `${endDate} ${String(endClockH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
    slots,
  };
}

export function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = Date.UTC(y, m - 1, d + days);
  const yy = new Date(dt).getUTCFullYear();
  const mm = String(new Date(dt).getUTCMonth() + 1).padStart(2, "0");
  const dd = String(new Date(dt).getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function todayInVienna() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function daysAhead(dateStr, today = todayInVienna()) {
  const toUtc = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(dateStr) - toUtc(today)) / 86400000);
}

export function formatDayHeading(dateStr) {
  const today = todayInVienna();
  const tomorrow = shiftDate(today, 1);
  if (dateStr === today) return t("today");
  if (dateStr === tomorrow) return t("tomorrow");
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(dt);
}

export function formatClock(isoLocal) {
  if (!isoLocal) return "";
  if (isoLocal.includes("T")) return isoLocal.slice(11, 16);
  return isoLocal;
}

export function summarizeHours(rows) {
  const live = rows.filter(Boolean);
  if (!live.length) return null;
  const rain = live.reduce((s, r) => s + (r.precip || 0), 0);
  const storm = live.some((r) => isStorm(r.code));
  const wind = Math.max(...live.map((r) => r.wind ?? 0));
  const gust = Math.max(...live.map((r) => r.gust ?? 0));
  const temps = live.map((r) => r.temp).filter((n) => n != null);
  return {
    rain,
    storm,
    wind,
    gust,
    tmin: Math.min(...temps),
    tmax: Math.max(...temps),
    teeTemp: live[0].temp,
    models: [...new Set(live.flatMap((r) => r.models || [r.model]))],
  };
}

export function minutelyForHour(data, isoHour, modelId = "icon_d2") {
  const times = data.minutely_15?.time || [];
  const precip = col(data.minutely_15, "precipitation", modelId) || [];
  const prefix = isoHour.slice(0, 13); // YYYY-MM-DDTHH
  const pts = [];
  times.forEach((t, i) => {
    if (t.startsWith(prefix) && precip[i] != null) pts.push(precip[i]);
  });
  return pts;
}

export function runAgeLabel(fetchedAt) {
  if (!fetchedAt) return "";
  const min = Math.max(0, Math.round((Date.now() - fetchedAt) / 60000));
  if (min < 1) return t("justNow");
  if (min === 1) return t("minAgo1");
  if (min < 60) return t("minAgo", { n: min });
  const h = Math.round(min / 60);
  return h === 1 ? t("hAgo1") : t("hAgo", { n: h });
}
