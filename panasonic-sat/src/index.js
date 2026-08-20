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

const EXTRACT_PROMPT = `Eres un extractor técnico de órdenes Panasonic ServicePro. Extrae únicamente información que exista en la entrada. No inventes información. Devuelve SOLO JSON válido con esta estructura exacta: {"customer":{"name":"","phone":"","email":"","address":"","city":""},"servicePro":{"workOrder":"","serviceAppointment":""},"equipment":{"indoorModel":"","outdoorModel":""},"job":{"description":"","errorCode":""},"meta":{"confidence":0,"warnings":[]}}. Mantén literalmente Work Order, Service Appointment, teléfonos, modelos y códigos de error. confidence debe ser 0-100. Si algo no aparece usa cadena vacía.`;

const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    customer: { type: 'object', properties: {
      name: { type: 'string' }, phone: { type: 'string' }, email: { type: 'string' },
      address: { type: 'string' }, city: { type: 'string' }
    }, required: ['name','phone','email','address','city'] },
    servicePro: { type: 'object', properties: {
      workOrder: { type: 'string' }, serviceAppointment: { type: 'string' }
    }, required: ['workOrder','serviceAppointment'] },
    equipment: { type: 'object', properties: {
      indoorModel: { type: 'string' }, outdoorModel: { type: 'string' }
    }, required: ['indoorModel','outdoorModel'] },
    job: { type: 'object', properties: {
      description: { type: 'string' }, errorCode: { type: 'string' }
    }, required: ['description','errorCode'] },
    meta: { type: 'object', properties: {
      confidence: { type: 'number' }, warnings: { type: 'array', items: { type: 'string' } }
    }, required: ['confidence','warnings'] }
  },
  required: ['customer','servicePro','equipment','job','meta']
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({
        ok: true,
        service: 'panasonic-sat-servicepro',
        imageAI: env.GEMINI_API_KEY ? 'gemini-first' : 'workers-ai',
        textImport: true
      });
    }

    if (url.pathname.startsWith('/api/')) {
      const email = request.headers.get('cf-access-authenticated-user-email') || '';

      if (url.pathname === '/api/me' && request.method === 'GET') {
        return Response.json({ authenticated: true, email, gemini: Boolean(env.GEMINI_API_KEY) });
      }

      if (url.pathname === '/api/extract' && request.method === 'POST') {
        try {
          const body = await request.json();
          const image = typeof body.image === 'string' ? body.image : '';
          if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(image)) {
            return jsonError('Se requiere una captura PNG, JPG o WebP', 400);
          }

          if (env.GEMINI_API_KEY) {
            try {
              const extracted = await extractImageWithGemini(image, env.GEMINI_API_KEY);
              return Response.json({ extracted, provider: 'Gemini 3.6 Flash' });
            } catch (geminiError) {
              console.warn('Gemini image extraction failed; using Workers AI fallback', geminiError);
            }
          }

          const extracted = await extractImageWithWorkersAI(image, env.AI);
          return Response.json({ extracted, provider: 'Workers AI · Gemma 4 Vision', fallback: Boolean(env.GEMINI_API_KEY) });
        } catch (error) {
          console.error('Image extraction failed', error);
          return jsonError(`No se ha podido analizar la captura: ${error instanceof Error ? error.message : 'error desconocido'}`, 502);
        }
      }

      if (url.pathname === '/api/extract-text' && request.method === 'POST') {
        try {
          const body = await request.json();
          const text = cleanMultiline(body.text).slice(0, 30000);
          if (text.length < 10) return jsonError('Pega primero el texto de la orden de ServicePro', 400);

          const local = extractServiceProLocally(text);
          if (local.servicePro.workOrder && local.customer.name && (local.customer.phone || local.equipment.indoorModel || local.job.description)) {
            return Response.json({ extracted: local, provider: 'Lectura directa · sin OCR' });
          }

          if (env.GEMINI_API_KEY) {
            try {
              const extracted = await extractTextWithGemini(text, env.GEMINI_API_KEY);
              return Response.json({ extracted, provider: 'Gemini 3.6 Flash · texto' });
            } catch (geminiError) {
              console.warn('Gemini text extraction failed; using Workers AI fallback', geminiError);
            }
          }

          const extracted = await extractTextWithWorkersAI(text, env.AI);
          return Response.json({ extracted, provider: 'Workers AI · texto', fallback: Boolean(env.GEMINI_API_KEY) });
        } catch (error) {
          console.error('Text extraction failed', error);
          return jsonError(`No se ha podido interpretar el texto: ${error instanceof Error ? error.message : 'error desconocido'}`, 502);
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

async function extractImageWithGemini(dataUrl, apiKey) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) throw new Error('Imagen no válida');
  const mimeType = match[1].toLowerCase().replace('image/jpg', 'image/jpeg');
  const data = match[2];
  return callGemini([
    { type: 'text', text: `${EXTRACT_PROMPT}\nAnaliza esta captura de Panasonic ServicePro.` },
    { type: 'image', mime_type: mimeType, data }
  ], apiKey);
}

async function extractTextWithGemini(text, apiKey) {
  return callGemini([{ type: 'text', text: `${EXTRACT_PROMPT}\n\nTexto copiado de ServicePro:\n${text}` }], apiKey);
}

async function callGemini(input, apiKey) {
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model: 'gemini-3.6-flash',
      input,
      response_format: { type: 'text', mime_type: 'application/json', schema: EXTRACT_SCHEMA }
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Gemini HTTP ${response.status}`);
  const text = findGeminiText(payload);
  if (!text) throw new Error('Gemini no devolvió JSON');
  return validateExtracted(JSON.parse(text));
}

function findGeminiText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  const chunks = [];
  for (const step of payload?.steps || []) {
    for (const part of step?.content || []) if (typeof part?.text === 'string') chunks.push(part.text);
  }
  return chunks.join('').trim();
}

async function extractImageWithWorkersAI(image, ai) {
  const result = await ai.run('@cf/google/gemma-4-26b-a4b-it', {
    messages: [
      { role: 'system', content: EXTRACT_PROMPT },
      { role: 'user', content: 'Extrae los datos visibles de esta captura de Panasonic ServicePro.' }
    ],
    image,
    max_tokens: 900,
    temperature: 0
  });
  return parseAIResult(result);
}

async function extractTextWithWorkersAI(text, ai) {
  const result = await ai.run('@cf/google/gemma-4-12b-it', {
    messages: [
      { role: 'system', content: EXTRACT_PROMPT },
      { role: 'user', content: `Texto copiado de ServicePro:\n${text}` }
    ],
    max_tokens: 900,
    temperature: 0
  });
  return parseAIResult(result);
}

function extractServiceProLocally(text) {
  const line = (...labels) => {
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*[:#-]?\\s*([^\\n]+)`, 'i');
      const match = text.match(re);
      if (match?.[1]) return clean(match[1]);
    }
    return '';
  };
  const workOrder = line('Work Order', 'WO', 'Orden de trabajo', 'Ordre de treball');
  const serviceAppointment = line('Service Appointment', 'Appointment', 'Cita de servicio');
  const phone = line('Phone', 'Telephone', 'Teléfono', 'Telefono', 'Móvil', 'Movil');
  const email = line('Email', 'E-mail');
  const city = line('City', 'Ciudad', 'Población', 'Poblacion', 'Localidad');
  const address = line('Address', 'Dirección', 'Direccion');
  const name = line('Customer', 'Cliente', 'Customer Name', 'Nombre');
  const indoorModel = line('Indoor Model', 'Indoor Unit', 'Unidad interior', 'Modelo interior');
  const outdoorModel = line('Outdoor Model', 'Outdoor Unit', 'Unidad exterior', 'Modelo exterior');
  const errorCode = line('Error Code', 'Código de error', 'Codigo de error', 'Error');
  const description = line('Description', 'Problem', 'Fault', 'Avería', 'Averia', 'Descripción', 'Descripcion');
  const found = [workOrder,serviceAppointment,name,phone,email,address,city,indoorModel,outdoorModel,errorCode,description].filter(Boolean).length;
  return validateExtracted({
    customer: { name, phone, email, address, city },
    servicePro: { workOrder, serviceAppointment },
    equipment: { indoorModel, outdoorModel },
    job: { description, errorCode },
    meta: { confidence: Math.min(98, 45 + found * 5), warnings: found < 4 ? ['El formato copiado no coincide completamente con las etiquetas conocidas.'] : [] }
  });
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanMultiline(value) {
  return typeof value === 'string' ? value.replace(/\r/g, '').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : '';
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
    job: { description: clean(job.description), errorCode: clean(job.errorCode) },
    meta: {
      confidence: Math.max(0, Math.min(100, Number(meta.confidence) || 0)),
      warnings: Array.isArray(meta.warnings) ? meta.warnings.map(clean).filter(Boolean).slice(0, 10) : []
    }
  };
}

function jsonError(message, status) {
  return Response.json({ error: message }, { status });
}
