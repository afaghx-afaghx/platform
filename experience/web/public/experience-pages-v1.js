(() => {
const lang=document.documentElement.lang||'en';
const fa=lang==='fa';
const dict={
  title:document.body.dataset.title||'AFAGHX Experience',
  subtitle:document.body.dataset.subtitle||'Experience surface governed by the AFAGHX API and canonical architecture.',
  state:document.body.dataset.state||'Runtime evidence required',
  cards:(document.body.dataset.cards||'Identity,Data,Action').split('|')
};
const root=document.querySelector('[data-page-root]');
if(!root)return;
root.innerHTML=`<main><span class="eyebrow">AFAGHX · EXPERIENCE</span><h1>${dict.title}</h1><p class="lede">${dict.subtitle}</p><div class="actions"><a href="./index.html">${fa?'بازگشت به اکوسیستم':'Back to ecosystem'}</a><a href="./en/">${fa?'نسخه انگلیسی':'English'}</a></div><div class="grid">${dict.cards.map((x,i)=>`<article class="card"><span class="status">${i===0?'CANONICAL':i===1?'API GOVERNED':'EVIDENCE REQUIRED'}</span><h2>${x}</h2><p>${fa?'این سطح تجربه آماده اتصال است؛ داده تجاری واقعی فقط از مسیر رسمی سامانه پذیرفته می‌شود.':'This experience surface is ready for governed integration; real business data is accepted only through the canonical system path.'}</p></article>`).join('')}</div><p class="lede" style="margin-top:32px">${dict.state}</p></main>`;
})();