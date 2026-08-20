import app, { JobsStore } from './index.js';

export { JobsStore };

const APPDEPLOY_EXTRACT_URL = 'https://panasonic-sat-servicepro-ugde8c.v2.appdeploy.ai/api/cloudflare-extract-servicepro';
const FALLBACK_MODEL = '@cf/google/gemma-4-26b-a4b-it';
const PROMPT = `Eres un extractor técnico de órdenes Panasonic ServicePro. Extrae únicamente información visible. No inventes. Devuelve SOLO JSON válido con esta estructura exacta: {"customer":{"name":"","phone":"","email":"","address":"","city":""},"servicePro":{"workOrder":"","serviceAppointment":""},"equipment":{"indoorModel":"","outdoorModel":""},"job":{"description":"","errorCode":""},"meta":{"confidence":0,"warnings":[]}}. Mantén literalmente Work Order, Service Appointment, teléfonos, modelos y códigos de error. Busca expresamente códigos Panasonic Hxx, Fxx, Exx y Uxx. Si falta un dato usa cadena vacía. confidence 0-100.`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({
        ok: true,
        service: 'panasonic-sat-servicepro',
        imageAI: 'appdeploy-ai-extract-fast',
        fallback: 'workers-ai',
        textImport: true
      });
    }

    if (url.pathname === '/api/extract' && request.method === 'POST') {
      try {
        const body = await request.json();
        const image = pickImage(body);
        if (!image) return Response.json({ error: 'Se requiere una captura PNG, JPG o WebP' }, { status: 400 });

        const failures = [];
        const accessJwt = request.headers.get('cf-access-jwt-assertion') || '';

        if (accessJwt) {
          try {
            const { data, mimeType } = splitDataUrl(image);
            const response = await fetch(APPDEPLOY_EXTRACT_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Cf-Access-Jwt-Assertion': accessJwt
              },
              body: JSON.stringify({ image: data, mimeType })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(payload?.error || `AppDeploy HTTP ${response.status}`);
            if (payload?.extracted) {
              return Response.json({
                extracted: normalize(payload.extracted),
                provider: 'AppDeploy ai.extract · FAST',
                attempts: Number(payload.attempts) || 1
              });
            }
            throw new Error('AppDeploy no devolvió datos estructurados');
          } catch (error) {
            failures.push(`Extractor principal: ${messageOf(error)}`);
          }
        } else {
          failures.push('No se recibió el JWT de Cloudflare Access');
        }

        try {
          const extracted = await extractWithWorkersAI(image, env.AI);
          if (hasUsefulData(extracted)) {
            return Response.json({
              extracted,
              provider: 'Workers AI · fallback',
              fallback: true,
              warnings: failures
            });
          }
          failures.push('Workers AI devolvió campos vacíos');
        } catch (error) {
          failures.push(`Workers AI: ${messageOf(error)}`);
        }

        return Response.json({
          error: 'No se ha podido leer la captura.',
          details: failures
        }, { status: 502 });
      } catch (error) {
        return Response.json({ error: `No se ha podido analizar la captura: ${messageOf(error)}` }, { status: 502 });
      }
    }

    return app.fetch(request, env, ctx);
  }
};

function pickImage(body) {
  const candidates = [body?.image, ...(Array.isArray(body?.images) ? body.images : [])];
  return candidates.find((value) => typeof value === 'string' && /^data:image\/(png|jpeg|jpg|webp);base64,/i.test(value)) || '';
}

function splitDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) throw new Error('Imagen no válida');
  return {
    mimeType: match[1].toLowerCase().replace('image/jpg', 'image/jpeg'),
    data: match[2]
  };
}

async function extractWithWorkersAI(image, ai) {
  const result = await ai.run(FALLBACK_MODEL, {
    messages: [
      { role: 'system', content: PROMPT },
      { role: 'user', content: 'Lee esta captura de Panasonic ServicePro y extrae los datos solicitados.' }
    ],
    image,
    max_tokens: 1000,
    temperature: 0
  });
  return parseResult(result);
}

function parseResult(result) {
  if (result && typeof result === 'object' && result.customer && result.servicePro) return normalize(result);
  let text = '';
  if (typeof result === 'string') text = result;
  else if (typeof result?.response === 'string') text = result.response;
  else if (typeof result?.choices?.[0]?.message?.content === 'string') text = result.choices[0].message.content;
  else if (typeof result?.result?.response === 'string') text = result.result.response;
  text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  if (!text) throw new Error('La IA no devolvió JSON');
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
    value?.servicePro?.workOrder || value?.servicePro?.serviceAppointment ||
    value?.customer?.name || value?.customer?.phone ||
    value?.equipment?.indoorModel || value?.equipment?.outdoorModel ||
    value?.job?.errorCode || value?.job?.description
  );
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error || 'error desconocido');
}
