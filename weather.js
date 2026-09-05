export const MODELS = [
  { id: "icon_d2", short: "D2", name: "ICON-D2" },
  { id: "icon_eu", short: "EU", name: "ICON-EU" },
  { id: "chmi_aladin_central_europe_2km", short: "ALD", name: "ALADIN" },
  { id: "ecmwf_ifs025", short: "IFS", name: "ECMWF IFS" },
];

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

export function compass(deg) {
  if (deg == null || Number.isNaN(deg)) return "";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
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
  if (precip == null || precip < 0.2) return "dry";
  if (precip < 1) return `${precip.toFixed(1)} mm`;
  return `${Math.round(precip)} mm`;
}

export function windLine(speed, gust, dir) {
  const s = fmt1(speed);
  const g = gust != null ? ` g${fmt1(gust)}` : "";
  const c = compass(dir);
  return c ? `${c} ${s}${g}` : `${s}${g}`;
}

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

export function formatDayHeading(dateStr) {
  const today = todayInVienna();
  const tomorrow = shiftDate(today, 1);
  if (dateStr === today) return "Today";
  if (dateStr === tomorrow) return "Tomorrow";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("en-GB", {
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
    models: [...new Set(live.map((r) => r.model))],
  };
}

export function minutelyForHour(data, isoHour, modelId = "icon_d2") {
  const times = data.minutely_15?.time || [];
  const precip = col(data.minutely_15, "precipitation", modelId) || [];
  const prefix = isoHour.slice(0, 13);
  const pts = [];
  times.forEach((t, i) => {
    if (t.startsWith(prefix) && precip[i] != null) pts.push(precip[i]);
  });
  return pts;
}

export function runAgeLabel(fetchedAt) {
  if (!fetchedAt) return "";
  const min = Math.max(0, Math.round((Date.now() - fetchedAt) / 60000));
  if (min < 1) return "just now";
  if (min === 1) return "1 min ago";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h === 1 ? "1 h ago" : `${h} h ago`;
}
