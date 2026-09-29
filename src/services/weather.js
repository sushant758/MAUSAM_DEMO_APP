// ─── Weather data service ─────────────────────────────────────────────────────
// Fetches Open-Meteo (forecast + air quality + marine) in parallel.
// Returns a normalized ctx object matching the mockContext shape.
// Falls back to MOCK_CTX on any error.
//
// APIs used (all free, no key, CORS-friendly):
//   Weather:     https://api.open-meteo.com/v1/forecast
//   Air quality: https://air-quality-api.open-meteo.com/v1/air-quality
//   Marine:      https://marine-api.open-meteo.com/v1/marine
// ─────────────────────────────────────────────────────────────────────────────

import { heatIndexC } from '../lib/indices';
import { MOCK_CTX } from './mockContext';

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const LS_CACHE_KEY  = 'mausam.wxCache.v1';
const FETCH_TIMEOUT = 10_000; // 10 s AbortController timeout

// ─── Cache helpers ────────────────────────────────────────────────────────────
function cacheKey(lat, lon) {
  return `${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

function readCache(lat, lon) {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw);
    const entry = store[cacheKey(lat, lon)];
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry;
  } catch { return null; }
}

function writeCache(lat, lon, ctx) {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    const store = raw ? JSON.parse(raw) : {};
    store[cacheKey(lat, lon)] = { ...ctx, fetchedAt: Date.now() };
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(store));
  } catch {}
}

// ─── Fetch with timeout ───────────────────────────────────────────────────────
async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    clearTimeout(tid);
    throw e;
  }
}

// ─── Build hourly rows from API response ──────────────────────────────────────
function buildHourlyRows(wxData, aqData) {
  const times  = wxData.hourly?.time ?? [];
  const nowHour = new Date().getHours();
  const today = new Date().toISOString().slice(0, 10);

  return times
    .map((t, i) => {
      if (!t.startsWith(today)) return null; // today only
      const hour = new Date(t).getHours();
      const temp = wxData.hourly.temperature_2m?.[i] ?? MOCK_CTX.weather.temp;
      const rh   = wxData.hourly.relative_humidity_2m?.[i] ?? MOCK_CTX.weather.humidity;
      const hi   = heatIndexC(temp, rh);
      return {
        hour,
        temp,
        humidity: rh,
        rainProb: wxData.hourly.precipitation_probability?.[i] ?? 10,
        visibility: wxData.hourly.visibility?.[i] ?? 10000,
        windSpeed: wxData.hourly.wind_speed_10m?.[i] ?? 8,
        uv: wxData.hourly.uv_index?.[i] ?? 0,
        soilMoisture: wxData.hourly.soil_moisture_0_to_1cm?.[i] ?? 0.28,
        weatherCode: wxData.hourly.weather_code?.[i] ?? 1,
        aqi: aqData?.hourly?.us_aqi?.[i] ?? 50,
        hi,
      };
    })
    .filter(Boolean);
}

// ─── Map WMO weather code to a short condition string ─────────────────────────
function codeToCondition(code) {
  if (code === 0) return 'Clear Sky';
  if (code <= 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code <= 49) return 'Foggy';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 84) return 'Rain Showers';
  if (code <= 94) return 'Hail';
  return 'Thunderstorm';
}

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * Fetch weather context for a location.
 * @param {{ lat: number, lon: number, name: string, id: string }} location
 * @returns {Promise<typeof MOCK_CTX>}
 */
export async function fetchWeatherCtx(location) {
  const { lat, lon, name, id } = location;

  // 1. Check cache
  const cached = readCache(lat, lon);
  if (cached) return cached;

  try {
    const wxUrl = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${lat}&longitude=${lon}`
      + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`
      + `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,visibility,wind_speed_10m,uv_index,soil_moisture_0_to_1cm,weather_code`
      + `&daily=sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,temperature_2m_min,temperature_2m_max`
      + `&forecast_days=7&timezone=auto`;

    const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality`
      + `?latitude=${lat}&longitude=${lon}`
      + `&current=us_aqi,pm2_5,pm10`
      + `&hourly=us_aqi,pm2_5,pm10`
      + `&timezone=auto`;

    // Marine only attempted for coastal locations (will silently fail inland)
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine`
      + `?latitude=${lat}&longitude=${lon}`
      + `&current=wave_height,sea_surface_temperature`
      + `&hourly=wave_height,wave_period`
      + `&timezone=auto`;

    // 2. Parallel fetch — marine is optional
    const [wxData, aqData, marineData] = await Promise.allSettled([
      fetchWithTimeout(wxUrl),
      fetchWithTimeout(aqUrl),
      fetchWithTimeout(marineUrl),
    ]).then((results) =>
      results.map((r) => (r.status === 'fulfilled' ? r.value : null))
    );

    if (!wxData) throw new Error('Weather fetch failed');

    // 3. Extract current conditions
    const cur = wxData.current ?? {};
    const daily = wxData.daily ?? {};
    const aqCur = aqData?.current ?? {};

    const nowHour = new Date().getHours();
    // Find current hour index in hourly array
    const today = new Date().toISOString().slice(0, 10);
    const curHourIdx = (wxData.hourly?.time ?? []).findIndex(
      (t) => t.startsWith(today) && new Date(t).getHours() === nowHour
    );
    const uvCurrent = curHourIdx >= 0
      ? (wxData.hourly.uv_index?.[curHourIdx] ?? 0)
      : 0;

    const temp     = cur.temperature_2m ?? MOCK_CTX.weather.temp;
    const humidity = cur.relative_humidity_2m ?? MOCK_CTX.weather.humidity;
    const code     = cur.weather_code ?? 1;

    const ctx = {
      city: name,
      lat,
      lon,
      hour: nowHour,
      now: new Date().toISOString(),

      weather: {
        temp,
        feelsLike: cur.apparent_temperature ?? temp,
        humidity,
        weatherCode: code,
        windSpeed: cur.wind_speed_10m ?? 8,
        condition: codeToCondition(code),
        tempMin: daily.temperature_2m_min?.[0] ?? MOCK_CTX.weather.tempMin,
        tempMax: daily.temperature_2m_max?.[0] ?? MOCK_CTX.weather.tempMax,
      },

      uv: {
        current: uvCurrent,
        max: daily.uv_index_max?.[0] ?? MOCK_CTX.uv.max,
      },

      aqi: {
        us_aqi: aqCur.us_aqi ?? MOCK_CTX.aqi.us_aqi,
        pm2_5:  aqCur.pm2_5  ?? MOCK_CTX.aqi.pm2_5,
        pm10:   aqCur.pm10   ?? MOCK_CTX.aqi.pm10,
      },

      marine: marineData?.current
        ? {
            waveHeight:      marineData.current.wave_height ?? null,
            seaSurfaceTemp:  marineData.current.sea_surface_temperature ?? null,
            wavePeriod:      marineData.hourly?.wave_period?.[0] ?? null,
          }
        : null,

      soil: {
        moisture_0_1: wxData.hourly?.soil_moisture_0_to_1cm?.[Math.max(0, curHourIdx)] ?? 0.28,
        moisture_3_9: 0.31, // Open-Meteo 3-9cm not in hourly by default; placeholder
      },

      daily: {
        sunrise: daily.sunrise?.[0]?.slice(11, 16) ?? '06:12',
        sunset:  daily.sunset?.[0]?.slice(11, 16)  ?? '18:38',
        precipSum7d:   daily.precipitation_sum?.slice(0, 7) ?? MOCK_CTX.daily.precipSum7d,
        precipProbMax: daily.precipitation_probability_max?.slice(0, 7) ?? MOCK_CTX.daily.precipProbMax,
        tempMin7d: daily.temperature_2m_min?.slice(0, 7) ?? MOCK_CTX.daily.tempMin7d,
        tempMax7d: daily.temperature_2m_max?.slice(0, 7) ?? MOCK_CTX.daily.tempMax7d,
      },

      hourly: buildHourlyRows(wxData, aqData),

      warnings: [],   // Production: IMD feed replaces this

      isLive: true,
      fetchedAt: Date.now(),
    };

    // 4. Cache and return
    writeCache(lat, lon, ctx);
    return ctx;

  } catch (err) {
    console.warn('[Mausam] Weather fetch failed, using mock:', err.message);
    return {
      ...MOCK_CTX,
      city: name,
      lat,
      lon,
      hour: new Date().getHours(),
      now: new Date().toISOString(),
      isLive: false,
      fetchedAt: Date.now(),
    };
  }
}

/** Invalidate the cache entry for a given location (call after explicit refresh). */
export function invalidateWeatherCache(lat, lon) {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    if (!raw) return;
    const store = JSON.parse(raw);
    delete store[cacheKey(lat, lon)];
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(store));
  } catch {}
}
