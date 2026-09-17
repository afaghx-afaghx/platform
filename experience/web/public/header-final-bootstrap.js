// Loaded by the existing home-v5.js runtime through its module import path when enabled by the page.
export function installFinalHeader(){
 const h=document.querySelector('.site-header'); if(!h)return;
 const b=h.querySelector('.brand'), a=h.querySelector('.header-actions'); if(!b||!a)return;
 if(!h.querySelector('.afx-location')){const x=document.createElement('span');x.className='afx-location';x.innerHTML='<span class="location-pin">📍</span><span>موقعیت مکانی</span>';b.appendChild(x)}
 if(!a.querySelector('.afx-language')){const x=document.createElement('button');x.type='button';x.className='afx-language';x.innerHTML='<span class="active">FA</span><span>/</span><span>EN</span>';a.prepend(x)}
 if(!a.querySelector('.afx-cart')){const x=document.createElement('a');x.className='afx-cart';x.href='./cart.html';x.innerHTML='<span>🛒</span><span>سبد کالا</span>';a.appendChild(x)}
}
