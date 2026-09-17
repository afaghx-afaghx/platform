import './footer-final.js';

(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const lang = document.documentElement.lang === 'en' || location.pathname.includes('/en/') ? 'en' : 'fa';
  header.dataset.lang = lang;
  header.setAttribute('lang', lang);
})();
