import { AFAGHX_UX_CONTRACT, languageByCode } from './afaghx-experience-contract.js';

(() => {
  const currentCode = () => location.pathname.includes('/en/') ? 'en' : 'fa';

  function routeFor(code) {
    const current = currentCode();
    if (code === current) return './index.html';
    const root = current === 'en' ? '../' : './';
    return code === 'en' ? root + 'en/index.html' : root + 'index.html';
  }

  function mount() {
    const host = document.querySelector('#afx-location-dock');
    const legacy = document.querySelector('#afx-language-switch');
    if (!host || !legacy) return;

    legacy.remove();

    const current = currentCode();
    const menu = document.createElement('div');
    menu.className = 'afx-language-menu';
    menu.innerHTML = '<span aria-hidden="true">文</span><select id="afx-language-select" aria-label="Language"></select><span class="lang-status" id="afx-language-status"></span>';

    const select = menu.querySelector('select');
    const status = menu.querySelector('#afx-language-status');

    AFAGHX_UX_CONTRACT.languages.forEach((item) => {
      const option = new Option(item.label, item.code);
      option.selected = item.code === current;
      option.disabled = !item.active;
      if (!item.active) option.textContent = item.label + ' — coming soon';
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      const item = languageByCode(select.value);
      if (!item.active) {
        select.value = current;
        status.textContent = current === 'fa' ? 'فعلاً در دسترس نیست' : 'Not yet active';
        window.setTimeout(() => { status.textContent = ''; }, 2500);
        return;
      }
      window.location.href = new URL(routeFor(item.code), document.baseURI).href;
    });

    host.appendChild(menu);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
