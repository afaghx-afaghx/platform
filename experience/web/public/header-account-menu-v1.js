/* AFAGHX account and lists flyout v1 — UI only; destinations use existing experience routes. */
(() => {
  const fa = document.documentElement.lang.toLowerCase().startsWith('fa');
  const t = fa ? {
    signIn:'ورود به حساب',welcome:'سلام، وارد شوید',newUser:'کاربر جدید هستید؟',start:'ثبت‌نام کنید',
    lists:'فهرست‌ها و مجموعه‌های شما',account:'حساب کاربری و خدمات',
    create:'ایجاد فهرست',discover:'کشف فهرست‌ها',saved:'مجموعه‌های ذخیره‌شده',shared:'فهرست‌های اشتراکی',
    menu:['امنیت و تنظیمات حساب','سفارش‌ها و تراکنش‌ها','فعالیت و تعاملات','هوشمندی و پیشنهادها','مرکز فروشندگان','تأمین و تدارکات سازمانی','بازاریابی و تبلیغات','مالی و پرداخت‌ها','عضویت و اشتراک‌ها','قراردادها و اسناد','راهکارهای دیجیتال','پشتیبانی و رسیدگی به درخواست‌ها','مرکز شناسه AFA CODE','مدیریت سازمان و کاربران'],
    note:'بخش‌های حساب پس از ورود و بر اساس نقش و مجوز کاربر در دسترس قرار می‌گیرند.',
    close:'بستن منوی حساب'
  } : {
    signIn:'Sign in to your account',welcome:'Hello, sign in',newUser:'New to AFAGHX?',start:'Create an account',
    lists:'Your Lists & Collections',account:'Your Account & Services',
    create:'Create a List',discover:'Discover Lists',saved:'Saved Collections',shared:'Shared Lists',
    menu:['Account & Security','Orders & Transactions','Activity & Engagement','Intelligence & Recommendations','Seller Center','Procurement & Sourcing','Marketing & Advertising','Finance & Payments','Membership & Subscriptions','Contracts & Documentation','Digital Solutions','Customer Care & Resolution','AFA CODE Registry','Organization & Administration'],
    note:'Account areas become available after sign-in, subject to the user’s role and permissions.',
    close:'Close account menu'
  };
  const slugs=['account-security','orders-transactions','activity-engagement','intelligence-recommendations','seller-center','procurement-sourcing','marketing-advertising','finance-payments','membership-subscriptions','contracts-documentation','digital-solutions','customer-care','afa-code','organization-administration'];
  const init=()=>{
    const header=document.querySelector('.site-header');
    const actions=header?.querySelector('.header-actions');
    if(!actions || actions.querySelector('.afx-account-trigger')) return;
    const old=actions.querySelector('.nav-cta');
    const language=header.querySelector('#afx-language-switch');
    if(language) actions.prepend(language);
    actions.querySelector('.language-switcher')?.remove();
    if(!actions.querySelector('.afx-orders-link')){
      const orders=document.createElement('a');
      orders.className='afx-orders-link';
      orders.href=(fa?'./dashboard.html':'../dashboard.html')+'?section=orders';
      orders.textContent=fa?'سفارش‌ها':'Orders';
      actions.appendChild(orders);
    }
    const trigger=document.createElement('button');
    trigger.type='button'; trigger.className='afx-account-trigger';
    trigger.id='afx-account-trigger'; trigger.setAttribute('aria-expanded','false');
    trigger.setAttribute('aria-controls','afx-account-panel');
    trigger.innerHTML='<span class="afx-account-kicker">'+t.welcome+'</span><span class="afx-account-label">'+t.signIn+' ▾</span>';
    if(old) old.replaceWith(trigger); else actions.prepend(trigger);
    const panel=document.createElement('section');
    panel.className='afx-account-panel'; panel.id='afx-account-panel'; panel.hidden=true;
    panel.setAttribute('aria-label',t.account);
    const listLinks=t.menu.map((label,i)=>'<li><a href="./dashboard.html?section='+slugs[i]+'">'+label+'</a></li>').join('');
    panel.innerHTML='<div class="afx-account-panel-head"><strong>'+t.signIn+'</strong><a href="'+(fa?'./login.html':'../login.html')+'">'+(fa?'ورود':'Sign in')+'</a></div>'+
      '<p class="afx-account-panel-intro">'+t.newUser+' <a href="'+(fa?'./login.html?mode=register':'../login.html?mode=register')+'">'+t.start+'</a></p>'+
      '<div class="afx-account-columns"><section class="afx-account-group"><h3>'+t.lists+'</h3><ul>'+
      '<li><a href="'+(fa?'./customer.html':'../customer.html')+'#lists">'+t.create+'</a></li>'+
      '<li><a href="'+(fa?'./customer.html':'../customer.html')+'#lists">'+t.discover+'</a></li>'+
      '<li><a href="'+(fa?'./customer.html':'../customer.html')+'#lists">'+t.saved+'</a></li>'+
      '<li><a href="'+(fa?'./customer.html':'../customer.html')+'#lists">'+t.shared+'</a></li>'+
      '</ul></section><section class="afx-account-group"><h3>'+t.account+'</h3><ul>'+listLinks+'</ul></section></div>'+
      '<div class="afx-account-foot">'+t.note+'</div>';
    actions.appendChild(panel);
    const close=()=>{panel.hidden=true;trigger.setAttribute('aria-expanded','false');};
    trigger.addEventListener('click',()=>{
      const open=trigger.getAttribute('aria-expanded')!=='true';
      trigger.setAttribute('aria-expanded',String(open)); panel.hidden=!open;
      if(open){
        const rect=trigger.getBoundingClientRect();
        document.documentElement.style.setProperty('--afx-account-top',Math.max(70,Math.round(rect.bottom+8))+'px');
        panel.querySelector('a')?.focus();
      }
    });
    panel.addEventListener('keydown',e=>{if(e.key==='Escape'){close();trigger.focus();}});
    document.addEventListener('click',e=>{if(!panel.hidden&&!panel.contains(e.target)&&!trigger.contains(e.target))close();});
    trigger.setAttribute('aria-label',t.signIn);
    // Prevent the old compact-header rule from hiding account/cart actions on small screens.
    const override=document.createElement('style');
    override.textContent='@media(max-width:900px){.site-header .masthead .header-actions{display:flex!important;position:static!important;grid-column:1/-1;grid-row:3}}';
    document.head.appendChild(override);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
