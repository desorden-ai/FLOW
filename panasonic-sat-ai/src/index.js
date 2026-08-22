import { GoogleGenAI } from '@google/genai';
import {
  ALLOWED_ORIGINS,
  EXTRACTION_SCHEMA,
  MODEL,
  clientRateKey,
  corsHeaders,
  httpError,
  normalize,
  parseAndValidateInput
} from './core.js';

const PROMPT = `Extrae únicamente los datos visibles de una orden Panasonic ServicePro.
No inventes ni completes por contexto. Si falta un valor, devuelve cadena vacía.
Conserva literalmente Work Order, Service Appointment, teléfono, modelos y código de error.
confidence debe estar entre 0 y 100; warnings debe explicar lecturas dudosas sin incluir datos innecesarios.`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin') || '';
    const headers = corsHeaders(origin);

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ ok: true, service: 'panasonic-sat-servicepro-ai', provider: 'Gemini', model: MODEL, configured: Boolean(env.GEMINI_API_KEY) }, 200, headers);
    }
    if (url.pathname !== '/api/extract-servicepro') return json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada.' } }, 404, headers);
    if (!ALLOWED_ORIGINS.has(origin)) return json({ error: { code: 'ORIGIN_DENIED', message: 'Origen no autorizado.' } }, 403, headers);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Método no permitido.' } }, 405, headers);
    if (!env.GEMINI_API_KEY) return json({ error: { code: 'AI_NOT_CONFIGURED', message: 'La IA no está configurada.' } }, 503, headers);

    try {
      const rate = await env.AI_RATE_LIMITER.limit({ key: clientRateKey(request) });
      if (!rate.success) throw httpError(429, 'RATE_LIMITED', 'Demasiadas lecturas. Espera un minuto.');
      const contentLength = Number(request.headers.get('content-length'));
      const input = parseAndValidateInput(await request.json(), contentLength);
      const parts = [{ text: `${PROMPT}\n\n${input.text ? `Texto ServicePro:\n${input.text}` : 'Analiza la captura adjunta.'}` }];
      if (input.image) parts.push({ inlineData: { data: input.image, mimeType: input.mimeType } });

      const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
      const response = await withTimeout(ai.models.generateContent({
        model: MODEL,
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: EXTRACTION_SCHEMA,
          maxOutputTokens: 2_048
        }
      }), 35_000);
      const parsed = JSON.parse(response.text || '{}');
      return json({ extracted: normalize(parsed), provider: 'Gemini', model: MODEL }, 200, headers);
    } catch (error) {
      const status = Number(error?.status) || (error instanceof SyntaxError ? 400 : 502);
      const code = String(error?.code || (status === 400 ? 'INVALID_JSON' : 'AI_UPSTREAM_ERROR'));
      if (status >= 500) console.error('AI extraction failed', { code, status });
      return json({ error: { code, message: status >= 500 ? 'No se ha podido analizar la captura.' : error.message } }, status, headers);
    }
  }
};

async function withTimeout(promise, milliseconds) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(httpError(504, 'AI_TIMEOUT', 'La IA ha tardado demasiado.')), milliseconds); })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), { status, headers });
}
