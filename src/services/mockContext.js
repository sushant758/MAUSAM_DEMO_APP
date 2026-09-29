// ─── Mock weather context ─────────────────────────────────────────────────────
// Shape matches the live ctx returned by weather.js.
// Used as fallback when the API is unavailable or the location has no lat/lon.
// ALL cards that use this data must show "Mock data" in their source chip.
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_CTX = {
  city: 'Indiranagar, Bengaluru',
  lat: 12.97,
  lon: 77.59,
  hour: new Date().getHours(),
  now: new Date().toISOString(),

  weather: {
    temp: 24,               // °C
    feelsLike: 25,          // °C apparent
    humidity: 52,           // %
    weatherCode: 1,         // WMO: 0=clear, 1=mainly clear, 2=partly cloudy, 3=overcast
    windSpeed: 8,           // km/h
    condition: 'Partly Sunny',
    tempMin: 18,            // daily low °C
    tempMax: 28,            // daily high °C
  },

  uv: {
    current: 3,             // current hour UV index
    max: 7,                 // daily UV max
  },

  aqi: {
    us_aqi: 38,             // US AQI
    pm2_5: 8.2,             // µg/m³
    pm10: 14.5,             // µg/m³
  },

  marine: null,             // null for inland locations; set for coastal

  soil: {
    moisture_0_1: 0.28,     // m³/m³ (0–1 cm depth)
    moisture_3_9: 0.31,     // m³/m³ (3–9 cm depth)
  },

  daily: {
    sunrise: '06:12',
    sunset: '18:38',
    precipSum7d: [0, 2, 0, 0, 12, 1, 0],    // mm per day, next 7 days
    precipProbMax: [5, 20, 5, 10, 80, 30, 5], // % max daily rain probability
    tempMin7d: [18, 17, 18, 19, 16, 17, 18],
    tempMax7d: [28, 26, 29, 30, 24, 27, 28],
  },

  // Hourly rows for bestWindow() — 24 rows, one per hour 0-23
  hourly: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    temp: 20 + Math.sin((h - 6) * Math.PI / 12) * 6,
    humidity: 55 - Math.sin((h - 6) * Math.PI / 12) * 10,
    rainProb: h >= 14 && h <= 18 ? 30 : 5,
    visibility: h >= 5 && h <= 8 ? 8000 : 10000, // metres
    windSpeed: 8,
    uv: h >= 6 && h <= 18 ? Math.round(7 * Math.sin(((h - 6) / 12) * Math.PI)) : 0,
    soilMoisture: 0.28,
    weatherCode: 1,
    // hi (heat index) is computed lazily by weather.js when building hourly rows
    hi: 0, // placeholder; real value computed after fetch
    aqi: 38,
  })),

  warnings: [],   // shape: [{id, level:'yellow'|'orange'|'red', type, text, validUntil, area}]

  isLive: false,
  fetchedAt: Date.now(),
};
