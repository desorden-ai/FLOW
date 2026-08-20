(() => {
  const SERVICEPRO_URL = 'https://servicepro.shs-core.com/ServiceOrder_Client/login.aspx';
  let imageBundlePromise = null;

  function fixServiceProLinks() {
    document.querySelectorAll('a[href="https://servicepro.eu"], a.servicepro-open').forEach((link) => {
      link.href = SERVICEPRO_URL;
      link.target = '_blank';
      link.rel = 'noreferrer';
    });
  }

  const observer = new MutationObserver(fixServiceProLinks);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', fixServiceProLinks);

  document.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.id !== 'captureInput') return;
    const file = input.files?.[0];
    if (!file) return;
    imageBundlePromise = buildImageBundle(file);
  }, true);

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.endsWith('/api/extract') && imageBundlePromise && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body);
        const bundle = await imageBundlePromise;
        if (bundle.length) {
          body.image = bundle[0];
          body.images = bundle;
          init = { ...init, body: JSON.stringify(body) };
        }
      } catch (error) {
        console.warn('No se pudo sustituir la imagen por la versión OCR de alta resolución', error);
      }
    }
    return nativeFetch(input, init);
  };

  async function buildImageBundle(file) {
    const source = await fileToDataUrl(file);
    const image = await loadImage(source);

    // Keep substantially more detail than the original 1280px resize. ServicePro
    // screenshots are usually tall and contain small UI text.
    const full = renderFull(image, 2600, 0.92);
    const tiles = renderVerticalTiles(image, 3, 0.10, 0.92);
    return [full, ...tiles].filter(Boolean).slice(0, 4);
  }

  function renderFull(image, maxLongSide, quality) {
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    const longSide = Math.max(width, height);
    if (longSide > maxLongSide) {
      const ratio = maxLongSide / longSide;
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  function renderVerticalTiles(image, count, overlap, quality) {
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const nominal = sourceHeight / count;
    const overlapPx = nominal * overlap;
    const outputs = [];

    for (let index = 0; index < count; index += 1) {
      const start = Math.max(0, Math.floor(index * nominal - (index ? overlapPx : 0)));
      const end = Math.min(sourceHeight, Math.ceil((index + 1) * nominal + (index < count - 1 ? overlapPx : 0)));
      const cropHeight = Math.max(1, end - start);

      let outWidth = sourceWidth;
      let outHeight = cropHeight;
      const maxWidth = 1600;
      if (outWidth > maxWidth) {
        const ratio = maxWidth / outWidth;
        outWidth = Math.round(outWidth * ratio);
        outHeight = Math.round(outHeight * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.drawImage(image, 0, start, sourceWidth, cropHeight, 0, 0, outWidth, outHeight);
      outputs.push(canvas.toDataURL('image/jpeg', quality));
    }

    return outputs;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se ha podido leer la captura'));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se ha podido abrir la captura'));
      image.src = src;
    });
  }
})();
