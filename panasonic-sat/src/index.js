export class JobsStore {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);

    if (request.method === 'GET' && url.pathname === '/jobs') {
      const entries = await this.state.storage.list({ prefix: 'job:' });
      const jobs = [...entries.values()].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      return Response.json({ jobs });
    }

    if (request.method === 'POST' && url.pathname === '/jobs') {
      const body = await request.json();
      const workOrder = clean(body.workOrder);
      if (!workOrder) return jsonError('Work Order es obligatorio', 400);
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const job = normalizeJob({ ...body, id, createdAt: now, updatedAt: now });
      await this.state.storage.put(`job:${id}`, job);
      return Response.json({ job }, { status: 201 });
    }

    if (parts[0] === 'jobs' && parts[1]) {
      const id = parts[1];
      const key = `job:${id}`;
      const existing = await this.state.storage.get(key);
      if (!existing) return jsonError('Trabajo no encontrado', 404);

      if (request.method === 'PUT') {
        const body = await request.json();
        const job = normalizeJob({ ...existing, ...body, id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() });
        if (!job.workOrder) return jsonError('Work Order es obligatorio', 400);
        await this.state.storage.put(key, job);
        return Response.json({ job });
      }

      if (request.method === 'DELETE') {
        await this.state.storage.delete(key);
        return Response.json({ deleted: true });
      }
    }

    return jsonError('Ruta no encontrada', 404);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, service: 'panasonic-sat-servicepro', ai: 'workers-ai' });
    }

    if (url.pathname.startsWith('/api/')) {
      const email = request.headers.get('cf-access-authenticated-user-email') || '';

      if (url.pathname === '/api/me' && request.method === 'GET') {
        return Response.json({ authenticated: true, email });
      }

      if (url.pathname === '/api/extract' && request.method === 'POST') {
        try {
          const body = await request.json();
          const image = typeof body.image === 'string' ? body.image : '';
          if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(image)) {
            return jsonError('Se requiere una captura PNG, JPG o WebP', 400);
          }

          const messages = [
            {
              role: 'system',
              content: `Eres un extractor técnico de órdenes Panasonic ServicePro. Analiza únicamente la captura proporcionada. No inventes información. Devuelve SOLO JSON válido, sin markdown, con esta estructura exacta: {"customer":{"name":"","phone":"","email":"","address":"","city":""},"servicePro":{"workOrder":"","serviceAppointment":""},"equipment":{"indoorModel":"","outdoorModel":""},"job":{"description":"","errorCode":""},"meta":{"confidence":0,"warnings":[]}}. Mantén literalmente Work Order, Service Appointment, teléfonos, modelos y códigos de error. confidence debe ser 0-100.`
            },
            {
              role: 'user',
              content: 'Extrae los datos visibles de esta captura de Panasonic ServicePro. Si algo no aparece, usa cadena vacía.'
            }
          ];

          const aiResult = await env.AI.run('@cf/google/gemma-4-26b-a4b-it', {
            messages,
            image,
            max_tokens: 1200,
            temperature: 0.1
          });

          const extracted = parseAIResult(aiResult);
          return Response.json({ extracted, model: '@cf/google/gemma-4-26b-a4b-it' });
        } catch (error) {
          console.error('AI extraction failed', error);
          return jsonError(`No se ha podido analizar la captura: ${error instanceof Error ? error.message : 'error desconocido'}`, 502);
        }
      }

      const storeId = env.JOBS.idFromName('panasonic-sat-main');
      const store = env.JOBS.get(storeId);
      const suffix = url.pathname.slice('/api'.length) || '/';
      const internalUrl = new URL(request.url);
      internalUrl.pathname = suffix;
      return store.fetch(new Request(internalUrl, request));
    }

    return env.ASSETS.fetch(request);
  }
};

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeJob(input) {
  return {
    id: clean(input.id),
    workOrder: clean(input.workOrder),
    serviceAppointment: clean(input.serviceAppointment),
    customerName: clean(input.customerName),
    phone: clean(input.phone),
    email: clean(input.email),
    address: clean(input.address),
    city: clean(input.city),
    indoorModel: clean(input.indoorModel),
    outdoorModel: clean(input.outdoorModel),
    description: clean(input.description),
    errorCode: clean(input.errorCode),
    status: clean(input.status) || 'Nueva',
    appointmentAt: clean(input.appointmentAt),
    technicianNotes: clean(input.technicianNotes),
    diagnosis: clean(input.diagnosis),
    actionTaken: clean(input.actionTaken),
    materials: clean(input.materials),
    invoiceAmount: clean(String(input.invoiceAmount ?? '')),
    invoiceStatus: clean(input.invoiceStatus) || 'Pendiente',
    invoiceRef: clean(input.invoiceRef),
    source: clean(input.source) || 'ServicePro',
    createdAt: clean(input.createdAt),
    updatedAt: clean(input.updatedAt)
  };
}

function parseAIResult(result) {
  if (result && typeof result === 'object' && result.customer && result.servicePro) return validateExtracted(result);
  let text = '';
  if (typeof result === 'string') text = result;
  else if (result && typeof result.response === 'string') text = result.response;
  else if (result && result.choices?.[0]?.message?.content) text = result.choices[0].message.content;
  else text = JSON.stringify(result ?? {});

  text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  return validateExtracted(JSON.parse(text));
}

function validateExtracted(value) {
  const customer = value?.customer || {};
  const servicePro = value?.servicePro || {};
  const equipment = value?.equipment || {};
  const job = value?.job || {};
  const meta = value?.meta || {};
  return {
    customer: {
      name: clean(customer.name), phone: clean(customer.phone), email: clean(customer.email),
      address: clean(customer.address), city: clean(customer.city)
    },
    servicePro: {
      workOrder: clean(servicePro.workOrder), serviceAppointment: clean(servicePro.serviceAppointment)
    },
    equipment: {
      indoorModel: clean(equipment.indoorModel), outdoorModel: clean(equipment.outdoorModel)
    },
    job: {
      description: clean(job.description), errorCode: clean(job.errorCode)
    },
    meta: {
      confidence: Math.max(0, Math.min(100, Number(meta.confidence) || 0)),
      warnings: Array.isArray(meta.warnings) ? meta.warnings.map(clean).filter(Boolean).slice(0, 10) : []
    }
  };
}

function jsonError(message, status) {
  return Response.json({ error: message }, { status });
}
