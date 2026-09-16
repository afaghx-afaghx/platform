import { PRODUCT_TAXONOMY } from './product-taxonomy.js';
import './commerce-discovery-v1.js';

(() => {
  const API_BASE = 'https://api.afaghx.com';
  const state = { lang: location.pathname.endsWith('/en.html') ? 'en' : 'fa', category: 'all' };
  const $ = (selector) => document.querySelector(selector);

  function installHeaderEnhancements() {
    if ($('#afx-language') || !$('.utility-inner')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './header-v8.css';
    document.head.appendChild(link);
    const oldLang = $('#lang-btn');
    if (oldLang) oldLang.remove();
    const tools = document.createElement('div');
    tools.className = 'afx-header-tools';
    tools.innerHTML = `<button id="afx-location" class="afx-location" type="button" data-state="idle" aria-label="${state.lang === 'fa' ? 'فعال‌سازی موقعیت مکانی' : 'Enable location'}"><span class="pin" aria-hidden="true">⌖</span><span class="location-label">${state.lang === 'fa' ? 'موقعیت مکانی' : 'Location'}</span></button><select id="afx-language" class="afx-language" aria-label="${state.lang === 'fa' ? 'زبان سامانه' : 'Site language'}"><option value="fa">FA · فارسی</option><option value="en">EN · English</option><option value="ar" disabled>AR · العربية</option><option value="tr" disabled>TR · Türkçe</option></select><div id="afx-header-status" class="afx-header-status" role="status" aria-live="polite"></div>`;
    $('.utility-inner').appendChild(tools);
    const language = $('#afx-language');
    language.value = state.lang;
    language.addEventListener('change', () => {
      const target = language.value === 'en' ? './en.html' : './index.html';
      window.location.href = new URL(target, document.baseURI).href;
    });
    $('#afx-location')?.addEventListener('click', requestLocation);
  }

  function setLocationStatus(title, detail = '', status = 'idle') {
    const button = $('#afx-location'); const box = $('#afx-header-status');
    if (!button || !box) return;
    button.dataset.state = status;
    button.querySelector('.location-label').textContent = title;
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
    root.innerHTML = PRODUCT_TAXONOMY.map(([slug, fa, en], index) => `<article class="family"><span class="family-index">${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(state.lang === 'fa' ? fa : en)}</h3><button class="chip" type="button" data-category="${escapeHtml(slug)}">${escapeHtml(state.lang === 'fa' ? fa : en)}</button></article>`).join('');
    const count = $('#taxonomy-count');
    if (count) count.textContent = state.lang === 'fa' ? '۳۴ سبد کالای مصوب' : '34 approved product baskets';
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
