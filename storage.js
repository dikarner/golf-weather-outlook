const KEY = "golf-outlook-v1";

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

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.courses) || !parsed.courses.length) {
      parsed.courses = structuredClone(SEED_COURSES);
    }
    const seedIds = new Set(SEED_COURSES.map((s) => s.id));
    parsed.courses = parsed.courses.map((c) => ({
      ...c,
      golf: typeof c.golf === "boolean" ? c.golf : seedIds.has(c.id),
    }));
    if (!parsed.courses.some((c) => c.id === parsed.activeId)) {
      parsed.activeId = parsed.courses[0].id;
    }
    parsed.tees = parsed.tees || {};
    parsed.expanded = parsed.expanded || {};
    return parsed;
  } catch {
    return blank();
  }
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

export function loadForecast(courseId) {
  try {
    const raw = localStorage.getItem(forecastCacheKey(courseId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
