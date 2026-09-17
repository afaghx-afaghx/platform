(() => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const masthead = header.querySelector('.masthead');
  const brand = header.querySelector('.brand');
  const actions = header.querySelector('.header-actions');
  if (!masthead || !brand || !actions) return;
  if (!document.getElementById('afx-header-final-css')) {
    const link = document.createElement('link'); link.id='afx-header-final-css'; link.rel='stylesheet'; link.href='./header-final.css'; document.head.appendChild(link);
  }
  if (!masthead.querySelector('.afx-location')) {
    const location = document.createElement('span'); location.className='afx-location'; location.setAttribute('aria-label','موقعیت مکانی'); location.innerHTML='<span class="location-pin" aria-hidden="true">📍</span><span>موقعیت مکانی</span>'; brand.appendChild(location);
  }
  if (!actions.querySelector('.afx-language')) {
    const language = document.createElement('button'); language.type='button'; language.className='afx-language'; language.setAttribute('aria-label','Language / زبان'); language.innerHTML='<span class="active">FA</span><span aria-hidden="true">/</span><span>EN</span>'; actions.prepend(language);
  }
  if (!actions.querySelector('.afx-cart')) {
    const cart = document.createElement('a'); cart.className='afx-cart'; cart.href='./cart.html'; cart.setAttribute('aria-label','سبد کالا'); cart.innerHTML='<span aria-hidden="true">🛒</span><span>سبد کالا</span>'; actions.appendChild(cart);
  }
  const carts=[...header.querySelectorAll('.afx-cart, [data-cart], .cart-link, a[href*="cart"]')]; carts.slice(1).forEach(node=>node.remove());
})();
