(() => {
  const SERVICEPRO_URL = 'https://servicepro.panasonic.eu/s/';

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
})();