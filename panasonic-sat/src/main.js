import app, { JobsStore } from './index.js';

export { JobsStore };

const MODEL = '@cf/google/gemma-4-26b-a4b-it';
const PROMPT = `Eres un extractor OCR/visual técnico especializado en órdenes Panasonic ServicePro. Lee literalmente todo el texto visible de las capturas. No inventes datos ni completes por contexto. Devuelve SOLO un objeto JSON válido, sin markdown ni comentarios, con esta estructura exacta:
{"customer":{"name":"","phone":"","email":"","address":"","city":""},"servicePro":{"workOrder":"","serviceAppointment":""},"equipment":{"indoorModel":"","outdoorModel":""},"job":{"description":"","errorCode":""},"meta":{"confidence":0,"warnings":[]}}
Prioridades: 1) Work Order; 2) Service Appointment; 3) nombre y teléfono del cliente; 4) modelos interior/exterior; 5) avería; 6) código de error. Busca expresamente códigos Panasonic como Hxx, Fxx, Exx, Uxx y variantes alfanuméricas, y consérvalos exactamente. Si un campo no es visible usa cadena vacía. confidence debe ser 0-100.`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({
        ok: true,
        service: 'panasonic-sat-servicepro',
        imageAI: 'workers-ai-vision-v2',
        model: MODEL,
        textImport: true
      });
    }

    if (url.pathname === '/api/extract' && request.method === 'POST') {
      try {
        const body = await request.json();
        const candidates = Array.isArray(body.images) ? body.images : [body.image];
        const images = candidates
          .filter((value) => typeof value === 'string' && /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(value))
          .slice(0, 4);

        if (!images.length) {
          return Response.json({ error: 'Se requiere una captura PNG, JPG o WebP' }, { status: 400 });
        }

        const failures = [];

        // Primary path: documented multimodal message format. The first image is the
        // full screenshot and the following images, when present, are detailed crops.
        try {
          const content = [
            {
              type: 'text',
              text: 'Analiza la captura completa y los recortes de detalle de la misma orden. Haz OCR del texto pequeño. Devuelve únicamente el JSON solicitado.'
            },
            ...images.map((image) => ({
              type: 'image_url',
              image_url: { url: image }
            }))
          ];

          const result = await env.AI.run(MODEL, {
            messages: [
              { role: 'system', content: PROMPT },
              { role: 'user', content }
            ],
            max_tokens: 1400,
            temperature: 0
          });

          const extracted = parseResult(result);
          if (hasUsefulData(extracted)) {
            return Response.json({
              extracted,
              provider: 'Workers AI · Gemma 4 Vision v2',
              imagesUsed: images.length
            });
          }
          failures.push('Gemma Vision devolvió campos vacíos');
        } catch (error) {
          failures.push(`Gemma Vision: ${messageOf(error)}`);
        }

        // Secondary path: Cloudflare's image-to-text/OCR conversion, then structured
        // extraction from the resulting text. This is independent from the raw vision path.
        try {
          const ocrChunks = [];
          for (const [index, image] of images.entries()) {
            const file = dataUrlToFile(image, `servicepro-${index + 1}.jpg`);
            const converted = await env.AI.toMarkdown(file, {
              conversionOptions: {
                image: { descriptionLanguage: 'es' },
                output: { format: 'text' }
              }
            });
            const text = conversionText(converted);
            if (text) ocrChunks.push(text);
          }

          const ocrText = [...new Set(ocrChunks)].join('\n\n--- RECORTE ---\n\n').slice(0, 28000);
          if (!ocrText) throw new Error('OCR no devolvió texto');

          const result = await env.AI.run(MODEL, {
            messages: [
              { role: 'system', content: PROMPT },
              { role: 'user', content: `Texto OCR obtenido de una orden ServicePro. Extrae los campos literalmente:\n\n${ocrText}` }
            ],
            max_tokens: 1200,
            temperature: 0
          });

          const extracted = parseResult(result);
          if (hasUsefulData(extracted)) {
            return Response.json({
              extracted,
              provider: 'Workers AI · OCR + Gemma 4',
              imagesUsed: images.length
            });
          }
          failures.push('OCR + Gemma devolvió campos vacíos');
        } catch (error) {
          failures.push(`OCR: ${messageOf(error)}`);
        }

        return Response.json({
          error: 'No se ha podido leer texto útil de la captura.',
          details: failures
        }, { status: 502 });
      } catch (error) {
        return Response.json({
          error: `No se ha podido analizar la captura: ${messageOf(error)}`
        }, { status: 502 });
      }
    }

    return app.fetch(request, env, ctx);
  }
};

function dataUrlToFile(dataUrl, name) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) throw new Error('Imagen no válida');
  const mime = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { name, blob: new Blob([bytes], { type: mime }) };
}

function conversionText(value) {
  const item = Array.isArray(value) ? value[0] : value;
  if (!item || typeof item !== 'object') return '';
  if (typeof item.data === 'string') return item.data.trim();
  if (typeof item.text === 'string') return item.text.trim();
  return '';
}

function parseResult(result) {
  if (result && typeof result === 'object' && result.customer && result.servicePro) {
    return normalize(result);
  }

  let text = '';
  if (typeof result === 'string') text = result;
  else if (typeof result?.response === 'string') text = result.response;
  else if (typeof result?.choices?.[0]?.message?.content === 'string') text = result.choices[0].message.content;
  else if (typeof result?.result?.response === 'string') text = result.result.response;

  text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  if (!text) throw new Error('La IA no devolvió contenido');
  return normalize(JSON.parse(text));
}

function normalize(value) {
  const str = (v) => typeof v === 'string' ? v.trim() : '';
  const customer = value?.customer || {};
  const servicePro = value?.servicePro || {};
  const equipment = value?.equipment || {};
  const job = value?.job || {};
  const meta = value?.meta || {};
  return {
    customer: {
      name: str(customer.name), phone: str(customer.phone), email: str(customer.email),
      address: str(customer.address), city: str(customer.city)
    },
    servicePro: {
      workOrder: str(servicePro.workOrder), serviceAppointment: str(servicePro.serviceAppointment)
    },
    equipment: {
      indoorModel: str(equipment.indoorModel), outdoorModel: str(equipment.outdoorModel)
    },
    job: {
      description: str(job.description), errorCode: str(job.errorCode)
    },
    meta: {
      confidence: Math.max(0, Math.min(100, Number(meta.confidence) || 0)),
      warnings: Array.isArray(meta.warnings) ? meta.warnings.map(str).filter(Boolean).slice(0, 10) : []
    }
  };
}

function hasUsefulData(value) {
  return Boolean(
    value?.servicePro?.workOrder ||
    value?.servicePro?.serviceAppointment ||
    value?.customer?.name ||
    value?.customer?.phone ||
    value?.equipment?.indoorModel ||
    value?.equipment?.outdoorModel ||
    value?.job?.errorCode ||
    value?.job?.description
  );
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error || 'error desconocido');
}
