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
    if (document.querySelector('#afx-header-runtime-style')) return;
    const style = document.createElement('style');
    style.id = 'afx-header-runtime-style';
    style.textContent = `
      .site-header{display:block!important;visibility:visible!important;opacity:1!important;position:sticky!important;top:0!important;z-index:1000!important;background:#fff!important;border-bottom:1px solid #dce4ee!important;box-shadow:0 4px 18px rgba(16,43,85,.07)}
      .site-header .utility{display:none!important}
      .site-header .masthead{width:min(1500px,calc(100% - 56px));margin:0 auto;min-height:82px;display:flex!important;direction:ltr!important;align-items:center;gap:14px;padding:12px 0!important}
      .site-header .masthead .brand{order:1;flex:0 0 225px;min-width:0;display:flex;align-items:center;gap:12px;direction:ltr}
      .site-header .masthead .afx-location-dock{order:2;flex:0 0 205px;display:flex;align-items:center;gap:7px;min-width:0;direction:rtl;position:relative}
      .site-header .masthead .afx-location,.site-header .masthead .afx-language{height:34px;border:1px solid #dce4ee;border-radius:9px;background:#fff;color:#14243a;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}
      .site-header .masthead .afx-location{padding:0 10px;display:inline-flex;align-items:center;gap:6px}
      .site-header .masthead .afx-location .pin{color:#65e2ba;font-size:13px}
      .site-header .masthead .afx-language{padding:0 8px;min-width:92px;outline:0}
      .site-header .masthead .global-search{order:3;flex:1 1 420px;min-width:240px}
      .site-header .masthead .header-actions{order:4;display:flex!important;flex:0 0 auto;align-items:center;gap:8px;white-space:nowrap}
      .site-header .masthead .header-actions>a{display:inline-flex!important;align-items:center;justify-content:center}
      .site-header .masthead .header-actions .afx-cart{padding:11px 10px;border:1px solid #dce4ee;border-radius:10px;color:#14243a;background:#f4f7fb;font-weight:900}
      .site-header .masthead .afx-header-status{display:none;position:absolute;top:calc(100% + 7px);right:0;z-index:1100;min-width:250px;padding:11px 13px;border:1px solid #dce4ee;border-radius:11px;background:#fff;color:#52647a;box-shadow:0 18px 50px rgba(0,0,0,.35);font-size:11px;line-height:1.7}
      .site-header .masthead .afx-header-status.is-visible{display:block}
      .site-header .primary-nav{background:#102b55;border-top:1px solid #dce4ee}
      .site-header .primary-nav .wrap{width:min(1500px,calc(100% - 56px));min-height:42px;display:flex;align-items:center;justify-content:center;gap:25px;overflow:auto;white-space:nowrap}
      .site-header .primary-nav a{font-size:10px;font-weight:850;color:#e9f1fa}
      .site-header .primary-nav a:hover,.site-header .primary-nav a:first-child{color:#fff}
      @media(max-width:1180px){.site-header .masthead{gap:10px}.site-header .masthead .brand{flex-basis:190px}.site-header .masthead .afx-location-dock{flex-basis:190px}.site-header .masthead .global-search{flex-basis:300px}.site-header .primary-nav .wrap{gap:18px}}
      @media(max-width:900px){.site-header .masthead{width:calc(100% - 28px);display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto auto auto!important;gap:9px;padding:9px 0!important}.site-header .masthead .brand{grid-column:1;grid-row:1;order:initial;flex:none}.site-header .masthead .afx-location-dock{grid-column:2;grid-row:1;order:initial;flex:none}.site-header .masthead .global-search{grid-column:1/-1;grid-row:2;order:initial;min-width:0;width:100%}.site-header .masthead .header-actions{position:absolute;right:12px;top:8px;display:none!important}.site-header .primary-nav .wrap{width:calc(100% - 28px);justify-content:flex-start;gap:18px}}
      @media(max-width:520px){.site-header .masthead{width:calc(100% - 20px)}.site-header .masthead .afx-location .location-label{display:none}.site-header .masthead .afx-location-dock{gap:5px}.site-header .masthead .afx-language{min-width:78px;font-size:10px}.site-header .primary-nav .wrap{width:calc(100% - 20px);gap:15px}.site-header .masthead .global-search select{display:none}.site-header .masthead .global-search button{display:inline-flex;min-width:68px;align-items:center;justify-content:center}}
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

  function installHomepageStructure() {
    const hero = $('#discover');
    const taxonomy = $('#taxonomy');
    if (!hero || !taxonomy || $('#special-products')) return;
    const promotions = document.createElement('section');
    promotions.id = 'special-products';
    promotions.className = 'afx-special-products section';
    promotions.setAttribute('aria-labelledby', 'special-products-title');
    promotions.innerHTML = `<div class="wrap"><div class="afx-section-heading"><div><span class="kicker">${state.lang === 'fa' ? 'جایگاه‌های تبلیغاتی منتخب' : 'ELIGIBLE PROMOTIONS'}</span><h2 id="special-products-title">${state.lang === 'fa' ? 'محصولات ویژه' : 'Special products'}</h2></div><p>${state.lang === 'fa' ? 'حداکثر ۳۰ جایگاه؛ هر کمپین با بازه ۸ ساعته و فقط بر اساس تأیید سرویس‌های معتبر نمایش داده می‌شود.' : 'Up to 30 placements; each campaign has an 8-hour window and is displayed only when verified by authoritative services.'}</p></div><div class="afx-promo-empty" role="status"><strong>${state.lang === 'fa' ? 'کمپین واجد شرایطی برای نمایش دریافت نشده است.' : 'No eligible campaigns have been returned.'}</strong><span>${state.lang === 'fa' ? 'تا زمان اتصال قرارداد رسمی تبلیغات، هیچ محصول، تخفیف، امتیاز یا شمارش معکوسی ساخته نمی‌شود.' : 'Until the official advertising contract is connected, no product, discount, rating or countdown is fabricated.'}</span><small>0 / 30</small></div></div>`;
    hero.insertAdjacentElement('afterend', promotions);
    promotions.insertAdjacentElement('afterend', taxonomy);
    const heading = taxonomy.querySelector('.split-heading h2');
    if (heading) heading.innerHTML = state.lang === 'fa' ? '۳۶ سبد کالا،<br><em>یک تجربه کشف.</em>' : '36 product baskets,<br><em>one discovery experience.</em>';
    const intro = taxonomy.querySelector('#taxonomy-count');
    if (intro) intro.textContent = state.lang === 'fa' ? '۳۶ دسته مصوب · ۱۴۴ جایگاه مستقل تصویر محصول' : '36 approved categories · 144 independent product-image slots';
  }

  function renderTaxonomy() {
    const root = $('#taxonomy-families'); if (!root) return;
    root.classList.add('afx-category-grid');
    root.innerHTML = PRODUCT_TAXONOMY.map(([slug, fa, en], index) => {
      const label = state.lang === 'fa' ? fa : en;
      const number = String(index + 1).padStart(2, '0');
      const slots = Array.from({ length: 4 }, (_, slot) => `<span class="afx-product-image-slot" role="img" aria-label="${escapeHtml(state.lang === 'fa' ? 'جایگاه تصویر محصول ' + (slot + 1) + '؛ تصویر واقعی هنوز متصل نشده' : 'Product image slot ' + (slot + 1) + '; live image not connected')}"><span aria-hidden="true">＋</span></span>`).join('');
      return `<article class="afx-category-card"><button class="family family-row-item afx-category-trigger" type="button" data-category="${escapeHtml(slug)}" aria-label="${escapeHtml(label)}"><span class="family-index">${number}</span><strong>${escapeHtml(label)}</strong><span class="afx-category-images">${slots}</span><span class="afx-category-open">${state.lang === 'fa' ? 'مشاهده دسته' : 'Explore category'} ↗</span></button></article>`;
    }).join('');
    const count = $('#taxonomy-count');
    if (count) count.textContent = state.lang === 'fa' ? '۳۶ دسته مصوب · ۱۴۴ جایگاه تصویر مستقل' : '36 approved categories · 144 independent image slots';
    root.querySelectorAll('[data-category]').forEach((button) => {
      const slug = button.dataset.category;
      const route = new URL('./baskets.html', document.baseURI);
      route.searchParams.set('category', slug);
      route.searchParams.set('lang', state.lang);
      button.addEventListener('click', () => { window.location.assign(route.href); });
      button.setAttribute('aria-label', state.lang === 'fa' ? `مشاهده سبد ${button.querySelector('strong')?.textContent.trim() || slug}` : `Explore basket ${button.querySelector('strong')?.textContent.trim() || slug}`);
    });
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
    installHomepageStructure();
    $('#search-form')?.addEventListener('submit', search);
    renderSelect();
    renderTaxonomy();
    bindHeroIntent();
    verifyApiReachability();
  }
  sync();
})();