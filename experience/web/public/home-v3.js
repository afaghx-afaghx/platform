(() => {
  const API_BASE = 'https://api.afaghx.com';
  const state = { query: '', category: 'all', mode: 'demo', lastResults: [] };
  const $ = (s) => document.querySelector(s);

  function ensurePanel() {
    if ($('#afx-v3-panel')) return $('#afx-v3-panel');
    const panel = document.createElement('section');
    panel.id = 'afx-v3-panel';
    panel.className = 'afx-v3-panel';
    panel.innerHTML = `
      <div class="afx-v3-panel-head"><div><span>LIVE EXPERIENCE</span><h3 id="afx-v3-title">Market command</h3></div><button id="afx-v3-close" type="button">×</button></div>
      <div id="afx-v3-status" class="afx-v3-status">Ready</div>
      <div id="afx-v3-results" class="afx-v3-results"></div>`;
    $('.afx-home main').prepend(panel);
    $('#afx-v3-close').onclick = () => panel.classList.remove('open');
    return panel;
  }

  const demo = [
    { type: 'Product', title: 'Industrial Raw Materials', meta: 'Supply · Global', text: 'Explore structured supply opportunities and qualified counterparties.' },
    { type: 'Supplier', title: 'Verified Supplier Network', meta: 'B2B · Procurement', text: 'Connect demand with suppliers, factories and commercial partners.' },
    { type: 'Factory', title: 'Production Capacity', meta: 'Industry · Capacity', text: 'Discover production capabilities and manufacturing opportunities.' },
    { type: 'Market', title: 'Regional Trade Opportunities', meta: 'Market · Cross-border', text: 'Move from market discovery toward structured commercial activity.' }
  ];

  function renderResults(items, title) {
    const panel = ensurePanel();
    $('#afx-v3-title').textContent = title || 'Market command';
    $('#afx-v3-results').innerHTML = items.length ? items.map((x, i) => `<article class="afx-v3-result"><div class="afx-v3-num">0${i + 1}</div><div><small>${escapeHtml(x.type || 'Opportunity')}</small><h4>${escapeHtml(x.title || x.name || 'AFAGHX opportunity')}</h4><p>${escapeHtml(x.text || x.description || x.meta || '')}</p></div><button type="button" data-result="${i}">Open</button></article>`).join('') : '<div class="afx-v3-empty">No results yet. Try another market intent.</div>';
    state.lastResults = items;
    panel.classList.add('open');
    $('#afx-v3-results').querySelectorAll('[data-result]').forEach(b => b.onclick = () => {
      const item = state.lastResults[Number(b.dataset.result)];
      alert(`${item.title || item.name}\n\nAFAGHX detail route will connect to the canonical API as the corresponding domain endpoint becomes available.`);
    });
  }

  function escapeHtml(v) { return String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

  async function search() {
    const input = $('#afx-search-input');
    const select = $('#afx-search-category');
    if (!input) return;
    state.query = input.value.trim(); state.category = select ? select.value : 'all';
    const status = $('#afx-v3-status');
    ensurePanel();
    status.textContent = 'Connecting to canonical API…';
    try {
      const url = `${API_BASE}/v1/search?q=${encodeURIComponent(state.query)}&category=${encodeURIComponent(state.category)}`;
      const response = await fetch(url, { headers: { Accept: 'application/json' }, mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.items || data.results || []);
      status.textContent = `Canonical API · ${items.length} result(s)`;
      renderResults(items, 'Live market results');
    } catch (error) {
      status.textContent = `Prototype mode · API endpoint not yet exposed (${error.message})`;
      const filtered = demo.filter(x => !state.query || `${x.title} ${x.text} ${x.type}`.toLowerCase().includes(state.query.toLowerCase()));
      renderResults(filtered.length ? filtered : demo, 'Market command · prototype data');
    }
  }

  function wire() {
    const form = $('.afx-command');
    if (form && !form.dataset.v3) {
      form.dataset.v3 = '1';
      const input = form.querySelector('input');
      if (input) input.id = 'afx-search-input';
      const select = form.querySelector('select');
      if (select) select.id = 'afx-search-category';
      const button = form.querySelector('button');
      if (button) button.addEventListener('click', (e) => { e.preventDefault(); search(); });
      form.addEventListener('submit', e => { e.preventDefault(); search(); });
      input?.addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
    }

    document.querySelectorAll('.afx-role a, .afx-intent-card, .afx-board-row:not(.head)').forEach(el => {
      if (el.dataset.v3) return;
      el.dataset.v3 = '1';
      el.addEventListener('click', e => {
        const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
        if (!text) return;
        e.preventDefault();
        const input = $('#afx-search-input');
        if (input) { input.value = text.slice(0, 80); search(); }
      });
    });
  }

  const style = document.createElement('style');
  style.textContent = `.afx-v3-panel{display:none;position:relative;margin:0 auto 20px;width:min(1240px,calc(100% - 40px));padding:22px;border:1px solid #33415a;border-radius:20px;background:#080e18;box-shadow:0 30px 100px #0009}.afx-v3-panel.open{display:block}.afx-v3-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.afx-v3-panel-head span{font-size:9px;letter-spacing:.16em;color:#9b90ff;font-weight:900}.afx-v3-panel-head h3{margin:7px 0 0;font-size:25px}.afx-v3-panel-head button{background:#121b2a;border:1px solid #29364d;color:#fff;border-radius:9px;width:34px;height:34px;font-size:20px;cursor:pointer}.afx-v3-status{margin:18px 0;color:#75839a;font-size:10px}.afx-v3-results{display:grid;gap:9px}.afx-v3-result{display:grid;grid-template-columns:38px 1fr auto;gap:15px;align-items:center;padding:15px;border:1px solid #202d42;border-radius:13px;background:#0d1521}.afx-v3-num{color:#8f83ff;font-weight:900}.afx-v3-result small{color:#77859d;font-size:9px;text-transform:uppercase;letter-spacing:.1em}.afx-v3-result h4{margin:5px 0;font-size:14px}.afx-v3-result p{margin:0;color:#738198;font-size:10px;line-height:1.6}.afx-v3-result button{border:1px solid #35425a;background:#111a29;color:#dce3ef;border-radius:9px;padding:8px 11px;font-size:9px;font-weight:900}.afx-v3-empty{padding:25px;color:#7d899e;border:1px dashed #2b3850;border-radius:12px}@media(max-width:600px){.afx-v3-panel{width:calc(100% - 24px)}.afx-v3-result{grid-template-columns:28px 1fr}.afx-v3-result button{grid-column:2;width:max-content}}`;
  document.head.appendChild(style);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
