import { PRODUCT_TAXONOMY } from './product-taxonomy.js';

(() => {
  const API_BASE = 'https://api.afaghx.com';
  const lang = location.pathname.endsWith('/en.html') ? 'en' : 'fa';
  const t = (fa, en) => lang === 'fa' ? fa : en;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));

  function loadStyles() {
    if (document.querySelector('link[data-commerce-discovery]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './commerce-discovery-v1.css';
    link.dataset.commerceDiscovery = 'true';
    document.head.appendChild(link);
  }

  function buildLayer() {
    const hero = document.querySelector('.hero');
    if (!hero || document.querySelector('#commerce-discovery')) return;
    const section = document.createElement('section');
    section.id = 'commerce-discovery';
    section.className = 'commerce-discovery';
    section.innerHTML = `
      <div class="wrap discovery-shell">
        <div class="discovery-head">
          <div>
            <span class="discovery-kicker">COMMERCE DISCOVERY · LIVE API</span>
            <h2>${t('کشف واقعی، از همین صفحه اول.', 'Real discovery, from the first page.')}</h2>
            <p>${t('محصول، تأمین‌کننده، کارخانه، خدمت، بازار یا شریک را با داده واقعی API رسمی پیدا کنید.', 'Find products, suppliers, factories, services, markets or partners using live data from the canonical API.')}</p>
          </div>
          <form id="commerce-search" class="discovery-search" role="search">
            <label class="sr-only" for="commerce-query">${t('جست‌وجو','Search')}</label>
            <input id="commerce-query" autocomplete="off" placeholder="${t('مثلاً پمپ صنعتی برای کارخانه…','e.g. industrial pump for a factory…')}" />
            <select id="commerce-category" aria-label="${t('سبد کالا','Product basket')}"></select>
            <button type="submit">${t('کشف','Discover')}</button>
          </form>
        </div>
        <div id="commerce-baskets" class="basket-rail" aria-label="${t('سبدهای پیشنهادی','Basket shortcuts')}"></div>
        <div id="commerce-state" class="discovery-state" hidden></div>
        <div id="commerce-results" class="discovery-results" hidden></div>
        <div id="commerce-empty" class="discovery-empty" hidden></div>
        <div class="discovery-note">${t('فقط داده بازگشتی از API رسمی نمایش داده می‌شود؛ هیچ محصول، قیمت، امتیاز یا نشان ساختگی تولید نمی‌شود.','Only records returned by the canonical API are shown; no product, price, rating or badge is fabricated.')}</div>
      </div>`;
    hero.insertAdjacentElement('afterend', section);
    renderBaskets();
    document.querySelector('#commerce-search')?.addEventListener('submit', search);
  }

  function renderBaskets() {
    const select = document.querySelector('#commerce-category');
    const rail = document.querySelector('#commerce-baskets');
    if (!select || !rail) return;
    select.replaceChildren(new Option(t('همه سبدها','All baskets'), 'all'));
    PRODUCT_TAXONOMY.forEach(([slug, fa, en]) => select.appendChild(new Option(lang === 'fa' ? fa : en, slug)));
    const shortcuts = PRODUCT_TAXONOMY.slice(0, 8);
    rail.innerHTML = shortcuts.map(([slug, fa, en]) => `<button type="button" data-category="${escapeHtml(slug)}" aria-pressed="false">${escapeHtml(lang === 'fa' ? fa : en)}</button>`).join('');
    rail.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
      select.value = button.dataset.category;
      rail.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', item === button ? 'true' : 'false'));
      document.querySelector('#commerce-query').value = button.textContent.trim();
      search();
    }));
  }

  function setState(message, tone = '') {
    const node = document.querySelector('#commerce-state');
    if (!node) return;
    node.hidden = false;
    node.className = `discovery-state ${tone}`;
    node.textContent = message;
  }

  function normalize(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  }

  function renderResults(items) {
    const root = document.querySelector('#commerce-results');
    const empty = document.querySelector('#commerce-empty');
    if (!root || !empty) return;
    if (!items.length) {
      root.hidden = true;
      empty.hidden = false;
      empty.innerHTML = `<strong>${t('نتیجه‌ای پیدا نشد.','No live result found.')}</strong><span>${t('API رسمی برای این جست‌وجو رکوردی برنگرداند.','The canonical API returned no live record for this query.')}</span>`;
      return;
    }
    empty.hidden = true;
    root.hidden = false;
    root.innerHTML = items.slice(0, 8).map((item, index) => {
      const title = item?.title || item?.name || item?.type || 'AFAGHX';
      const description = item?.description || item?.text || '';
      const type = item?.type || 'RESULT';
      return `<article class="discovery-card"><small>${escapeHtml(type)}</small><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p><span class="sr-only">${String(index + 1).padStart(2, '0')}</span></article>`;
    }).join('');
  }

  async function search(event) {
    event?.preventDefault();
    const query = document.querySelector('#commerce-query')?.value.trim() || '';
    const category = document.querySelector('#commerce-category')?.value || 'all';
    if (!query && category === 'all') {
      setState(t('عبارت جست‌وجو یا یک سبد را انتخاب کنید.','Enter a search term or choose a basket.'), 'warn');
      return;
    }
    setState(t('در حال جست‌وجوی داده واقعی در API رسمی AFAGHX…','Searching live data through the canonical AFAGHX API…'));
    try {
      const response = await fetch(`${API_BASE}/v1/search?${new URLSearchParams({ q: query, category })}`, { headers: { Accept: 'application/json' }, mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const items = normalize(await response.json());
      renderResults(items);
      setState(`${t('API رسمی AFAGHX','Canonical AFAGHX API')} · ${items.length} ${t('نتیجه','results')}`, 'ok');
    } catch {
      const root = document.querySelector('#commerce-results');
      const empty = document.querySelector('#commerce-empty');
      if (root) root.hidden = true;
      if (empty) {
        empty.hidden = false;
        empty.innerHTML = `<strong>${t('نتیجه زنده در دسترس نیست.','Live results are unavailable.')}</strong><span>${t('هیچ داده ساختگی نمایش داده نمی‌شود.','No fabricated data is shown.')}</span>`;
      }
      setState(t('اتصال به API رسمی در دسترس نیست.','The canonical API is unavailable.'), 'warn');
    }
  }

  function enforceHeaderCart() {
    const header = document.querySelector('.site-header');
    const actions = header?.querySelector('.header-actions');
    if (!header || !actions) return;

    // Remove the inactive decorative basket counter from the utility bar.
    // The only interactive cart is the canonical #afx-cart managed below.
    Array.from(header.querySelectorAll('.utility-inner > span')).forEach((item) => {
      const text = (item.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (/۳۴\s*سبد\s*کالای\s*اصلی|34\s*approved\s*product\s*baskets/.test(text)) item.remove();
    });

    const carts = Array.from(header.querySelectorAll('.afx-cart'));
    const textualCandidates = Array.from(actions.querySelectorAll('a,button')).filter((item) => {
      if (item.classList.contains('afx-cart')) return false;
      const text = (item.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return /\bcart\b|سبد\s*(?:کالا|خرید)/.test(text);
    });
    const candidates = [...carts, ...textualCandidates];
    const cart = candidates[0] || document.createElement('a');

    candidates.slice(1).forEach((item) => item.remove());
    if (cart.parentElement !== actions) actions.appendChild(cart);

    const label = lang === 'fa' ? 'سبد کالا' : 'CART';
    const desired = `🛒 ${label}`;
    if (cart.id !== 'afx-cart') cart.id = 'afx-cart';
    if (cart.className !== 'afx-cart') cart.className = 'afx-cart';
    if (cart.getAttribute('href') !== './customer.html#cart') cart.setAttribute('href', './customer.html#cart');
    if (cart.textContent !== desired) cart.textContent = desired;
    if (cart.getAttribute('aria-label') !== label) cart.setAttribute('aria-label', label);
    if (cart.getAttribute('data-cart-label') !== label) cart.setAttribute('data-cart-label', label);
  }

  function watchHeaderCart() {
    if (window.__AFX_HEADER_CART_RUNTIME__) return;
    window.__AFX_HEADER_CART_RUNTIME__ = true;
    const run = () => {
      const before = document.querySelectorAll('.site-header .afx-cart').length;
      enforceHeaderCart();
      const after = document.querySelectorAll('.site-header .afx-cart').length;
      if (after !== 1 || before !== 1) window.requestAnimationFrame(enforceHeaderCart);
    };
    run();
    const observer = new MutationObserver(() => {
      if (window.__AFX_HEADER_CART_SYNC__) return;
      window.__AFX_HEADER_CART_SYNC__ = true;
      window.requestAnimationFrame(() => {
        window.__AFX_HEADER_CART_SYNC__ = false;
        enforceHeaderCart();
      });
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
    window.setTimeout(enforceHeaderCart, 0);
    window.setTimeout(enforceHeaderCart, 250);
    window.setTimeout(enforceHeaderCart, 750);
  }

  loadStyles();
  buildLayer();
  watchHeaderCart();
})();
