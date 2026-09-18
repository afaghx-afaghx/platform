import './footer-final.js';

(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const current = document.documentElement.lang === 'en' || location.pathname.includes('/en/') ? 'en' : 'fa';
  header.dataset.lang = current;
  header.setAttribute('lang', current);

  const selector = header.querySelector('.language-selector');
  if (!selector) return;

  selector.value = current;
  selector.addEventListener('change', () => {
    const target = selector.selectedOptions[0]?.dataset?.href;
    if (target) window.location.assign(target);
    else selector.value = current;
  });
})();