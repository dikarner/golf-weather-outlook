const de = {
  title: "Golf-Prognose",
  places: "Orte",
  refresh: "Aktualisieren",
  round: "Runde",
  roundTitle: "Runde – Wetterprognose",
  mix: "Mix",
  modelsInfoTitle: "Welche Modelle?",
  modelsInfoLead:
    "Die kompakte Ansicht ist ein gewichteter Mix. Feinere Gitter zählen mehr, und die Gewichte wechseln mit dem Tag. „+ Alle Modelle“ zeigt den Mix und jedes Einzelmodell.",
  modelsInfoCodes:
    "Sonne, Nebel und Gewitter werden nicht gemittelt. Gewitter oder Nebel gelten, sobald ein Modell im Mix sie zeigt.",
  modelsInfoPop:
    "Regenwahrscheinlichkeit (%) kommt aus den Ensemble-Läufen von ICON-D2, ICON-EU und IFS. ALADIN liefert keine %.",
  modelsInfoWeights: "Gewichte nach Tagen (nur Modelle mit Daten)",
  modelAbout_D2: "DWD, ~2 km, ~2 Tage. Heute und morgen der Hauptbeitrag. Gut für lokale Schauer in Österreich.",
  modelAbout_EU: "DWD, ~7 km, ~5 Tage. Die Brücke für die Tage 2–5.",
  modelAbout_ALD: "CHMI, ~2 km, ~3 Tage. Besonders nützlich in Ostösterreich, Burgenland und Ungarn.",
  modelAbout_IFS: "ECMWF, ~25 km, ~15 Tage. Ab Tag 6 praktisch allein.",
  golfPlace: "Golfplatz",
  golfPlaceHint: "Golfplatz — Abschlagzeit und Rundenfenster anzeigen",
  clubName: "Golfclub / Untertitel",
  editPlace: "Ort bearbeiten",
  golfHit: "Golfplatz",
  golfNearby: "Golfclub: {name}",
  colTime: "Zeit",
  colTemp: "Temp",
  colRain: "Regen",
  colWind: "Wind",
  outlook: "Prognose",
  course: "Platz",
  close: "Schließen",
  placesHint:
    "Golfplätze oder Orte. Öffnen setzt den aktuellen Ort (Atzenbrugg ist der Standard nach einer Neuinstallation).",
  addPlace: "Ort hinzufügen",
  addPlaceTitle: "Ort hinzufügen",
  nameToShow: "Anzeigename",
  search: "Suche",
  searchPh: "Ort, Gemeinde oder Golfclub",
  searchAustria: "In Österreich suchen",
  searchWorld: "Alle Länder",
  save: "Speichern",
  teeTime: "Abschlagzeit",
  teeHint: "24-Stunden-Uhr, auf die Minute. Das Rundenfenster sind 5 Stunden ab diesem Start.",
  date: "Datum",
  time: "Uhrzeit",
  clear: "Löschen",
  day: "Tag",
  further: "Weitere Tage",
  hideModels: "Modelle ausblenden",
  allModels: "+ Alle Modelle",
  radar: "Radar",
  hideRadar: "Radar ausblenden",
  setTee: "Abschlag setzen",
  edit: "Bearbeiten",
  roundWindow: "Rundenfenster",
  noTee: "Keine Abschlagzeit",
  noTeeHint: "Datum und Uhrzeit (24h) auf die Minute eingeben.",
  loading: "Laden…",
  cached: "Cache",
  refreshFail: "Aktualisierung fehlgeschlagen",
  noData: "keine Daten",
  loadingOutlook: "Prognose wird geladen…",
  noForecast: "Noch keine Prognose",
  noHourly: "Keine Stundendaten.",
  noRoundData: "Für dieses Fenster noch keine Modelldaten.",
  searching: "Suche…",
  nothingAt: "Nichts in Österreich. Suche weltweit…",
  noMatches: "Keine Treffer.",
  today: "Heute",
  tomorrow: "Morgen",
  dry: "trocken",
  storm: "Gewitter",
  justNow: "gerade eben",
  minAgo1: "vor 1 Min.",
  minAgo: "vor {n} Min.",
  hAgo1: "vor 1 Std.",
  hAgo: "vor {n} Std.",
  atTee: "am Abschlag",
  hRound: "Std. Runde",
  hours: "Stunden",
  covering: "Stunden",
  open: "Öffnen",
  current: "aktuell",
  radarFail: "Radar konnte nicht geladen werden",
  radarNone: "Keine Radarbilder",
  footer:
    "Prognosen: DWD ICON-D2 / ICON-EU, CHMI ALADIN, ECMWF IFS über Open-Meteo (CC BY). Radar: RainViewer. Persönliche Nutzung.",
};

const en = {
  title: "Golf outlook",
  places: "Places",
  refresh: "Refresh",
  round: "Round",
  roundTitle: "Round – weather forecast",
  mix: "Mix",
  modelsInfoTitle: "Which models?",
  modelsInfoLead:
    "The compact view is a weighted mix. Finer grids count more, and the weights change with the day. “+ All models” shows the mix and each individual model.",
  modelsInfoCodes:
    "Sun, fog and storm are not averaged. Storm or fog counts as soon as any model in the mix shows it.",
  modelsInfoPop:
    "Rain probability (%) comes from the ICON-D2, ICON-EU and IFS ensembles. ALADIN has no %.",
  modelsInfoWeights: "Weights by day (only models that have data)",
  modelAbout_D2: "DWD, ~2 km, ~2 days. Main contribution today and tomorrow. Good for local showers in Austria.",
  modelAbout_EU: "DWD, ~7 km, ~5 days. The bridge for days 2–5.",
  modelAbout_ALD: "CHMI, ~2 km, ~3 days. Especially useful in eastern Austria, Burgenland and Hungary.",
  modelAbout_IFS: "ECMWF, ~25 km, ~15 days. From day 6 almost on its own.",
  golfPlace: "Golf course",
  golfPlaceHint: "Golf course — show tee time and round window",
  clubName: "Club / subtitle",
  editPlace: "Edit place",
  golfHit: "Golf course",
  golfNearby: "Golf club: {name}",
  colTime: "Time",
  colTemp: "Temp",
  colRain: "Rain",
  colWind: "Wind",
  outlook: "Outlook",
  course: "Course",
  close: "Close",
  placesHint:
    "Golf courses or villages. Open sets the current place (Atzenbrugg is the default on a fresh install).",
  addPlace: "Add place",
  addPlaceTitle: "Add place",
  nameToShow: "Name to show",
  search: "Search",
  searchPh: "village, town, or golf club",
  searchAustria: "Search Austria",
  searchWorld: "All countries",
  save: "Save",
  teeTime: "Tee time",
  teeHint: "24-hour clock, to the minute. The round window is 5 hours from this start.",
  date: "Date",
  time: "Time",
  clear: "Clear",
  day: "Day",
  further: "Further days",
  hideModels: "Hide models",
  allModels: "+ All models",
  radar: "Radar",
  hideRadar: "Hide radar",
  setTee: "Set tee time",
  edit: "Edit",
  roundWindow: "Round window",
  noTee: "No tee time set",
  noTeeHint: "Enter a date and 24h time, down to the minute.",
  loading: "Loading…",
  cached: "cached",
  refreshFail: "Could not refresh",
  noData: "no data",
  loadingOutlook: "Loading outlook…",
  noForecast: "No forecast yet.",
  noHourly: "No hourly data.",
  noRoundData: "No model data for this window yet.",
  searching: "Searching…",
  nothingAt: "Nothing in Austria. Trying all countries…",
  noMatches: "No matches.",
  today: "Today",
  tomorrow: "Tomorrow",
  dry: "dry",
  storm: "storm",
  justNow: "just now",
  minAgo1: "1 min ago",
  minAgo: "{n} min ago",
  hAgo1: "1 h ago",
  hAgo: "{n} h ago",
  atTee: "at tee",
  hRound: "h round",
  hours: "hours",
  covering: "covering",
  open: "Open",
  current: "current",
  radarFail: "Radar map failed to load",
  radarNone: "No radar frames",
  footer:
    "Forecasts: DWD ICON-D2 / ICON-EU, CHMI ALADIN, ECMWF IFS via Open-Meteo (CC BY). Radar: RainViewer. Personal use.",
};

const nav = (typeof navigator !== "undefined" && (navigator.language || navigator.userLanguage)) || "en";
export const lang = nav.toLowerCase().startsWith("de") ? "de" : "en";
export const locale = lang === "de" ? "de-AT" : "en-GB";
const pack = lang === "de" ? de : en;

export function t(key, vars) {
  let s = pack[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

export function applyStaticI18n() {
  document.documentElement.lang = lang;
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}
