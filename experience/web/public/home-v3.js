(() => {
  const API_BASE = 'https://api.afaghx.com';
  const state = { query: '', category: 'all', lastResults: [], lang: localStorage.getItem('afaghx_lang') || 'fa' };
  const $ = (selector) => document.querySelector(selector);
  const demo = [
    { type: 'Product', title: 'Industrial Raw Materials', meta: 'Supply · Global', text: 'Explore structured supply opportunities and qualified counterparties.' },
    { type: 'Supplier', title: 'Verified Supplier Network', meta: 'B2B · Procurement', text: 'Connect demand with suppliers, factories and commercial partners.' },
    { type: 'Factory', title: 'Production Capacity', meta: 'Industry · Capacity', text: 'Discover production capabilities and manufacturing opportunities.' },
    { type: 'Market', title: 'Regional Trade Opportunities', meta: 'Market · Cross-border', text: 'Move from market discovery toward structured commercial activity.' }
  ];
  const categoryLabels = {
    fa: {
      all: 'همه دسته‌ها', 'dry-fruits-beverages':'خشکبار و نوشیدنی‌ها','clothing':'پوشاک','automotive':'خودرو و لوازم جانبی خودرو','home-appliances':'لوازم خانگی','consumer-electronics':'لوازم الکترونیک مصرفی','office-school':'لوازم اداری و مدرسه','home-textiles':'منسوجات خانگی','toys-entertainment':'اسباب‌بازی و سرگرمی','gifts-handicrafts':'هدایا و صنایع دستی','furniture':'مبلمان تجاری، اداری، مسکونی','home-garden':'خانه و باغ','fashion-accessories':'لوازم جانبی و مد','watches-jewelry-eyewear':'ساعت، جواهرات، عینک','bags-cases':'چمدان، کیف، جعبه','footwear':'کفش و لوازم جانبی','sports-entertainment':'ورزش و سرگرمی','beauty-personal-care':'زیبایی و مراقبت شخصی','health-medical':'بهداشت و پزشکی','machinery-equipment':'دستگاه‌ها و ماشین‌آلات','electrical-equipment':'تجهیزات و لوازم الکتریکی','energy':'انرژی','environment':'محیط زیست','raw-textiles':'پارچه و منسوجات خام','lighting':'چراغ و روشنایی','construction-real-estate':'تجهیزات ساخت‌وساز و املاک و مستغلات','agriculture':'کشاورزی','minerals-metallurgy':'مواد معدنی و متالورژی','chemicals':'مواد شیمیایی','rubber-plastics':'لاستیک و پلاستیک','tools-hardware':'ابزار و سخت‌افزار','security-protection':'امنیت و حفاظت','electronics-components-communications':'قطعات الکترونیکی، لوازم جانبی و ارتباطات','service-equipment':'سرویس و خدمات','business-services':'خدمات تجاری','construction-services':'خدمات ساخت','packaging-printing':'بسته‌بندی و چاپ'
    },
    en: {
      all: 'All categories', 'dry-fruits-beverages':'Dried Fruits & Beverages','clothing':'Clothing','automotive':'Automotive & Accessories','home-appliances':'Home Appliances','consumer-electronics':'Consumer Electronics','office-school':'Office & School Supplies','home-textiles':'Home Textiles','toys-entertainment':'Toys & Entertainment','gifts-handicrafts':'Gifts & Handicrafts','furniture':'Furniture','home-garden':'Home & Garden','fashion-accessories':'Fashion Accessories','watches-jewelry-eyewear':'Watches, Jewelry & Eyewear','bags-cases':'Bags, Cases & Luggage','footwear':'Footwear & Accessories','sports-entertainment':'Sports & Entertainment','beauty-personal-care':'Beauty & Personal Care','health-medical':'Health & Medical','machinery-equipment':'Machinery & Equipment','electrical-equipment':'Electrical Equipment','energy':'Energy','environment':'Environment','raw-textiles':'Raw Textiles & Fabrics','lighting':'Lighting','construction-real-estate':'Construction & Real Estate','agriculture':'Agriculture','minerals-metallurgy':'Minerals & Metallurgy','chemicals':'Chemicals','rubber-plastics':'Rubber & Plastics','tools-hardware':'Tools & Hardware','security-protection':'Security & Protection','electronics-components-communications':'Electronics, Accessories & Communications','service-equipment':'Service & Equipment','business-services':'Business Services','construction-services':'Construction Services','packaging-printing':'Packaging & Printing'
    }
  };
  function syncCategoryLabels() {
    const dict = categoryLabels[state.lang] || categoryLabels.en;
    const select = $('#afx-search-category'); if (!select) return;
    select.querySelectorAll('option').forEach((option) => { const value = option.value; if (dict[value] && value !== 'all') option.textContent = state.lang === 'fa' ? `${dict[value]} / ${categoryLabels.en[value]}` : dict[value]; });
    const all = select.querySelector('option[value="all"]'); if (all) all.textContent = state.lang === 'fa' ? 'همه دسته‌ها / All categories' : dict.all;
  }
  const translations = { en: { placeholder:'Search products, suppliers, factories, services or categories...', join:'Join AFAGHX', account:'Account' }, fa: { placeholder:'محصول، تأمین‌کننده، کارخانه، خدمت یا دسته را جست‌وجو کنید...', join:'ورود به AFAGHX', account:'حساب کاربری' } };
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function applyLanguage(lang) {
    state.lang = translations[lang] ? lang : 'fa';
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'fa' ? 'rtl' : 'ltr';
    const input = $('#afx-search-input'); if (input) input.placeholder = translations[state.lang].placeholder;
    const langButtons = ['#lang-btn','#header-lang'];
    const toggleText = state.lang === 'fa' ? 'EN' : 'FA';
    langButtons.forEach((selector) => { const button = $(selector); if (button) button.textContent = toggleText; });
    syncCategoryLabels();
    localStorage.setItem('afaghx_lang', state.lang);
    document.title = state.lang === 'fa' ? 'AFAGHX | اکوسیستم هوشمند کسب‌وکار و تجارت' : 'AFAGHX | Intelligent Business & Trade Ecosystem';
  }
  function ensurePanel() {
    if ($('#afx-v3-panel')) return $('#afx-v3-panel');
    const panel = document.createElement('section'); panel.id='afx-v3-panel'; panel.className='afx-v3-panel';
    panel.innerHTML='<div class="afx-v3-panel-head"><div><span>AFAGHX DISCOVERY</span><h3 id="afx-v3-title">Market command</h3></div><button id="afx-v3-close" type="button">×</button></div><div id="afx-v3-status" class="afx-v3-status"></div><div id="afx-v3-results" class="afx-v3-results"></div>';
    $('.afx-home main')?.prepend(panel); $('#afx-v3-close')?.addEventListener('click',()=>panel.classList.remove('open')); return panel;
  }
  function renderResults(items, title) {
    const panel=ensurePanel(); $('#afx-v3-title').textContent=title;
    $('#afx-v3-results').innerHTML=items.length ? items.map((x,i)=>`<article class="afx-v3-result"><div class="afx-v3-num">0${i+1}</div><div><small>${escapeHtml(x.type||'Opportunity')}</small><h4>${escapeHtml(x.title||x.name||'AFAGHX opportunity')}</h4><p>${escapeHtml(x.text||x.description||x.meta||'')}</p></div><button type="button" data-result="${i}">${state.lang === 'fa' ? 'باز کردن' : 'Open'}</button></article>`).join('') : `<div class="afx-v3-empty">${state.lang === 'fa' ? 'نتیجه‌ای پیدا نشد. عبارت دیگری را امتحان کنید.' : 'No results yet. Try another market intent.'}</div>`;
    state.lastResults=items; panel.classList.add('open');
    $('#afx-v3-results').querySelectorAll('[data-result]').forEach((button)=>button.onclick=()=>{const item=state.lastResults[Number(button.dataset.result)];window.alert(`${item.title||item.name}\n\n${state.lang === 'fa' ? 'این مسیر پس از ارائه endpoint دامنه به API رسمی متصل می‌شود.' : 'This detail route will connect to the canonical API when the corresponding domain endpoint is available.'}`);});
  }
  async function search() {
    const input=$('#afx-search-input'), select=$('#afx-search-category'); if(!input)return;
    state.query=input.value.trim(); state.category=select ? select.value : 'all'; ensurePanel(); const status=$('#afx-v3-status');
    const categoryLabel = categoryLabels[state.lang][state.category] || state.category;
    status.textContent = state.lang === 'fa' ? `در حال جست‌وجو · ${categoryLabel}` : `Searching · ${categoryLabel}`;
    try {
      const params = new URLSearchParams({q:state.query, category:state.category});
      const url=`${API_BASE}/v1/search?${params.toString()}`;
      const response=await fetch(url,{headers:{Accept:'application/json'},mode:'cors'}); if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json(); const items=Array.isArray(data)?data:(data.items||data.results||[]);
      status.textContent=`${state.lang === 'fa' ? 'API رسمی' : 'Canonical API'} · ${items.length}`; renderResults(items, state.lang === 'fa' ? 'نتایج بازار' : 'Live market results');
    } catch (error) {
      const q=state.query.toLowerCase(); const category=state.category.toLowerCase(); const filtered=demo.filter(x=>!q||`${x.title} ${x.text} ${x.type}`.toLowerCase().includes(q) || category==='all');
      renderResults(filtered.length ? filtered : demo, state.lang === 'fa' ? 'بازار · داده نمونه' : 'Market command · prototype data');
      status.textContent = state.lang === 'fa' ? 'حالت نمونه · endpoint جست‌وجوی رسمی در دسترس نیست' : 'Prototype mode · canonical search endpoint not exposed';
    }
  }
  function toggleLanguage() { applyLanguage(state.lang === 'fa' ? 'en' : 'fa'); }
  function wire() {
    applyLanguage(state.lang);
    ['#lang-btn','#header-lang'].forEach((selector)=>{const button=$(selector);if(button&&!button.dataset.wired){button.dataset.wired='1';button.addEventListener('click',toggleLanguage);}});
    const form=$('.afx-command'); if(form&&!form.dataset.v3){form.dataset.v3='1';form.addEventListener('submit',(event)=>{event.preventDefault();search();});}
    document.querySelectorAll('[data-category]').forEach((element)=>{if(element.dataset.v3)return;element.dataset.v3='1';element.addEventListener('click',(event)=>{event.preventDefault();const select=$('#afx-search-category'),input=$('#afx-search-input');if(select)select.value=element.dataset.category;if(input){input.value=element.textContent.trim();}window.scrollTo({top:0,behavior:'smooth'});search();});});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire); else wire();
})();
