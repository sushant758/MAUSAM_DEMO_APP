// ─── src/services/chat.js ─────────────────────────────────────────────────────
// A6: Shared AI chat service.
//
// Tries POST /api/chat (serverless, LLM on server).
// Falls back to ruleBasedReply() if /api/chat returns 503, 404, or network error.
// NO API keys ever enter this file or any other frontend file.
// ─────────────────────────────────────────────────────────────────────────────

// ── Rule-based fallback engine ────────────────────────────────────────────────
// Covers the most common weather queries without any LLM.
// Returns a string reply.

const RULES = [
  // Rain
  { re: /\brain\b|umbrella|wet|drizzle|shower/i,
    reply: (ctx) => ctx.rain >= 70
      ? `Yes, rain is very likely today (${ctx.rain}% probability). Carry an umbrella and allow extra travel time.`
      : ctx.rain >= 40
      ? `There's a moderate chance of rain (${ctx.rain}%). Keep an umbrella handy just in case.`
      : `Rain is unlikely today (${ctx.rain}% chance). Enjoy the dry weather!` },

  // Temperature / heat
  { re: /\bhot\b|heat|temp|warm|cool|cold/i,
    reply: (ctx) => {
      const t = ctx.tempC, unit = ctx.tempUnit;
      const disp = unit === 'F' ? `${Math.round(t * 9/5 + 32)}°F` : `${t}°C`;
      if (t >= 38) return `It's very hot at ${disp} in ${ctx.location}. Stay indoors during 12–4 PM, drink plenty of water, and use sunscreen.`;
      if (t >= 30) return `It's warm at ${disp} in ${ctx.location}. Stay hydrated and seek shade during peak afternoon hours.`;
      if (t <= 12) return `It's cold at ${disp} in ${ctx.location}. Wear layers and a jacket when stepping out.`;
      return `The temperature in ${ctx.location} is a comfortable ${disp}.`;
    }},

  // AQI / air quality
  { re: /\baqi\b|air quality|pollution|pm2|smog|dust/i,
    reply: (ctx) => ctx.aqi >= 200
      ? `⚠️ AQI is ${ctx.aqi} (Very Unhealthy) in ${ctx.location}. Avoid outdoor exercise. Wear an N95 mask if you must go out. Keep windows closed.`
      : ctx.aqi >= 150
      ? `AQI is ${ctx.aqi} (Unhealthy) today. Sensitive groups should stay indoors. Use an air purifier if you have one.`
      : ctx.aqi >= 100
      ? `AQI is ${ctx.aqi} (Unhealthy for Sensitive Groups). Children, elderly, and those with respiratory issues should limit prolonged outdoor activity.`
      : `Air quality is ${ctx.aqi <= 50 ? 'Good' : 'Moderate'} (AQI ${ctx.aqi}). Fine for most outdoor activities.` },

  // UV
  { re: /\buv\b|sunscreen|sunburn|sun protection/i,
    reply: (ctx) => ctx.uv >= 8
      ? `UV Index is ${ctx.uv} (Very High). Apply SPF 50+ sunscreen every 2 hours, wear a hat, and stay in the shade between 11 AM and 3 PM.`
      : ctx.uv >= 6
      ? `UV Index is ${ctx.uv} (High). Use SPF 30+ sunscreen and protective clothing for extended outdoor time.`
      : `UV Index is ${ctx.uv} (${ctx.uv <= 2 ? 'Low' : 'Moderate'}). Standard precautions are sufficient.` },

  // Wind
  { re: /\bwind|windy|breeze|gale|storm/i,
    reply: (ctx) => ctx.wind > 50
      ? `Winds are strong at ${ctx.wind} km/h. Avoid outdoor activities, secure loose objects, and delay travel if possible.`
      : ctx.wind > 25
      ? `It's breezy today with winds around ${ctx.wind} km/h — good ventilation, but keep an eye on weather alerts.`
      : `Wind is light at ${ctx.wind} km/h. No issues expected.` },

  // Humidity / feels like
  { re: /humid|feels like|heat index|muggy|sweaty/i,
    reply: (ctx) => ctx.hi >= 41
      ? `The heat index is ${ctx.hi.toFixed(0)}°C — dangerously hot. Reduce outdoor activity and watch for signs of heat exhaustion.`
      : ctx.hi >= 32
      ? `With the humidity, it feels like ${ctx.hi.toFixed(0)}°C. Stay in the shade and drink water frequently.`
      : `Humidity is moderate. Feels like ${ctx.hi.toFixed(0)}°C — manageable with light clothing.` },

  // Farming / soil
  { re: /\bfarm|crop|soil|irrigat|sow|harvest|spray|fertiliz/i,
    reply: (ctx) => `For farming advice: current temp is ${ctx.tempC}°C with ${ctx.rain}% rain probability. ${ctx.rain >= 60 ? 'Hold off on irrigation — rain is expected. Avoid spraying pesticides.' : ctx.wind > 20 ? 'Wind speeds are high — postpone spraying. Check soil moisture before irrigating.' : 'Conditions are suitable for field work. Morning hours (6–9 AM) are best to avoid peak heat.'}` },

  // Travel
  { re: /\btravel|drive|road|flight|visibility|fog/i,
    reply: (ctx) => ctx.vis < 500
      ? `⚠️ Visibility is very low (${ctx.vis}m). Avoid driving in fog — use fog lights and keep a safe following distance.`
      : ctx.rain >= 60
      ? `Heavy rain expected (${ctx.rain}% probability). Allow extra travel time and check road conditions before departing.`
      : `Travel conditions look fine today. Temperature ${ctx.tempC}°C, ${ctx.rain}% rain chance.` },

  // Outdoor events / evening
  { re: /\bevent|party|outdoor|picnic|evening|sunset/i,
    reply: (ctx) => ctx.rain >= 50
      ? `Rain is likely (${ctx.rain}%). Have a backup indoor venue or a canopy ready for outdoor events.`
      : ctx.tempC >= 35
      ? `It'll be hot (${ctx.tempC}°C). Schedule outdoor events in the early morning or after 5 PM. Provide shade and water.`
      : `Great conditions for outdoor events — ${ctx.tempC}°C with ${ctx.rain}% rain chance.` },

  // Beach / swimming
  { re: /\bbeach|swim|surf|wave|sea|ocean|coastal/i,
    reply: (ctx) => `Beach conditions: UV is ${ctx.uv} (${ctx.uv >= 8 ? 'Very High — apply heavy SPF' : ctx.uv >= 6 ? 'High — use SPF 30+' : 'moderate'}), wind at ${ctx.wind} km/h. ${ctx.rain >= 50 ? 'Rain expected — check local advisories before heading out.' : 'Looks good for a beach visit — check local tide timings.'}` },

  // General greeting / what can you do
  { re: /^(hi|hello|hey|namaste|helo|good morning|good evening)/i,
    reply: (ctx) => `Hello! I'm your Mausam Weather Assistant for ${ctx.location}. Ask me about rain, AQI, UV, heat, travel safety, farming, or anything weather-related!` },

  // Help
  { re: /\bhelp|what can you|what do you/i,
    reply: () => `I can answer questions about: 🌧️ Rain probability, 🌡️ Temperature & heat index, 💨 AQI & air quality, ☀️ UV Index, 🌾 Farming advice, 🚗 Travel & visibility, 🏖️ Beach conditions, and 🎉 Outdoor event safety. Just ask!` },
];

/** Pure rule-based reply — always works, no network needed. */
function ruleBasedReply(query, ctx) {
  for (const rule of RULES) {
    if (rule.re.test(query)) {
      return rule.reply(ctx);
    }
  }
  // Default fallback
  return `I'm your Mausam assistant for ${ctx.location}. Currently ${ctx.tempC}°C with ${ctx.rain}% rain probability. Ask me about rain, AQI, UV, travel safety, or farming advice!`;
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Send a chat message.
 * 1. Tries POST /api/chat (serverless LLM — no key in frontend).
 * 2. Falls back to ruleBasedReply() on any error or non-200 response.
 *
 * @param {string}   query       — The user's message text
 * @param {Array}    history     — [{role:'user'|'assistant', content:string}, ...]
 * @param {string}   personaId   — Active persona id
 * @param {object}   ctx         — Weather context (tempC, rain, aqi, uv, wind, hi, vis, location, tempUnit)
 * @returns {Promise<string>}    — Bot reply text
 */
export async function sendChatMessage(query, history, personaId, ctx) {
  // Normalise ctx with safe defaults
  const safeCtx = {
    tempC:    ctx?.weather?.temp       ?? 25,
    rain:     ctx?.daily?.precipProbMax?.[0] ?? 10,
    aqi:      ctx?.aqi?.us_aqi         ?? 50,
    uv:       ctx?.uv?.current         ?? 3,
    wind:     ctx?.weather?.windSpeed  ?? 8,
    hi:       ctx?.heatIndex           ?? 26,
    vis:      ctx?.hourlyVis           ?? 10000,
    location: ctx?.locationName        ?? 'your location',
    tempUnit: ctx?.tempUnit            ?? 'C',
  };

  // Build weather summary for the system prompt
  const weatherSummary = [
    `${safeCtx.tempC}°C`,
    `AQI ${safeCtx.aqi}`,
    `UV ${safeCtx.uv}`,
    `${safeCtx.rain}% rain`,
    `wind ${safeCtx.wind} km/h`,
  ].join(', ');

  try {
    const resp = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        messages:       [...history, { role: 'user', content: query }],
        personaId,
        locationName:   safeCtx.location,
        weatherSummary,
      }),
      signal: AbortSignal.timeout(8000),   // 8 s timeout
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.reply) return data.reply;
    }
    // 503 = no key configured; 404 = gh-pages (no server); fallthrough to rule-based
  } catch {
    // Network error, timeout, CORS on gh-pages → rule-based
  }

  // ── Rule-based fallback ──────────────────────────────────────────────────
  return ruleBasedReply(query, safeCtx);
}
