const KEY = "golf-outlook-v1";
const HERE_KEY = "golf-outlook-here";
export const HERE_ID = "here";

export const SEED_COURSES = [
  {
    id: "atzenbrugg",
    name: "Atzenbrugg",
    club: "Diamond Country Club",
    lat: 48.3152321,
    lon: 15.911922,
    golf: true,
  },
  {
    id: "lengenfeld",
    name: "Lengenfeld",
    club: "Golfclub Lengenfeld",
    lat: 48.4729172,
    lon: 15.6226387,
    golf: true,
  },
  {
    id: "tatzmannsdorf",
    name: "Bad Tatzmannsdorf",
    club: "Reiters Golf & Country Club",
    lat: 47.3193836,
    lon: 16.2329624,
    golf: true,
  },
  {
    id: "ferschnitz",
    name: "Ferschnitz",
    club: "Swarco Amstetten–Ferschnitz",
    lat: 48.0864747,
    lon: 14.9765349,
    golf: true,
  },
  {
    id: "ernegg",
    name: "Ernegg",
    club: "Golfclub Schloss Ernegg",
    lat: 48.0690406,
    lon: 15.0645964,
    golf: true,
  },
  {
    id: "goldegg",
    name: "Goldegg",
    club: "GC St. Pölten – Schloss Goldegg",
    lat: 48.2334269,
    lon: 15.5304729,
    golf: true,
  },
];

function blank() {
  return {
    courses: structuredClone(SEED_COURSES),
    activeId: "atzenbrugg",
    tees: {},
    expanded: {},
  };
}

function normalizeHere(h) {
  if (!h || typeof h !== "object") return null;
  const lat = Number(h.lat);
  const lon = Number(h.lon);
  const name = String(h.name || "");
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    id: HERE_ID,
    name,
    club: String(h.club || ""),
    lat,
    lon,
    golf: !!h.golf,
  };
}

export function fromParsed(parsed, here) {
  const courses =
    Array.isArray(parsed?.courses) && parsed.courses.length
      ? parsed.courses
      : structuredClone(SEED_COURSES);
  const seedIds = new Set(SEED_COURSES.map((s) => s.id));
  const state = {
    courses: courses.map((c) => ({
      ...c,
      golf: typeof c.golf === "boolean" ? c.golf : seedIds.has(c.id),
    })),
    activeId: String(parsed?.activeId || ""),
    tees: parsed?.tees && typeof parsed.tees === "object" ? parsed.tees : {},
    expanded:
      parsed?.expanded && typeof parsed.expanded === "object" ? parsed.expanded : {},
  };
  const hereOk = state.activeId === HERE_ID && here;
  if (!hereOk && !state.courses.some((c) => c.id === state.activeId)) {
    state.activeId = state.courses[0].id;
  }
  return state;
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    return fromParsed(JSON.parse(raw), loadHere());
  } catch {
    return blank();
  }
}

export function snapshot(state, here) {
  return {
    v: 1,
    courses: state.courses,
    activeId: state.activeId,
    tees: state.tees,
    expanded: state.expanded,
    here: here || null,
  };
}

export function parseSnapshot(text) {
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.courses)) throw new Error("bad snapshot");
  const here = normalizeHere(parsed.here);
  return { ...fromParsed(parsed, here), here };
}

export function saveState(state) {
  localStorage.setItem(
    KEY,
    JSON.stringify({
      courses: state.courses,
      activeId: state.activeId,
      tees: state.tees,
      expanded: state.expanded,
    })
  );
}

export function forecastCacheKey(courseId) {
  return `golf-outlook-fc:${courseId}`;
}

export function saveForecast(courseId, data) {
  try {
    localStorage.setItem(forecastCacheKey(courseId), JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function saveHere(place) {
  try {
    if (!place) {
      localStorage.removeItem(HERE_KEY);
      return;
    }
    localStorage.setItem(HERE_KEY, JSON.stringify(place));
  } catch {
    /* quota */
  }
}

export function loadHere() {
  try {
    const raw = localStorage.getItem(HERE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadForecast(courseId) {
  try {
    const raw = localStorage.getItem(forecastCacheKey(courseId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearForecast(courseId) {
  try {
    localStorage.removeItem(forecastCacheKey(courseId));
  } catch {
    /* ignore */
  }
}
