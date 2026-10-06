const API_BASE='https://api.afaghx.com';
const params=new URLSearchParams(location.search);
const id=params.get('id')||'';
const lang=params.get('lang')==='en'?'en':'fa';
const fa=lang==='fa';
const root=document.querySelector('#product-root');
const t=(a,b)=>fa?a:b;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.documentElement.lang=lang;
document.documentElement.dir=fa?'rtl':'ltr';
document.title=t('AFAGHX | محصول','AFAGHX | Product');

root.innerHTML=`<div class="topbar"><div class="page topbar-inner"><a class="brand" href="../baskets.html" aria-label="AFAGHX"><span class="brand-mark" aria-hidden="true">A</span><span>AFAGHX</span></a><div class="actions"><a class="action" href="../baskets.html">${t("بازگشت به کشف","Back to discovery")}</a><a class="action" href="?id=${encodeURIComponent(id)}&lang=${fa?"en":"fa"}">${t("English","فارسی")}</a></div></div></div><main class="page"><section class="hero"><span class="eyebrow">${t("اجرای محصول","PRODUCT RUNTIME")}</span><h1>${t("جزئیات محصول","Product detail")}</h1><p class="lede">${t("این صفحه فقط رکورد معتبر برگرفته از API رسمی AFAGHX را نمایش می‌دهد.","This page renders only an authenticated Product record returned by the canonical AFAGHX API.")}</p><div id="status" class="status" role="status" aria-live="polite"></div></section><article id="card" class="card" aria-live="polite"><div id="meta" class="meta"></div><h2 id="name" class="name"></h2><p id="description" class="description"></p><div class="evidence"><span><strong>${t("منبع:","Source:")}</strong> https://api.afaghx.com/v1/products/{id}</span><span>${t("داده‌های تجاری مانند قیمت و موجودی در این نمایه محصول نمایش داده نمی‌شوند.","Commercial fields such as price and stock are not part of this Product projection.")}</span></div><div id="offers" class="offers"></div></article></main><footer class="footer"><div class="page">${t("اکوسیستم دیجیتال AFAGHX · شواهد‌محور","AFAGHX Digital Ecosystem · Evidence-first")}</div></footer>`;

const status=document.querySelector('#status');
const card=document.querySelector('#card');
const nameNode=document.querySelector('#name');
const description=document.querySelector('#description');
const meta=document.querySelector('#meta');

function state(message,error=false){status.textContent=message;status.className=error?'status error':'status';}
function render(product){
  meta.innerHTML=[product.status,product.category,product.slug].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('');
  nameNode.textContent=product.name;
  description.textContent=product.description||t('توضیحی برای این رکورد ارائه نشده است.','No description is provided for this record.');
  card.classList.add('is-visible');
  state(t('رکورد واقعی محصول از API دریافت شد.','Live Product record received from the canonical API.'));
}
async function load(){
  if(!id){state(t('شناسه محصول وجود ندارد. از نتایج جست‌وجوی واقعی یک محصول را انتخاب کنید.','Product id is missing. Open a Product from live search results.'),true);return;}
  state(t('در حال دریافت رکورد واقعی محصول…','Fetching the live Product record…'));
  try{
    const r=await fetch(`${API_BASE}/v1/products/${encodeURIComponent(id)}`,{headers:{Accept:'application/json'},mode:'cors',credentials:'include',cache:'no-store'});
    const body=await r.json().catch(()=>({}));
    if(r.status===401){state(t('برای مشاهده این محصول باید وارد AFAGHX شوید.','Authentication is required to view this Product.'),true);return;}
    if(r.status===403){state(t('دسترسی مشاهده این محصول برای زمینه فعلی مجاز نیست.','Product read access is not authorized for the current context.'),true);return;}
    if(r.status===404){state(t('این محصول در زمینه فعلی پیدا نشد.','This Product was not found in the current context.'),true);return;}
    if(!r.ok)throw new Error(body.error||`HTTP ${r.status}`);
    if(!body.id||!body.name){throw new Error('invalid_product_projection');}
    render(body);
    loadOffers(body.id);
  }catch{
    state(t('رکورد واقعی محصول در دسترس نیست؛ هیچ داده‌ای ساخته یا نمایش داده نشد.','The live Product record is unavailable; no fabricated data was created or displayed.'),true);
  }
}
load();

async function loadOffers(productId){
  const offers=document.querySelector('#offers');
  if(!offers) return;
  try{
    const r=await fetch(`${API_BASE}/v1/products/${encodeURIComponent(productId)}/offers`,{headers:{Accept:'application/json'},mode:'cors',credentials:'include',cache:'no-store'});
    const body=await r.json().catch(()=>({}));
    if(r.status===401){ offers.innerHTML=`<div class="offer-state">${t('برای مشاهده پیشنهادهای تجاری باید وارد شوید.','Authentication is required to view commercial offers.')}</div>`; return; }
    if(r.status===403){ offers.innerHTML=`<div class="offer-state">${t('دسترسی پیشنهادهای تجاری مجاز نیست.','Offer read access is not authorized.')}</div>`; return; }
    if(!r.ok) throw new Error(body.error||`HTTP ${r.status}`);
    const items=Array.isArray(body.items)?body.items:[];
    if(!items.length){ offers.innerHTML=`<div class="offer-state">${t('پیشنهاد فعالی برای این محصول ثبت نشده است.','No active offer is registered for this Product.')}</div>`; return; }
    offers.innerHTML=`<h3>${t('پیشنهادهای فعال','Active offers')}</h3><div class="offer-grid">${items.map(offer=>`<article class="offer-card"><div><strong>${esc(offer.currency)} ${esc(offer.price)}</strong><span>${t('حداقل سفارش','MOQ')}: ${offer.minimumOrderQuantity??'—'}</span></div><div class="offer-availability" data-offer-id="${esc(offer.id)}">${t('در حال دریافت موجودی…','Fetching availability…')}</div></article>`).join('')}</div>`;
    for(const offer of items) loadAvailability(offer.id);
  }catch{
    offers.innerHTML=`<div class="offer-state">${t('پیشنهادهای واقعی در دسترس نیستند؛ هیچ داده ساختگی نمایش داده نمی‌شود.','Live offers are unavailable; no fabricated data is shown.')}</div>`;
  }
}
async function loadAvailability(offerId){
  const target=document.querySelector(`[data-offer-id="${CSS.escape(String(offerId))}"]`);
  if(!target) return;
  try{
    const r=await fetch(`${API_BASE}/v1/offers/${encodeURIComponent(offerId)}/availability`,{headers:{Accept:'application/json'},mode:'cors',credentials:'include',cache:'no-store'});
    const body=await r.json().catch(()=>({}));
    if(!r.ok){ target.textContent=t('موجودی در دسترس نیست.','Availability unavailable.'); return; }
    target.textContent=body.status==='available'
      ? t(`موجودی قابل عرضه: ${body.availableQuantity}`,`Available quantity: ${body.availableQuantity}`)
      : t('در حال حاضر قابل عرضه نیست.','Currently unavailable.');
  }catch{ target.textContent=t('موجودی در دسترس نیست.','Availability unavailable.'); }
}
