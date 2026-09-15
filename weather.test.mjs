import assert from "node:assert/strict";
import test from "node:test";
import {
  MIX_ID,
  daysAhead,
  modelWeight,
  readHourMix,
  readDayMix,
  hourInVienna,
  daySheetFocusHour,
} from "./weather.js";

const TODAY = "2026-09-05";

test("day sheet focuses current hour today and 07:00 later", () => {
  assert.equal(daySheetFocusHour("2026-09-05", "2026-09-05", "14"), "14:00");
  assert.equal(daySheetFocusHour("2026-09-06", "2026-09-05", "14"), "07:00");
  assert.equal(hourInVienna(new Date("2026-09-05T12:00:00+02:00")), "12");
});

test("daysAhead is calendar days", () => {
  assert.equal(daysAhead("2026-09-05", TODAY), 0);
  assert.equal(daysAhead("2026-09-06", TODAY), 1);
  assert.equal(daysAhead("2026-09-11", TODAY), 6);
});

test("weights follow the usefulness horizon", () => {
  assert.equal(modelWeight("icon_d2", 0), 5);
  assert.equal(modelWeight("icon_d2", 1), 4);
  assert.equal(modelWeight("icon_d2", 2), 1);
  assert.equal(modelWeight("icon_d2", 3), 0);
  assert.equal(modelWeight("chmi_aladin_central_europe_2km", 2), 3);
  assert.equal(modelWeight("chmi_aladin_central_europe_2km", 4), 0);
  assert.equal(modelWeight("icon_eu", 2), 4);
  assert.equal(modelWeight("icon_eu", 5), 2);
  assert.equal(modelWeight("icon_eu", 6), 0);
  assert.equal(modelWeight("ecmwf_ifs025", 0), 1);
  assert.equal(modelWeight("ecmwf_ifs025", 5), 4);
  assert.equal(modelWeight("ecmwf_ifs025", 10), 1);
});

function stub(hours) {
  const time = Object.keys(hours);
  const models = ["icon_d2", "icon_eu", "chmi_aladin_central_europe_2km", "ecmwf_ifs025"];
  const hourly = { time };
  const daily = { time: [...new Set(time.map((t) => t.slice(0, 10)))] };
  for (const m of models) {
    hourly[`temperature_2m_${m}`] = time.map((t) => hours[t][m]?.temp ?? null);
    hourly[`precipitation_${m}`] = time.map((t) => hours[t][m]?.precip ?? null);
    hourly[`precipitation_probability_${m}`] = time.map((t) => hours[t][m]?.precipProb ?? null);
    hourly[`weather_code_${m}`] = time.map((t) => hours[t][m]?.code ?? null);
    hourly[`wind_speed_10m_${m}`] = time.map((t) => hours[t][m]?.wind ?? null);
    hourly[`wind_gusts_10m_${m}`] = time.map((t) => hours[t][m]?.gust ?? null);
    hourly[`wind_direction_10m_${m}`] = time.map((t) => hours[t][m]?.dir ?? null);
    hourly[`apparent_temperature_${m}`] = time.map((t) => hours[t][m]?.temp ?? null);
  }
  const sampleAt = (date) => hours[time.find((t) => t.startsWith(date))];
  for (const m of models) {
    daily[`temperature_2m_max_${m}`] = daily.time.map((d) => sampleAt(d)[m]?.temp ?? null);
    daily[`temperature_2m_min_${m}`] = daily.time.map((d) => sampleAt(d)[m]?.temp ?? null);
    daily[`precipitation_sum_${m}`] = daily.time.map((d) => sampleAt(d)[m]?.precip ?? null);
    daily[`precipitation_probability_max_${m}`] = daily.time.map((d) => sampleAt(d)[m]?.precipProb ?? null);
    daily[`weather_code_${m}`] = daily.time.map((d) => sampleAt(d)[m]?.code ?? null);
    daily[`wind_speed_10m_max_${m}`] = daily.time.map((d) => sampleAt(d)[m]?.wind ?? null);
    daily[`wind_gusts_10m_max_${m}`] = daily.time.map((d) => sampleAt(d)[m]?.gust ?? null);
    daily[`sunrise_${m}`] = daily.time.map((d) => `${d}T06:00`);
    daily[`sunset_${m}`] = daily.time.map((d) => `${d}T20:00`);
  }
  return { hourly, daily };
}

test("mix rain probability skips ALADIN when missing", () => {
  const iso = `${TODAY}T12:00`;
  const data = stub({
    [iso]: {
      icon_d2: { temp: 10, precip: 0, precipProb: 10, code: 0, wind: 5, gust: 5, dir: 0 },
      icon_eu: { temp: 10, precip: 0, precipProb: 0, code: 0, wind: 5, gust: 5, dir: 0 },
      chmi_aladin_central_europe_2km: { temp: 10, precip: 0, precipProb: null, code: 0, wind: 5, gust: 5, dir: 0 },
      ecmwf_ifs025: { temp: 10, precip: 0, precipProb: 71, code: 0, wind: 5, gust: 5, dir: 0 },
    },
  });
  const mix = readHourMix(data, iso, TODAY);
  // (10*5 + 0*2 + 71*1) / 8
  assert.equal(Math.round(mix.precipProb), 15);
  const day = readDayMix(data, TODAY, TODAY);
  assert.equal(Math.round(day.precipProb), 15);
});

test("today mix weights D2 most and does not average WMO codes", () => {
  const iso = `${TODAY}T12:00`;
  const data = stub({
    [iso]: {
      icon_d2: { temp: 20, precip: 0, code: 0, wind: 10, gust: 20, dir: 0 },
      icon_eu: { temp: 10, precip: 0, code: 0, wind: 10, gust: 20, dir: 0 },
      chmi_aladin_central_europe_2km: { temp: 20, precip: 0, code: 95, wind: 10, gust: 20, dir: 0 },
      ecmwf_ifs025: { temp: 0, precip: 8, code: 0, wind: 10, gust: 20, dir: 0 },
    },
  });
  const mix = readHourMix(data, iso, TODAY);
  assert.equal(mix.model, MIX_ID);
  assert.equal(mix.code, 95);
  // (20*5 + 10*2 + 20*3 + 0*1) / 11
  assert.equal(Math.round(mix.temp * 100) / 100, 16.36);
  // (0+0+0+8) / 11
  assert.equal(Math.round(mix.precip * 100) / 100, 0.73);
});

test("vector wind mean of 350° and 10° is near north", () => {
  const iso = `${TODAY}T12:00`;
  const data = stub({
    [iso]: {
      icon_d2: { temp: 10, precip: 0, code: 0, wind: 10, gust: 10, dir: 350 },
      icon_eu: { temp: 10, precip: 0, code: 0, wind: 10, gust: 10, dir: 10 },
      chmi_aladin_central_europe_2km: { temp: 10, precip: 0, code: 0, wind: 10, gust: 10, dir: 0 },
      ecmwf_ifs025: { temp: 10, precip: 0, code: 0, wind: 10, gust: 10, dir: 0 },
    },
  });
  const mix = readHourMix(data, iso, TODAY);
  assert.ok(mix.dir <= 8 || mix.dir >= 352, `dir ${mix.dir}`);
});

test("day +8 uses only IFS even if leftover D2 values exist", () => {
  const date = "2026-09-13";
  const iso = `${date}T12:00`;
  const data = stub({
    [iso]: {
      icon_d2: { temp: 99, precip: 0, code: 0, wind: 1, gust: 1, dir: 0 },
      icon_eu: { temp: 99, precip: 0, code: 0, wind: 1, gust: 1, dir: 0 },
      chmi_aladin_central_europe_2km: { temp: 99, precip: 0, code: 0, wind: 1, gust: 1, dir: 0 },
      ecmwf_ifs025: { temp: 12, precip: 1, code: 61, wind: 20, gust: 30, dir: 180 },
    },
  });
  const mix = readHourMix(data, iso, TODAY);
  assert.equal(mix.model, "ecmwf_ifs025");
  assert.equal(mix.temp, 12);
  assert.deepEqual(mix.models, ["ecmwf_ifs025"]);
  const day = readDayMix(data, date, TODAY);
  assert.equal(day.model, "ecmwf_ifs025");
  assert.notEqual(day.model, MIX_ID);
});
