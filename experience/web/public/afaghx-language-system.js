import { AFAGHX_UX_CONTRACT, languageByCode } from './afaghx-experience-contract.js';

(() => {
  const currentCode = () => location.pathname.includes('/en/') ? 'en' : 'fa';

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

    function apply(code) {
      const item = languageByCode(code);
      if (!item.active) {
        select.value = current;
        status.textContent = current === 'fa' ? 'فعلاً در دسترس نیست' : 'Not yet active';
        window.setTimeout(() => { status.textContent = ''; }, 2500);
        return;
      }
      if (code === current) return;
      window.location.href = new URL(item.path, document.baseURI).href;
    }

    select.addEventListener('change', () => apply(select.value));
    host.appendChild(menu);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
