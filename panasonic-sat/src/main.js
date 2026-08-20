import app, { JobsStore } from './index.js';

export { JobsStore };

const APPDEPLOY_EXTRACT_URL = 'https://panasonic-sat-servicepro-ugde8c.v2.appdeploy.ai/api/cloudflare-extract-servicepro';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({
        ok: true,
        service: 'panasonic-sat-servicepro',
        imageAI: 'appdeploy-ai-extract-fast-exact',
        preprocessing: '1600px-2mp-jpeg-086',
        textImport: true
      });
    }

    if (url.pathname === '/api/extract' && request.method === 'POST') {
      try {
        const body = await request.json();
        const image = typeof body?.image === 'string' ? body.image : '';
        if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(image)) {
          return Response.json({ error: 'Se requiere una captura PNG, JPG o WebP' }, { status: 400 });
        }

        const accessJwt = getAccessJwt(request);
        if (!accessJwt) {
          return Response.json({
            error: 'Cloudflare Access no ha entregado el token de sesión al Worker. Vuelve a entrar en la aplicación.'
          }, { status: 401 });
        }

        const { data, mimeType } = splitDataUrl(image);
        const response = await fetch(APPDEPLOY_EXTRACT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessJwt}`
          },
          body: JSON.stringify({ image: data, mimeType })
        });

        const raw = await response.text();
        let payload = {};
        try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = {}; }

        if (!response.ok) {
          return Response.json({
            error: payload?.error || `Extractor AppDeploy HTTP ${response.status}`,
            bridgeStatus: response.status
          }, { status: 502 });
        }

        if (!payload?.extracted) {
          return Response.json({
            error: 'El extractor AppDeploy no devolvió datos estructurados.'
          }, { status: 502 });
        }

        return Response.json({
          extracted: normalize(payload.extracted),
          provider: 'AppDeploy ai.extract · FAST · exacto',
          attempts: Number(payload.attempts) || 1
        });
      } catch (error) {
        return Response.json({
          error: `No se ha podido analizar la captura: ${messageOf(error)}`
        }, { status: 502 });
      }
    }

    return app.fetch(request, env, ctx);
  }
};

function getAccessJwt(request) {
  const header = request.headers.get('cf-access-jwt-assertion');
  if (header) return header.trim();

  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)CF_Authorization=([^;]+)/i);
  if (!match?.[1]) return '';
  try { return decodeURIComponent(match[1]).trim(); }
  catch { return match[1].trim(); }
}

function splitDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) throw new Error('Imagen no válida');
  return {
    mimeType: match[1].toLowerCase().replace('image/jpg', 'image/jpeg'),
    data: match[2]
  };
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
      name: str(customer.name),
      phone: str(customer.phone),
      email: str(customer.email),
      address: str(customer.address),
      city: str(customer.city)
    },
    servicePro: {
      workOrder: str(servicePro.workOrder),
      serviceAppointment: str(servicePro.serviceAppointment)
    },
    equipment: {
      indoorModel: str(equipment.indoorModel),
      outdoorModel: str(equipment.outdoorModel)
    },
    job: {
      description: str(job.description),
      errorCode: str(job.errorCode)
    },
    meta: {
      confidence: Math.max(0, Math.min(100, Number(meta.confidence) || 0)),
      warnings: Array.isArray(meta.warnings) ? meta.warnings.map(str).filter(Boolean).slice(0, 10) : []
    }
  };
}

function messageOf(error) {
  return error instanceof Error ? error.message : String(error || 'error desconocido');
}
