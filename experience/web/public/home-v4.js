import { PRODUCT_PARENT_CATEGORIES, PRODUCT_TAXONOMY } from './product-taxonomy.js';

(() => {
  const API_BASE = 'https://api.afaghx.com';
  const state = { lang: location.pathname.endsWith('/en.html') ? 'en' : 'fa', category: 'all' };
  const $ = (s) => document.querySelector(s);
  const parents = Object.fromEntries(PRODUCT_PARENT_CATEGORIES.map(([slug, fa, en]) => [slug, { fa, en }]));
  const children = Object.fromEntries(PRODUCT_TAXONOMY.map(([slug, fa, en, parent]) => [slug, { fa, en, parent }]));

  function renderTaxonomy() {
    const root = $('#taxonomy-families'); if (!root) return;
    root.innerHTML = PRODUCT_PARENT_CATEGORIES.map(([parent, fa, en], index) => {
      const items = PRODUCT_TAXONOMY.filter(([, , , p]) => p === parent);
      return `<article class="family"><span class="eyebrow">${String(index + 1).padStart(2, '0')}</span><h3>${state.lang === 'fa' ? fa : en}</h3><small>${items.length} ${state.lang === 'fa' ? 'دسته کالا' : 'product categories'}</small><div class="chips">${items.map(([slug, cfa]) => `<button class="chip" type="button" data-category="${slug}">${cfa}</button>`).join('')}</div></article>`;
    }).join('');
    $('#taxonomy-count').textContent = `${PRODUCT_PARENT_CATEGORIES.length} ${state.lang === 'fa' ? 'خانواده اصلی ·' : 'primary families ·'} ${PRODUCT_TAXONOMY.length} ${state.lang === 'fa' ? 'دسته' : 'categories'}`;
    root.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => {
      $('#afx-search-category').value = button.dataset.category;
      $('#afx-search-input').value = button.textContent.trim();
      $('#search-form').requestSubmit();
    }));
  }

  function renderSelect() {
    const select = $('#afx-search-category'); if (!select) return;
    select.innerHTML = `<option value="all">${state.lang === 'fa' ? 'همه دسته‌ها' : 'All categories'}</option>`;
    PRODUCT_PARENT_CATEGORIES.forEach(([parent, fa]) => {
      const group = document.createElement('optgroup'); group.label = fa;
      PRODUCT_TAXONOMY.filter(([, , , p]) => p === parent).forEach(([slug, cfa]) => {
        const option = document.createElement('option'); option.value = slug; option.textContent = cfa; group.appendChild(option);
      });
      select.appendChild(group);
    });
    select.value = state.category;
  }

  function renderSearchState(message, tone = '') {
    const box = $('#search-state'); if (!box) return;
    box.className = `search-state ${tone}`; box.hidden = false; box.textContent = message;
  }

  async function search(event) {
    event?.preventDefault();
    const query = $('#afx-search-input').value.trim(); state.category = $('#afx-search-category').value;
    if (!query && state.category === 'all') { renderSearchState(state.lang === 'fa' ? 'یک عبارت یا دسته را برای جست‌وجو انتخاب کنید.' : 'Enter a search term or choose a category.'); return; }
    renderSearchState(state.lang === 'fa' ? 'در حال دریافت نتیجه از API رسمی AFAGHX…' : 'Requesting live results from the canonical AFAGHX API…');
    try {
      const response = await fetch(`${API_BASE}/v1/search?${new URLSearchParams({ q: query, category: state.category })}`, { headers: { Accept: 'application/json' }, mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.items || data.results || []);
      const results = $('#search-results');
      results.innerHTML = items.length ? items.slice(0, 8).map((item, i) => `<article class="search-result"><span>${String(i + 1).padStart(2, '0')}</span><div><b>${escapeHtml(item.title || item.name || item.type || 'AFAGHX')}</b><p>${escapeHtml(item.description || item.text || '')}</p></div></article>`).join('') : `<div class="search-empty">${state.lang === 'fa' ? 'نتیجه‌ای از API رسمی برنگشت.' : 'The canonical API returned no results.'}</div>`;
      $('#search-results').hidden = false; renderSearchState(`${state.lang === 'fa' ? 'API رسمی AFAGHX' : 'Canonical AFAGHX API'} · ${items.length}`,'ok');
    } catch (error) {
      $('#search-results').hidden = true;
      renderSearchState(state.lang === 'fa' ? 'نتیجه زنده در دسترس نیست؛ هیچ داده ساختگی نمایش داده نمی‌شود.' : 'Live results are unavailable; no fabricated data is shown.','warn');
    }
  }

  function escapeHtml(value) { return String(value).replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c])); }
  function switchLanguage() { location.assign(state.lang === 'fa' ? './en.html' : './index.html'); }
  function sync() {
    document.documentElement.lang = state.lang; document.documentElement.dir = state.lang === 'fa' ? 'rtl' : 'ltr';
    $('#lang-btn')?.addEventListener('click', switchLanguage);
    $('#search-form')?.addEventListener('submit', search);
    renderSelect(); renderTaxonomy();
  }
  sync();
})();
