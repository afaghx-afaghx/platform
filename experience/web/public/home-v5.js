import { PRODUCT_TAXONOMY } from './product-taxonomy.js';
import './commerce-discovery-v1.js';
import './afaghx-ai-discovery-v2.js';

(() => {
  const API_BASE = 'https://api.afaghx.com';
  const CANONICAL_SEARCH_ENDPOINT = '/v1/search';
  const NO_FABRICATED_DATA_MESSAGE = 'هیچ داده ساختگی نمایش داده نمی‌شود.';
  const EXPERIENCE_CAPABILITIES = Object.freeze(['GLOBAL READY','INTELLIGENCE','TRUST','NETWORK','PROCUREMENT']);
  const state = { lang: (location.pathname.includes('/en/') || location.pathname.endsWith('/en.html')) ? 'en' : 'fa', category: 'all' };
  const $ = (selector) => document.querySelector(selector);

  function installHeaderStyles() {
    // Header styles are served from home-v5.css to comply with the strict style-src CSP.
  }

  function installHeaderEnhancements() {
    const header = $('.site-header');
    if (!header) return;
    const languageSwitcher = header.querySelector('.language-switcher');
    if (languageSwitcher && !languageSwitcher.dataset.afxBound) {
      languageSwitcher.dataset.afxBound = 'true';
      languageSwitcher.addEventListener('change', () => {
        if (languageSwitcher.value) window.location.href = new URL(languageSwitcher.value, document.baseURI).href;
      });
    }
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
      brand.insertAdjacentElement('afterend', dock);
    }
    // The canonical homepage already ships an empty dock placeholder. Hydrate it
    // as well as the fallback-created dock; otherwise these controls never render.
    if (!dock.querySelector('#afx-location') ||
        !dock.querySelector('#afx-language-switch') ||
        !dock.querySelector('#afx-header-status')) {
      dock.innerHTML = `<button id="afx-location" class="afx-location" type="button" data-state="idle" aria-label="${state.lang === 'fa' ? 'فعال‌سازی موقعیت مکانی' : 'Enable location'}"><span class="pin" aria-hidden="true">⌖</span><span class="location-label">${state.lang === 'fa' ? 'موقعیت مکانی' : 'Location'}</span></button><button id="afx-language-switch" class="afx-language" type="button" aria-label="${state.lang === 'fa' ? 'رفتن به نسخه انگلیسی' : 'Switch to Persian version'}">${state.lang === 'fa' ? 'نسخه انگلیسی' : 'نسخه فارسی'}</button><div id="afx-header-status" class="afx-header-status" role="status" aria-live="polite"></div>`;
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
    root.innerHTML = PRODUCT_TAXONOMY.map(([slug, fa, en], index) => {
      const label = state.lang === 'fa' ? fa : en;
      const number = String(index + 1).padStart(2, '0');
      return `<button class="family family-row-item" type="button" data-category="${escapeHtml(slug)}" aria-label="${escapeHtml(label)}"><img class="family-image" src="${state.lang === 'en' ? '../assets/baskets/' : './assets/baskets/'}${escapeHtml(slug)}.svg" alt="" loading="lazy" decoding="async"><span class="family-index">${number}</span><strong>${escapeHtml(label)}</strong></button>`;
    }).join('');
    const count = $('#taxonomy-count');
    if (count) count.textContent = state.lang === 'fa' ? '۳۴ سبد کالای مصوب · دسترسی مستقیم' : '34 approved product baskets · direct access';
    root.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => {
      state.category = button.dataset.category;
      $('#afx-search-category').value = state.category;
      $('#afx-search-input').value = button.querySelector('strong')?.textContent.trim() || button.textContent.trim();
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

  function submitCommerceSearch(query, category = 'all') {
    const form = $('#commerce-search');
    const input = $('#commerce-query');
    const select = $('#commerce-category');
    if (!form || !input || !select) return false;
    input.value = query;
    select.value = category || 'all';
    form.requestSubmit();
    document.querySelector('#commerce-discovery')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  function search(event) {
    event?.preventDefault();
    const input = $('#afx-search-input');
    const select = $('#afx-search-category');
    const query = input?.value.trim() || '';
    const category = select?.value || 'all';
    window.dispatchEvent(new CustomEvent('afx:ai-search', { detail: { query, category, endpoint: CANONICAL_SEARCH_ENDPOINT } }));
    submitCommerceSearch(query, category);
  }

  function escapeHtml(value) { return String(value).replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c])); }
  async function verifyApiReachability() {
    const target = document.querySelector('[data-proof-api]');
    if (!target) return;
    try {
      const response = await fetch(API_BASE, { method: 'HEAD', mode: 'cors', cache: 'no-store' });
      target.textContent = state.lang === 'fa' ? `قابل دسترسی · HTTP ${response.status}` : `Reachable · HTTP ${response.status}`;
    } catch {
      target.textContent = state.lang === 'fa' ? 'تأیید نشد' : 'Unverified';
    }
  }

  function bindHeroIntent() {
    const form = $('#hero-intent-form');
    const input = $('#hero-intent-input');
    const result = $('#v5-intent-result');
    if (!form || !input || form.dataset.bound) return;
    form.dataset.bound = 'true';
    const routeIntent = (value) => {
      const query = String(value || '').trim();
      if (!query) {
        input.focus();
        return;
      }
      input.value = query;
      if (result) {
        result.hidden = false;
        result.querySelector('strong').textContent = state.lang === 'fa' ? 'مسیر شما آماده است' : 'Your path is ready';
        result.querySelector('span').textContent = state.lang === 'fa' ? 'در حال اتصال نیاز شما به جست‌وجوی واقعی اکوسیستم…' : 'Connecting your intent to the live ecosystem search…';
      }
      const headerInput = $('#afx-search-input');
      if (headerInput) headerInput.value = query;
      $('#search-form')?.requestSubmit();
    };
    form.addEventListener('submit', (event) => { event.preventDefault(); routeIntent(input.value); });
    document.querySelectorAll('#discover [data-intent]').forEach((button) => {
      button.addEventListener('click', () => routeIntent(button.dataset.intent || ''));
    });
  }

  function sync() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'fa' ? 'rtl' : 'ltr';
    installHeaderEnhancements();
    $('#search-form')?.addEventListener('submit', search);
    renderSelect();
    renderTaxonomy();
    bindHeroIntent();
    verifyApiReachability();
  }
  sync();
})();