import { PRODUCT_TAXONOMY } from './product-taxonomy.js';
import './commerce-discovery-v1.js';

(() => {
  const API_BASE = 'https://api.afaghx.com';
  const EXPERIENCE_CAPABILITIES = Object.freeze(['GLOBAL READY','INTELLIGENCE','TRUST','NETWORK','PROCUREMENT']);
  const state = { lang: (location.pathname.includes('/en/') || location.pathname.endsWith('/en.html')) ? 'en' : 'fa', category: 'all' };
  const $ = (selector) => document.querySelector(selector);

  function installHeaderStyles() {
    if (document.querySelector('#afx-header-runtime-style')) return;
    const style = document.createElement('style');
    style.id = 'afx-header-runtime-style';
    style.textContent = `
      .site-header{display:block!important;visibility:visible!important;opacity:1!important;position:sticky!important;top:0!important;z-index:1000!important;background:#070b10f5!important;border-bottom:1px solid #202d39!important;box-shadow:0 10px 40px rgba(0,0,0,.18)}
      .site-header .utility{display:none!important}
      .site-header .masthead{width:min(1500px,calc(100% - 56px));margin:0 auto;min-height:82px;display:flex!important;direction:ltr!important;align-items:center;gap:14px;padding:12px 0!important}
      .site-header .masthead .brand{order:1;flex:0 0 225px;min-width:0;display:flex;align-items:center;gap:12px;direction:ltr}
      .site-header .masthead .afx-location-dock{order:2;flex:0 0 205px;display:flex;align-items:center;gap:7px;min-width:0;direction:rtl;position:relative}
      .site-header .masthead .afx-location,.site-header .masthead .afx-language{height:34px;border:1px solid #2b3945;border-radius:9px;background:#0d141b;color:#dfe6eb;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}
      .site-header .masthead .afx-location{padding:0 10px;display:inline-flex;align-items:center;gap:6px}
      .site-header .masthead .afx-location .pin{color:#65e2ba;font-size:13px}
      .site-header .masthead .afx-language{padding:0 8px;min-width:92px;outline:0}
      .site-header .masthead .global-search{order:3;flex:1 1 420px;min-width:240px}
      .site-header .masthead .header-actions{order:4;display:flex!important;flex:0 0 auto;align-items:center;gap:8px;white-space:nowrap}
      .site-header .masthead .header-actions>a{display:inline-flex!important;align-items:center;justify-content:center}
      .site-header .masthead .header-actions .afx-cart{padding:11px 10px;border:1px solid #3a4650;border-radius:10px;color:#e9eef2;background:#0d141b;font-weight:900}
      .site-header .masthead .afx-header-status{display:none;position:absolute;top:calc(100% + 7px);right:0;z-index:1100;min-width:250px;padding:11px 13px;border:1px solid #2c3b47;border-radius:11px;background:#0d141b;color:#aebac3;box-shadow:0 18px 50px rgba(0,0,0,.35);font-size:11px;line-height:1.7}
      .site-header .masthead .afx-header-status.is-visible{display:block}
      .site-header .primary-nav{border-top:1px solid #121c24}
      .site-header .primary-nav .wrap{width:min(1500px,calc(100% - 56px));min-height:42px;display:flex;align-items:center;justify-content:center;gap:25px;overflow:auto;white-space:nowrap}
      .site-header .primary-nav a{font-size:10px;font-weight:850;color:#9aa6af}
      .site-header .primary-nav a:hover,.site-header .primary-nav a:first-child{color:#fff}
      @media(max-width:1180px){.site-header .masthead{gap:10px}.site-header .masthead .brand{flex-basis:190px}.site-header .masthead .afx-location-dock{flex-basis:190px}.site-header .masthead .global-search{flex-basis:300px}.site-header .primary-nav .wrap{gap:18px}}
      @media(max-width:900px){.site-header .masthead{width:calc(100% - 28px);display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto auto!important;gap:9px;padding:9px 0!important}.site-header .masthead .brand{grid-column:1;grid-row:1;order:initial;flex:none}.site-header .masthead .afx-location-dock{grid-column:2;grid-row:1;order:initial;flex:none}.site-header .masthead .global-search{grid-column:1/-1;grid-row:2;order:initial;min-width:0;width:100%}.site-header .masthead .header-actions{position:absolute;right:12px;top:8px;display:none!important}.site-header .primary-nav .wrap{width:calc(100% - 28px);justify-content:flex-start;gap:18px}}
      @media(max-width:520px){.site-header .masthead{width:calc(100% - 20px)}.site-header .masthead .afx-location .location-label{display:none}.site-header .masthead .afx-location-dock{gap:5px}.site-header .masthead .afx-language{min-width:78px;font-size:10px}.site-header .primary-nav .wrap{width:calc(100% - 20px);gap:15px}.site-header .masthead .global-search select,.site-header .masthead .global-search button{display:none}}
    `;
    document.head.appendChild(style);
  }

  function installHeaderEnhancements() {
    const header = $('.site-header');
    if (!header) return;
    installHeaderStyles();
    header.classList.add('afx-header-persistent');

    const masthead = $('.masthead');
    const brand = masthead?.querySelector('.brand');
    if (!masthead || !brand) return;

    $('#lang-btn')?.remove();

    let dock = $('#afx-location-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'afx-location-dock';
      dock.className = 'afx-location-dock';
      dock.innerHTML = `<button id="afx-location" class="afx-location" type="button" data-state="idle" aria-label="${state.lang === 'fa' ? 'فعال‌سازی موقعیت مکانی' : 'Enable location'}"><span class="pin" aria-hidden="true">⌖</span><span class="location-label">${state.lang === 'fa' ? 'موقعیت مکانی' : 'Location'}</span></button><button id="afx-language-switch" class="afx-language" type="button" aria-label="${state.lang === 'fa' ? 'رفتن به نسخه انگلیسی' : 'Switch to Persian version'}">${state.lang === 'fa' ? 'نسخه انگلیسی' : 'نسخه فارسی'}</button><div id="afx-header-status" class="afx-header-status" role="status" aria-live="polite"></div>`;
      brand.insertAdjacentElement('afterend', dock);
    }

    const actions = masthead.querySelector('.header-actions');
    if (actions) {
      const candidates = Array.from(header.querySelectorAll('a,button')).filter((item) => {
        const text = (item.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        return item.classList.contains('afx-cart') || /\bcart\b|سبد\s*(?:کالا|خرید)/.test(text);
      });
      let cart = candidates[0] || null;
      candidates.slice(1).forEach((item) => item.remove());
      if (!cart) cart = document.createElement('a');
      if (cart.parentElement !== actions) actions.appendChild(cart);
      cart.className = 'afx-cart';
      cart.href = './customer.html#cart';
      const cartLabel = state.lang === 'fa' ? 'سبد کالا' : 'Cart';
      cart.textContent = `🛒 ${cartLabel}`;
      cart.setAttribute('aria-label', cartLabel);
      cart.setAttribute('data-cart-label', cartLabel);
      Array.from(header.querySelectorAll('.afx-cart')).forEach((item) => { if (item !== cart) item.remove(); });
    }

    const language = $('#afx-language-switch');
    if (language) {
      language.onclick = () => switchLanguage(state.lang === 'fa' ? 'en' : 'fa');
    }
    const locationButton = $('#afx-location');
    if (locationButton && !locationButton.dataset.bound) {
      locationButton.dataset.bound = 'true';
      locationButton.addEventListener('click', requestLocation);
    }
  }

  function switchLanguage(language) {
    const target = language === 'en' ? './en/' : '../index.html';
    window.location.href = new URL(target, document.baseURI).href;
  }

  function setLocationStatus(title, detail = '', status = 'idle') {
    const button = $('#afx-location'); const box = $('#afx-header-status');
    if (!button || !box) return;
    button.dataset.state = status;
    const label = button.querySelector('.location-label');
    if (label) label.textContent = title;
    box.classList.add('is-visible');
    box.innerHTML = `<strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small>`;
    window.clearTimeout(setLocationStatus.timer);
    setLocationStatus.timer = window.setTimeout(() => box.classList.remove('is-visible'), 5000);
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus(state.lang === 'fa' ? 'موقعیت مکانی پشتیبانی نمی‌شود' : 'Location is not supported', state.lang === 'fa' ? 'مرورگر شما Geolocation را ارائه نمی‌کند.' : 'This browser does not provide Geolocation.', 'idle');
      return;
    }
    setLocationStatus(state.lang === 'fa' ? 'در حال دریافت موقعیت…' : 'Detecting location…', state.lang === 'fa' ? 'اجازه مرورگر لازم است؛ مختصات در سامانه ذخیره نمی‌شود.' : 'Browser permission is required; coordinates are not stored by the Experience shell.', 'loading');
    navigator.geolocation.getCurrentPosition(
      () => setLocationStatus(state.lang === 'fa' ? 'موقعیت فعال شد' : 'Location enabled', state.lang === 'fa' ? 'موقعیت فقط در همین نشست مرورگر برای تجربه محلی استفاده می‌شود.' : 'Location is used only for this browser session to enable local experience.', 'ready'),
      (error) => {
        const message = error.code === 1 ? (state.lang === 'fa' ? 'دسترسی رد شد؛ از تنظیمات مرورگر اجازه موقعیت بدهید.' : 'Permission denied; allow location in browser settings.') : (state.lang === 'fa' ? 'موقعیت در دسترس نبود؛ دوباره تلاش کنید.' : 'Location was unavailable; please try again.');
        setLocationStatus(state.lang === 'fa' ? 'موقعیت فعال نشد' : 'Location unavailable', message, 'idle');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }

  function renderSelect() {
    const select = $('#afx-search-category'); if (!select) return;
    select.replaceChildren(new Option(state.lang === 'fa' ? 'همه سبدها' : 'All baskets', 'all'));
    PRODUCT_TAXONOMY.forEach(([slug, fa, en]) => select.appendChild(new Option(state.lang === 'fa' ? fa : en, slug)));
    select.value = state.category;
  }

  function renderTaxonomy() {
    const root = $('#taxonomy-families'); if (!root) return;
    const makeCards = (entries, startIndex) => entries.map(([slug, fa, en], offset) => {
      const label = state.lang === 'fa' ? fa : en;
      const index = String(startIndex + offset + 1).padStart(2, '0');
      return `<article class="family"><span class="family-index">${index}</span><h3>${escapeHtml(label)}</h3><button class="chip" type="button" data-category="${escapeHtml(slug)}">${escapeHtml(label)}</button></article>`;
    }).join('');
    const featured = PRODUCT_TAXONOMY.slice(0, 10);
    const remaining = PRODUCT_TAXONOMY.slice(10);
    root.innerHTML = `
      <div class="taxonomy-featured-grid">${makeCards(featured, 0)}</div>
      <details class="taxonomy-all">
        <summary>${state.lang === 'fa' ? 'نمایش همه ۳۴ سبد کالا' : 'View all 34 product baskets'}<span>${state.lang === 'fa' ? 'دسترسی کامل به هر ۳۴ سبد' : 'Open the complete 34-basket catalog'}</span></summary>
        <div class="taxonomy-all-grid">${makeCards(remaining, 10)}</div>
      </details>`;
    const count = $('#taxonomy-count');
    if (count) count.textContent = state.lang === 'fa' ? '۳۴ سبد کالای مصوب · ۱۰ مورد منتخب در دسترس فوری' : '34 approved product baskets · 10 featured for quick discovery';
    root.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => {
      state.category = button.dataset.category;
      $('#afx-search-category').value = state.category;
      $('#afx-search-input').value = button.textContent.trim();
      $('#search-form').requestSubmit();
      $('#discover')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  function renderSearchState(message, tone = '') {
    const box = $('#search-state'); if (!box) return;
    box.className = `search-state ${tone}`;
    box.hidden = false;
    box.textContent = message;
  }

  function renderResults(items) {
    const results = $('#search-results'); if (!results) return;
    if (!items.length) {
      results.innerHTML = `<div class="search-empty"><strong>${state.lang === 'fa' ? 'نتیجه‌ای پیدا نشد.' : 'No results found.'}</strong><span>${state.lang === 'fa' ? 'برای این جست‌وجو داده واقعی از API برنگشت.' : 'The API returned no live records for this query.'}</span></div>`;
    } else {
      results.innerHTML = items.slice(0, 8).map((item, index) => `<article class="search-result"><span>${String(index + 1).padStart(2, '0')}</span><div><b>${escapeHtml(item.title || item.name || item.type || 'AFAGHX')}</b><p>${escapeHtml(item.description || item.text || '')}</p></div><small>${escapeHtml(item.type || 'RESULT')}</small></article>`).join('');
    }
    results.hidden = false;
  }

  async function search(event) {
    event?.preventDefault();
    const input = $('#afx-search-input'); const select = $('#afx-search-category');
    const query = input?.value.trim() || ''; state.category = select?.value || 'all';
    if (!query && state.category === 'all') {
      renderSearchState(state.lang === 'fa' ? 'عبارت جست‌وجو یا یک سبد را انتخاب کنید.' : 'Enter a search term or choose a basket.', 'warn');
      return;
    }
    renderSearchState(state.lang === 'fa' ? 'در حال جست‌وجوی داده واقعی در API رسمی AFAGHX…' : 'Searching live data through the canonical AFAGHX API…');
    try {
      const response = await fetch(`${API_BASE}/v1/search?${new URLSearchParams({ q: query, category: state.category })}`, { headers: { Accept: 'application/json' }, mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : (Array.isArray(data.results) ? data.results : []));
      renderResults(items);
      renderSearchState(`${state.lang === 'fa' ? 'API رسمی AFAGHX' : 'Canonical AFAGHX API'} · ${items.length} ${state.lang === 'fa' ? 'نتیجه' : 'results'}`, 'ok');
    } catch {
      const results = $('#search-results'); if (results) results.hidden = true;
      renderSearchState(state.lang === 'fa' ? 'نتیجه زنده در دسترس نیست؛ هیچ داده ساختگی نمایش داده نمی‌شود.' : 'Live results are unavailable; no fabricated data is shown.', 'warn');
    }
  }

  function escapeHtml(value) { return String(value).replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c])); }
  function sync() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'fa' ? 'rtl' : 'ltr';
    installHeaderEnhancements();
    $('#search-form')?.addEventListener('submit', search);
    renderSelect();
    renderTaxonomy();
  }
  sync();
})();