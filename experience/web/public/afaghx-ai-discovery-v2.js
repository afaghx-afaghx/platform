import './afaghx-ai-discovery-v2.css';
import './afaghx-ai-comparison-v2.css';
import './afaghx-ai-comparison-v2.js';

(() => {
  const API = 'https://api.afaghx.com';
  const t = (fa, en) => (document.documentElement.lang === 'en' ? en : fa);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function mount() {
    const hero = document.querySelector('.hero');
    if (!hero || document.querySelector('#ai-discovery-v2')) return;
    const section = document.createElement('section');
    section.id = 'ai-discovery-v2';
    section.className = 'ai-native-v2';
    section.innerHTML = `
      <div class="wrap ai-native-v2__shell">
        <div class="ai-native-v2__header">
          <div>
            <span class="ai-native-v2__eyebrow">AI-NATIVE DISCOVERY · GOVERNED</span>
            <h2>${t('به‌جای جست‌وجو، هدفتان را بگویید.','Describe the goal, not just the keyword.')}</h2>
            <p>${t('ورودی طبیعی شما به مسیر کشف، تأمین، مقایسه و اقدام تجاری هدایت می‌شود؛ نتایج فقط از داده واقعی API رسمی نمایش داده می‌شوند.','Natural-language intent becomes a governed path to discovery, sourcing, comparison and action; results come only from the canonical API.')}</p>
          </div>
          <span class="ai-native-v2__state">${t('هوشمندی آماده اتصال به سرویس رسمی','Intelligence ready for the official service')}</span>
        </div>
        <div class="ai-native-v2__body">
          <div class="ai-native-v2__composer">
            <form class="ai-native-v2__form" id="ai-native-v2-form">
              <label class="sr-only" for="ai-native-v2-input">${t('نیاز خود را بیان کنید','Describe your need')}</label>
              <input class="ai-native-v2__input" id="ai-native-v2-input" autocomplete="off" placeholder="${t('مثلاً: برای یک کارخانه، پمپ صنعتی مناسب می‌خواهم…','e.g. I need a suitable industrial pump for a factory…')}">
              <button class="ai-native-v2__submit" type="submit">${t('شروع کشف','Start discovery')}</button>
            </form>
            <div class="ai-native-v2__chips" role="group" aria-label="${t('نمونه نیت','Intent examples')}">
              <button class="ai-native-v2__chip" type="button" data-ai-intent="محصول مناسب برای کارخانه می‌خواهم">${t('محصول برای کارخانه','Product for a factory')}</button>
              <button class="ai-native-v2__chip" type="button" data-ai-intent="تأمین‌کننده معتبر برای خرید سازمانی می‌خواهم">${t('تأمین‌کننده معتبر','Verified supplier')}</button>
              <button class="ai-native-v2__chip" type="button" data-ai-intent="خدمت تخصصی برای کسب‌وکار می‌خواهم">${t('خدمت تخصصی','Specialized service')}</button>
            </div>
            <div class="ai-native-v2__helper">
              <strong>${t('اصل معماری: هوش مصنوعی تصمیم‌یار است، نه مرجع حقیقت.','Architecture rule: AI assists decisions; it is not the source of truth.')}</strong>
              <span>${t('داده و مجوز از مسیر API/Core تعیین می‌شود.','Data and authorization remain governed by API/Core.')}</span>
            </div>
          </div>
          <div class="ai-native-v2__signals">
            <div class="ai-native-v2__signal"><small>${t('فهم نیت','Intent')}</small><strong id="ai-native-intent-state">${t('منتظر ورودی','Waiting for input')}</strong><span>${t('نوع نیاز و مسیر مناسب از متن کاربر مشخص می‌شود.','The user goal and relevant path are inferred from the request.')}</span></div>
            <div class="ai-native-v2__signal"><small>${t('منبع','Source')}</small><strong>api.afaghx.com</strong><span>/v1/search · بدون داده ساختگی</span></div>
            <div class="ai-native-v2__signal"><small>${t('اقدام بعدی','Next action')}</small><strong id="ai-native-next-state">${t('کشف','Discover')}</strong><span>${t('نتایج واقعی → مقایسه → اعتماد → اقدام','Live results → comparison → trust → action')}</span></div>
          </div>
        </div>
        <div class="ai-native-v2__result" id="ai-native-v2-result">
          <div class="ai-native-v2__resultbar"><span id="ai-native-v2-status"></span><b>${t('نتایج کشف','Discovery results')}</b></div>
          <div class="ai-native-v2__results" id="ai-native-v2-results"></div>
        </div>
      </div>`;
    const commerce = document.querySelector('#commerce-discovery');
    if (commerce) commerce.insertAdjacentElement('beforebegin', section);
    else hero.insertAdjacentElement('afterend', section);
    bind();
  }

  function bind() {
    const input = document.querySelector('#ai-native-v2-input');
    const form = document.querySelector('#ai-native-v2-form');
    if (!input || !form) return;
    document.querySelectorAll('[data-ai-intent]').forEach((button) => button.addEventListener('click', () => {
      document.querySelectorAll('[data-ai-intent]').forEach((item) => item.setAttribute('aria-pressed', item === button ? 'true' : 'false'));
      input.value = button.dataset.aiIntent || '';
      input.focus();
    }));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      runDiscovery(input.value.trim());
    });
  }

  function runDiscovery(query) {
    const normalized = query || '';
    const intentState = document.querySelector('#ai-native-intent-state');
    const next = document.querySelector('#ai-native-next-state');
    const result = document.querySelector('#ai-native-v2-result');
    const status = document.querySelector('#ai-native-v2-status');
    const root = document.querySelector('#ai-native-v2-results');
    if (!intentState || !next || !result || !status || !root) return;
    if (!normalized) {
      intentState.textContent = t('نیاز وارد نشده','No intent entered');
      next.textContent = t('ورودی لازم است','Input required');
      result.classList.add('is-visible');
      status.textContent = t('برای شروع، نیاز خود را به زبان طبیعی بنویسید.','Describe your need in natural language to begin.');
      root.innerHTML = '<div class="ai-native-v2__empty">' + escapeHtml(t('بدون داده یا نیت مشخص، هیچ نتیجه‌ای تولید نمی‌شود.','No result is generated without a clear request.')) + '</div>';
      return;
    }
    intentState.textContent = normalized.length > 54 ? normalized.slice(0,54) + '…' : normalized;
    next.textContent = t('در حال کشف…','Discovering…');
    result.classList.add('is-visible');
    status.textContent = t('در حال بازیابی داده واقعی از API رسمی AFAGHX…','Retrieving live data from the canonical AFAGHX API…');
    root.innerHTML = '<div class="ai-native-v2__empty">' + escapeHtml(t('نتایج فقط از API رسمی پذیرفته می‌شوند.','Only canonical API results are accepted.')) + '</div>';

    const url = API + '/v1/search?' + new URLSearchParams({ q: normalized, category: 'all' });
    fetch(url, { headers: { Accept: 'application/json' }, mode: 'cors' })
      .then((response) => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then((data) => {
        const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.results) ? data.results : []));
        window.__AFX_AI_RESULTS_V2__ = items.slice(0,3);
        window.dispatchEvent(new CustomEvent('afx:ai-results',{detail:{count:items.length}}));
        next.textContent = t('نتیجه → مقایسه','Results → compare');
        status.textContent = API + '/v1/search · ' + items.length + ' ' + t('نتیجه واقعی','live results');
        if (!items.length) {
          root.innerHTML = '<div class="ai-native-v2__empty">' + escapeHtml(t('نتیجه زنده‌ای برای این نیاز دریافت نشد؛ داده ساختگی نمایش داده نمی‌شود.','No live result was returned; fabricated data is not shown.')) + '</div>';
          return;
        }
        root.innerHTML = items.slice(0,3).map((item) => {
          const title = item?.title || item?.name || item?.type || 'AFAGHX';
          const description = item?.description || item?.text || '';
          return '<article class="ai-native-v2__card"><div class="ai-native-v2__cardhead"><small>' + escapeHtml(item?.type || 'RESULT') + '</small><label><input type="checkbox" data-compare-key="result-' + index + '" aria-label="' + escapeHtml(t('انتخاب برای مقایسه','Select for comparison')) + '"></label></div><strong>' + escapeHtml(title) + '</strong><p>' + escapeHtml(description) + '</p></article>';
        }).join('');
      })
      .catch(() => {
        next.textContent = t('نیاز به اتصال API','API connection required');
        status.textContent = t('پاسخ زنده در دسترس نیست','Live response unavailable');
        root.innerHTML = '<div class="ai-native-v2__empty">' + escapeHtml(t('هوش مصنوعی یا جست‌وجوی واقعی تا زمان دسترسی API متوقف می‌ماند؛ هیچ نتیجه ساختگی نمایش داده نمی‌شود.','AI/discovery remains fail-closed until the API is reachable; no fabricated result is shown.')) + '</div>';
      });
  }

  mount();
})();