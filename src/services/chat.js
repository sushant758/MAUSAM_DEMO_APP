// ─── src/services/chat.js ─────────────────────────────────────────────────────
// A6 + A7: Shared AI chat service with language support.
//
// Tries POST /api/chat (serverless, LLM on server).
// Falls back to ruleBasedReply() if /api/chat returns 503, 404, or network error.
// NO API keys ever enter this file or any other frontend file.
// A7: Accepts lang='en'|'hi' and replies in the active language.
// ─────────────────────────────────────────────────────────────────────────────

// ── Rule-based fallback engine ────────────────────────────────────────────────
// Covers the most common weather queries without any LLM.
// Returns a string reply in the requested language.

const RULES_EN = [
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

  // Greeting
  { re: /^(hi|hello|hey|namaste|helo|good morning|good evening)/i,
    reply: (ctx) => `Hello! I'm your Mausam Weather Assistant for ${ctx.location}. Ask me about rain, AQI, UV, heat, travel safety, farming, or anything weather-related!` },

  // Help
  { re: /\bhelp|what can you|what do you/i,
    reply: () => `I can answer questions about: 🌧️ Rain probability, 🌡️ Temperature & heat index, 💨 AQI & air quality, ☀️ UV Index, 🌾 Farming advice, 🚗 Travel & visibility, 🏖️ Beach conditions, and 🎉 Outdoor event safety. Just ask!` },
];

const RULES_HI = [
  { re: /\bबारिश|छाता|वर्षा|बरसात|rain\b|umbrella/i,
    reply: (ctx) => ctx.rain >= 70
      ? `हाँ, आज बारिश की बहुत अधिक संभावना है (${ctx.rain}%)। छाता साथ रखें और यात्रा में अतिरिक्त समय रखें।`
      : ctx.rain >= 40
      ? `बारिश की मध्यम संभावना है (${ctx.rain}%)। छाता पास रखें।`
      : `आज बारिश की संभावना कम है (${ctx.rain}%)। मौसम शुष्क रहेगा!` },

  { re: /\bगर्मी|तापमान|ठंडा|hot\b|heat\b|temp\b|warm\b|cool\b|cold\b/i,
    reply: (ctx) => {
      const disp = `${ctx.tempC}°C`;
      if (ctx.tempC >= 38) return `${ctx.location} में बहुत गर्मी है (${disp})। दोपहर 12–4 बजे बाहर न जाएँ, पानी पिएँ और सनस्क्रीन लगाएँ।`;
      if (ctx.tempC >= 30) return `${ctx.location} में ${disp} तापमान है। छाँव में रहें और पानी पीते रहें।`;
      if (ctx.tempC <= 12) return `${ctx.location} में ठंड है (${disp})। बाहर जाते समय गर्म कपड़े पहनें।`;
      return `${ctx.location} में तापमान ${disp} है — आरामदायक मौसम।`;
    }},

  { re: /\bAQI|वायु|प्रदूषण|air quality/i,
    reply: (ctx) => ctx.aqi >= 200
      ? `⚠️ ${ctx.location} में AQI ${ctx.aqi} है (बहुत अस्वास्थ्यकर)। बाहर व्यायाम न करें। N95 मास्क लगाएँ। खिड़कियाँ बंद रखें।`
      : ctx.aqi >= 150
      ? `AQI ${ctx.aqi} है (अस्वास्थ्यकर)। संवेदनशील लोग घर के अंदर रहें।`
      : `AQI ${ctx.aqi} है (${ctx.aqi <= 50 ? 'अच्छा' : 'मध्यम'})। अधिकांश बाहरी गतिविधियों के लिए ठीक है।` },

  { re: /\bUV|सनस्क्रीन|सूरज/i,
    reply: (ctx) => ctx.uv >= 8
      ? `UV Index ${ctx.uv} है (बहुत उच्च)। हर 2 घंटे में SPF 50+ सनस्क्रीन लगाएँ, टोपी पहनें और सुबह 11 से 3 बजे तक छाँव में रहें।`
      : ctx.uv >= 6
      ? `UV Index ${ctx.uv} है (उच्च)। SPF 30+ सनस्क्रीन लगाएँ।`
      : `UV Index ${ctx.uv} है (${ctx.uv <= 2 ? 'कम' : 'मध्यम'})। सामान्य सावधानी पर्याप्त है।` },

  { re: /\bहवा|पवन|wind\b|storm\b/i,
    reply: (ctx) => ctx.wind > 50
      ? `हवा तेज़ है — ${ctx.wind} km/h। बाहर जाने से बचें, हल्की वस्तुओं को सुरक्षित करें।`
      : ctx.wind > 25
      ? `आज हल्की तेज़ हवा है (${ctx.wind} km/h)। मौसम की खबर पर ध्यान रखें।`
      : `हवा शांत है (${ctx.wind} km/h)। कोई समस्या नहीं।` },

  { re: /\bआर्द्रता|उमस|feels like|humid/i,
    reply: (ctx) => ctx.hi >= 41
      ? `ताप सूचकांक ${ctx.hi.toFixed(0)}°C है — खतरनाक गर्मी। बाहरी गतिविधि कम करें।`
      : `उमस के साथ ${ctx.hi.toFixed(0)}°C जैसा लग रहा है। पानी पीते रहें।` },

  { re: /\bफसल|खेत|सिंचाई|मिट्टी|किसान|farm\b|crop\b|soil\b/i,
    reply: (ctx) => `खेती की सलाह: तापमान ${ctx.tempC}°C, वर्षा संभावना ${ctx.rain}%। ${ctx.rain >= 60 ? 'बारिश की उम्मीद है — सिंचाई रोकें। कीटनाशक न छिड़कें।' : ctx.wind > 20 ? 'हवा तेज़ है — छिड़काव न करें। मिट्टी की नमी जाँचें।' : 'खेत के काम के लिए अच्छी स्थिति। सुबह 6–9 बजे सबसे अच्छा समय।'}` },

  { re: /\bयात्रा|सड़क|ड्राइव|कोहरा|दृश्यता|travel\b|drive\b|fog\b/i,
    reply: (ctx) => ctx.vis < 500
      ? `⚠️ दृश्यता बहुत कम है (${ctx.vis}m)। कोहरे में गाड़ी न चलाएँ।`
      : ctx.rain >= 60
      ? `भारी बारिश की संभावना है (${ctx.rain}%)। यात्रा में अतिरिक्त समय रखें।`
      : `यात्रा की स्थिति ठीक है — तापमान ${ctx.tempC}°C, ${ctx.rain}% बारिश संभावना।` },

  { re: /\bआयोजन|पार्टी|समारोह|शाम|event\b|party\b|outdoor\b/i,
    reply: (ctx) => ctx.rain >= 50
      ? `बारिश की संभावना है (${ctx.rain}%)। बाहरी आयोजन के लिए इनडोर विकल्प तैयार रखें।`
      : `बाहरी आयोजन के लिए अच्छी स्थिति — ${ctx.tempC}°C, ${ctx.rain}% बारिश संभावना।` },

  { re: /\bसमुद्र|बीच|तैराकी|लहर|beach\b|swim\b|wave\b/i,
    reply: (ctx) => `समुद्र तट: UV ${ctx.uv}, हवा ${ctx.wind} km/h। ${ctx.rain >= 50 ? 'बारिश की उम्मीद है — स्थानीय सलाह जाँचें।' : 'समुद्र तट जाने के लिए अच्छा दिन है।'}` },

  { re: /^(नमस्ते|हैलो|hi\b|hello\b|hey\b)/i,
    reply: (ctx) => `नमस्ते! मैं ${ctx.location} के लिए आपका Mausam मौसम सहायक हूँ। बारिश, AQI, UV, गर्मी या यात्रा सुरक्षा के बारे में कुछ भी पूछें!` },

  { re: /\bसहायता|मदद|help\b/i,
    reply: () => `मैं इन विषयों पर सहायता कर सकता हूँ: 🌧️ वर्षा संभावना, 🌡️ तापमान, 💨 AQI, ☀️ UV Index, 🌾 खेती, 🚗 यात्रा, 🏖️ समुद्र तट, 🎉 आयोजन।` },
];

/** Pure rule-based reply — always works, no network needed. */
function ruleBasedReply(query, ctx, lang) {
  const rules = lang === 'hi' ? RULES_HI : RULES_EN;

  // Try language-specific rules first
  for (const rule of rules) {
    if (rule.re.test(query)) return rule.reply(ctx);
  }

  // If HI and no HI rule matched, try EN rules (most queries will be typed in EN)
  if (lang === 'hi') {
    for (const rule of RULES_EN) {
      if (rule.re.test(query)) {
        // We got an EN match — still reply in Hindi with generic template
        const en = rule.reply(ctx);
        if (en) return en; // The EN reply is still intelligible; user typed EN
      }
    }
  }

  // Default fallback in active language
  return lang === 'hi'
    ? `मैं ${ctx.location} के लिए आपका Mausam सहायक हूँ। अभी ${ctx.tempC}°C है, ${ctx.rain}% वर्षा संभावना। बारिश, AQI, UV, यात्रा या खेती के बारे में पूछें!`
    : `I'm your Mausam assistant for ${ctx.location}. Currently ${ctx.tempC}°C with ${ctx.rain}% rain probability. Ask me about rain, AQI, UV, travel safety, or farming advice!`;
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
 * @param {object}   ctx         — Weather context
 * @param {string}   lang        — 'en' | 'hi' (A7: reply in this language)
 * @returns {Promise<string>}    — Bot reply text
 */
export async function sendChatMessage(query, history, personaId, ctx, lang = 'en') {
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
        lang,            // A7: tell the server to reply in this language
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data.reply) return data.reply;
    }
    // 503 = no key configured; 404 = gh-pages (no server); fallthrough to rule-based
  } catch {
    // Network error, timeout, CORS on gh-pages → rule-based
  }

  // ── Rule-based fallback in active language ────────────────────────────────
  return ruleBasedReply(query, safeCtx, lang);
}
