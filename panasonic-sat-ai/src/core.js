export const ALLOWED_ORIGINS = new Set(['https://localhost']);
export const MAX_BODY_BYTES = 4_000_000;
export const MAX_TEXT_LENGTH = 12_000;
export const MAX_IMAGE_BASE64_LENGTH = 3_500_000;
export const MODEL = 'gemini-3.5-flash-lite';

export const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    customer: objectOf(['name', 'phone', 'email', 'address', 'city']),
    servicePro: objectOf(['workOrder', 'serviceAppointment']),
    equipment: objectOf(['indoorModel', 'outdoorModel']),
    job: objectOf(['description', 'errorCode']),
    meta: {
      type: 'object',
      additionalProperties: false,
      properties: {
        confidence: { type: 'number', minimum: 0, maximum: 100 },
        warnings: { type: 'array', items: { type: 'string' }, maxItems: 10 }
      },
      required: ['confidence', 'warnings']
    }
  },
  required: ['customer', 'servicePro', 'equipment', 'job', 'meta']
};

function objectOf(keys) {
  return {
    type: 'object',
    additionalProperties: false,
    properties: Object.fromEntries(keys.map(key => [key, { type: 'string' }])),
    required: keys
  };
}

export function corsHeaders(origin) {
  const headers = {
    'access-control-allow-headers': 'content-type, x-sat-client-id',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-max-age': '86400',
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff'
  };
  if (ALLOWED_ORIGINS.has(origin)) headers['access-control-allow-origin'] = origin;
  return headers;
}

export function parseAndValidateInput(raw, contentLength) {
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw httpError(413, 'PAYLOAD_TOO_LARGE', 'La captura supera el límite permitido.');
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw httpError(400, 'INVALID_REQUEST', 'El cuerpo JSON no es válido.');
  }
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  let image = typeof raw.image === 'string' ? raw.image.trim() : '';
  let mimeType = typeof raw.mimeType === 'string' ? raw.mimeType.toLowerCase() : '';
  if (!text && !image) throw httpError(400, 'INPUT_REQUIRED', 'Se requiere una captura o texto de ServicePro.');
  if (text.length > MAX_TEXT_LENGTH) throw httpError(413, 'TEXT_TOO_LARGE', 'El texto supera el límite permitido.');
  if (image) {
    const dataUrl = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i);
    if (dataUrl) {
      mimeType = dataUrl[1].toLowerCase();
      image = dataUrl[2];
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      throw httpError(400, 'IMAGE_TYPE_NOT_ALLOWED', 'La captura debe ser JPEG, PNG o WebP.');
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length > MAX_IMAGE_BASE64_LENGTH) {
      throw httpError(413, 'IMAGE_TOO_LARGE', 'La captura no es válida o supera el límite permitido.');
    }
  }
  return { text, image, mimeType };
}

export function normalize(value) {
  const string = candidate => typeof candidate === 'string' ? candidate.trim().slice(0, 2_000) : '';
  const group = (candidate, keys) => Object.fromEntries(keys.map(key => [key, string(candidate?.[key])]));
  const confidence = Number(value?.meta?.confidence);
  const warnings = Array.isArray(value?.meta?.warnings)
    ? value.meta.warnings.map(string).filter(Boolean).slice(0, 10)
    : [];
  return {
    customer: group(value?.customer, ['name', 'phone', 'email', 'address', 'city']),
    servicePro: group(value?.servicePro, ['workOrder', 'serviceAppointment']),
    equipment: group(value?.equipment, ['indoorModel', 'outdoorModel']),
    job: group(value?.job, ['description', 'errorCode']),
    meta: { confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(100, confidence)) : 0, warnings }
  };
}

export function clientRateKey(request) {
  const client = (request.headers.get('x-sat-client-id') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  return `${ip}:${client || 'missing'}`;
}

export function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}
