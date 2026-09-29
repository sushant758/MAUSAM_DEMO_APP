// ─── api/chat.js ─────────────────────────────────────────────────────────────
// Serverless function: POST /api/chat
// Works on Vercel (file-based routing) and Netlify (with netlify.toml redirect).
//
// Request body:
//   { messages: [{role:'user'|'assistant', content: string}],
//     personaId: string,
//     locationName: string,
//     weatherSummary: string,
//     lang: 'en' | 'hi'  — A7: reply language }
//
// Response:
//   { reply: string }
//
// Environment variable (set on host, NEVER in frontend code):
//   GEMINI_API_KEY  or  OPENAI_API_KEY
//
// If neither key is set, returns 503 → frontend falls back to rule-based engine.
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const {
    messages = [],
    personaId = 'health',
    locationName = '',
    weatherSummary = '',
    lang = 'en',  // A7: 'en' | 'hi'
  } = req.body ?? {};

  // ── Build system prompt (A7: language-aware) ──────────────────────────────
  const langInstruction = lang === 'hi'
    ? 'IMPORTANT: Reply in natural, simple Hindi (Devanagari script). Keep these terms in English: AQI, PM2.5, PM10, UV, UV Index, IMD, US EPA, Open-Meteo, °C, °F, µg/m³, city names, Mausam. Numbers stay as digits.'
    : 'Reply in English.';

  const systemPrompt = [
    `You are Mausam, an expert Indian weather assistant. Answer concisely (2-4 sentences).`,
    langInstruction,
    `Active persona: ${personaId}.`,
    `Location: ${locationName || 'unknown'}.`,
    weatherSummary ? `Current conditions: ${weatherSummary}.` : '',
    `Rules:`,
    `- Focus on weather, outdoor safety, health, or farming/travel/event advice.`,
    `- Never give medical diagnoses or prescriptions.`,
    `- If the question is unrelated to weather/outdoors, politely redirect.`,
    `- Use °C unless the user specifies otherwise.`,
    `- Be warm, practical, and India-aware (monsoon, AQI, UV, heat, fog, cyclones).`,
  ].filter(Boolean).join(' ');

  // ── Try Gemini first, then OpenAI, then fail with 503 ─────────────────────
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (GEMINI_KEY) {
    try {
      const geminiMessages = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: geminiMessages,
            generationConfig: { maxOutputTokens: 256, temperature: 0.7 },
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (reply) return res.status(200).json({ reply });
      }
    } catch (err) {
      console.error('[api/chat] Gemini error:', err.message);
    }
  }

  if (OPENAI_KEY) {
    try {
      const oaiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages,
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: oaiMessages,
          max_tokens: 256,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content ?? '';
        if (reply) return res.status(200).json({ reply });
      }
    } catch (err) {
      console.error('[api/chat] OpenAI error:', err.message);
    }
  }

  // No key configured → frontend will use rule-based fallback
  return res.status(503).json({ error: 'No LLM key configured — use rule-based fallback' });
}
