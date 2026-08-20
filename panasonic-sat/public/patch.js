(() => {
  const SERVICEPRO_URL = 'https://servicepro.panasonic.eu/s/';
  let preparedImagePromise = null;

  function fixServiceProLinks() {
    document.querySelectorAll('a.servicepro-open, a[href*="servicepro.eu"], a[href*="servicepro.shs-core.com"]').forEach((link) => {
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
    preparedImagePromise = prepareLikeAppDeploy(file);
  }, true);

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.endsWith('/api/extract') && preparedImagePromise && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body);
        const prepared = await preparedImagePromise;
        body.image = prepared;
        delete body.images;
        init = { ...init, body: JSON.stringify(body) };
      } catch (error) {
        console.warn('No se pudo aplicar el preprocesado de imagen de ServicePro', error);
      }
    }
    return nativeFetch(input, init);
  };

  async function prepareLikeAppDeploy(file) {
    const source = await fileToDataUrl(file);
    const image = await loadImage(source);
    let width = image.naturalWidth;
    let height = image.naturalHeight;

    const byDimension = Math.min(1, 1600 / Math.max(width, height));
    const byPixels = Math.min(1, Math.sqrt(2000000 / Math.max(1, width * height)));
    const ratio = Math.min(byDimension, byPixels);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.86);
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
