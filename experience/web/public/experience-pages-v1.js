(() => {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('lang') === 'fa' ? 'fa' : 'en';
  const fa = lang === 'fa';
  document.documentElement.lang = lang;
  document.documentElement.dir = fa ? 'rtl' : 'ltr';

  const enTitle = document.body.dataset.title || 'AFAGHX Experience';
  const enSubtitle = document.body.dataset.subtitle || 'Experience surface governed by the AFAGHX API and canonical architecture.';
  const stateText = document.body.dataset.state || 'Runtime evidence required';
  const titles = {
    'B2C Experience':'تجربه خرید شخصی','B2B Experience':'تجربه کسب‌وکار','34 Product Baskets':'۳۴ سبد کالایی',
    'Products':'کالاها','Suppliers':'تأمین‌کنندگان','Factories':'کارخانه‌ها','Services':'خدمات','Markets':'بازارها',
    'Network':'شبکه','Trust':'اعتماد','KYB':'احراز کسب‌وکار','About AFAGHX':'درباره AFAGHX','Roadmap':'نقشه راه',
    'Architecture':'معماری','Contact':'تماس','Documentation':'مستندات','Dashboard':'داشبورد','Profile':'پروفایل',
    'Company':'سازمان','RFQ':'درخواست پیشنهاد','Quotes':'پیشنهادها','Orders':'سفارش‌ها','Contracts':'قراردادها',
    'Administration':'مدیریت سامانه','AI Assistant':'دستیار هوشمند','AI Match':'تطبیق هوشمند','Cart':'سبد خرید',
    'Checkout':'پرداخت','Purchase Order':'سفارش خرید'
  };
  const subtitles = {
    'B2C Experience':'کشف → کالا → سبد خرید → پرداخت → سفارش',
    'B2B Experience':'نیاز → درخواست پیشنهاد → پیشنهادها → مذاکره → قرارداد → سفارش خرید',
    '34 Product Baskets':'طبقه‌بندی مرجع کالا و کشف سبدها',
    'Products':'کشف کالاها از مسیر رسمی سامانه','Suppliers':'کشف و ارزیابی تأمین‌کنندگان',
    'Factories':'کشف ظرفیت و توانمندی کارخانه‌ها','Services':'کشف خدمات و راهکارها','Markets':'مسیرهای بازار و تجارت',
    'Network':'ارتباط میان مشارکت‌کنندگان اکوسیستم','Trust':'هویت، سازمان، سیاست و شواهد',
    'KYB':'اطلاعات و شواهد سازمانی','About AFAGHX':'ماموریت، معماری و مدل عملیاتی',
    'Roadmap':'مسیر توسعه کنترل‌شده اکوسیستم','Architecture':'معماری مرجع و مرزهای وابستگی',
    'Contact':'ورودی رسمی ارتباط و پشتیبانی','Documentation':'قراردادها، APIها، معماری و شواهد',
    'Dashboard':'سطح تجربه احراز هویت‌شده','Profile':'پروفایل و زمینه هویتی',
    'Company':'سازمان و عضویت','RFQ':'چرخه درخواست پیشنهاد','Quotes':'پیشنهادهای تأمین‌کنندگان',
    'Orders':'چرخه سفارش','Contracts':'چرخه قرارداد','Administration':'سطح مدیریت سامانه',
    'AI Assistant':'تجربه تصمیم‌یار تحت حاکمیت','AI Match':'تطبیق نیاز و عرضه تحت حاکمیت',
    'Cart':'سبد خرید B2C','Checkout':'تجربه پرداخت B2C','Purchase Order':'چرخه سفارش خرید'
  };
  const title = fa ? (titles[enTitle] || 'تجربه AFAGHX') : enTitle;
  const subtitle = fa ? (subtitles[enTitle] || 'سطح تجربه تحت معماری مرجع AFAGHX') : enSubtitle;
  const state = fa ? 'برای نمایش داده واقعی، شواهد اجرایی و اتصال رسمی به سامانه مرجع الزامی است.' : stateText;
  document.title = fa ? `AFAGHX | ${title}` : `AFAGHX | ${enTitle}`;

  const root = document.querySelector('[data-page-root]');
  if (!root) return;
  const prefix = '../';
  const home = prefix + (fa ? '?lang=fa' : '');
  const other = prefix + (fa ? '?lang=en' : 'en/');
  const labels = fa
    ? {home:'اکوسیستم',lang:'English',aria:'انتخاب زبان',status:['مرجع','تحت حاکمیت API','نیازمند شواهد'],back:'بازگشت به اکوسیستم',state:'وضعیت و داده تجاری فقط از مسیر رسمی سامانه پذیرفته می‌شود.',footer:'اکوسیستم دیجیتال AFAGHX'}
    : {home:'Ecosystem',lang:'فارسی',aria:'Language selection',status:['CANONICAL','API GOVERNED','EVIDENCE REQUIRED'],back:'Back to ecosystem',state:stateText,footer:'AFAGHX Digital Ecosystem'};

  root.innerHTML = `
    <div class="shell">
      <header class="topbar">
        <nav class="nav" aria-label="${fa?'ناوبری اصلی':'Primary navigation'}">
          <a class="brand" href="${home}" aria-label="AFAGHX"><span class="brand-mark" aria-hidden="true">A</span><span>AFAGHX</span></a>
          <div class="nav-actions">
            <a class="nav-link" href="${home}">${labels.home}</a>
            <a class="lang-link ${fa?'':'active'}" href="${other}" aria-label="${labels.aria}">${labels.lang}</a>
          </div>
        </nav>
      </header>
      <main>
        <div class="breadcrumb"><a href="${home}">AFAGHX</a> <span aria-hidden="true"> / </span> <span>${title}</span></div>
        <span class="eyebrow">AFAGHX · ${fa?'تجربه':'EXPERIENCE'}</span>
        <h1>${title}</h1>
        <p class="lede">${subtitle}</p>
        <div class="actions">
          <a class="button primary" href="${home}">${labels.back}</a>
          <a class="button" href="${other}">${labels.lang}</a>
        </div>
        <div class="grid">
          <article class="card"><span class="status">${labels.status[0]}</span><h2>${fa?'هویت و ساختار':'Identity & Structure'}</h2><p>${fa?'این سطح تجربه از مرزهای معماری مرجع عبور نمی‌کند.':'This experience surface does not cross canonical architecture boundaries.'}</p></article>
          <article class="card"><span class="status">${labels.status[1]}</span><h2>${fa?'اتصال رسمی':'Governed Integration'}</h2><p>${fa?'داده واقعی فقط از مسیرهای رسمی و قراردادهای مصوب پذیرفته می‌شود.':'Real data is accepted only through governed contracts and official system paths.'}</p></article>
          <article class="card"><span class="status">${labels.status[2]}</span><h2>${fa?'شواهد اجرایی':'Runtime Evidence'}</h2><p>${fa?'هیچ قابلیت زنده بدون شواهد اجرایی ادعا نمی‌شود.':'No live capability is claimed without runtime evidence.'}</p></article>
        </div>
        <p class="state">${state}</p>
      </main>
      <footer class="footer"><div class="footer-inner"><span>${labels.footer}</span><span>© AFAGHX</span></div></footer>
    </div>`;
})();
