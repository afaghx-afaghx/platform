(() => {
  const lang = () => localStorage.getItem('afaghx_lang') || 'fa';
  const translations = {
    'roles.html': {
      title: ['Experience Hub | AFAGHX', 'Experience Hub | AFAGHX'],
      h1: ['مسیر تجربه خود را انتخاب کنید', 'Choose Your Experience'],
      p: ['Experience Layer — Identity, Organization, Tenant و Policy توسط Canonical API کنترل می‌شوند.', 'Experience Layer — Identity, Organization, Tenant, and Policy are governed by the Canonical API.'],
      home: ['خانه', 'Home'],
    },
    'customer.html': {
      title: ['Customer Experience | AFAGHX', 'Customer Experience | AFAGHX'],
      p1: ['کشف محصولات و خدمات، خرید و ارتباط تجاری در AFAGHX.', 'Discover products and services, purchase, and build business connections across AFAGHX.'],
      p2: ['Presentation only · API governed', 'Presentation only · API governed'], back: ['بازگشت', 'Back to Experience Hub'],
    },
    'business.html': {
      title: ['Business Experience | AFAGHX', 'Business Experience | AFAGHX'],
      p1: ['مدیریت سازمان، خرید و فروش و روابط تجاری.', 'Manage organization-led commerce, procurement, sales, and business relationships.'],
      p2: ['Organization-led · API governed', 'Organization-led · API governed'], back: ['بازگشت', 'Back to Experience Hub'],
    },
    'supplier.html': {
      title: ['Supplier Experience | AFAGHX', 'Supplier Experience | AFAGHX'],
      p1: ['ارائه محصول، توانمندی و ارتباط با خریداران.', 'Publish supply, capabilities, and connect with qualified buyers.'],
      p2: ['Presentation only · API governed', 'Presentation only · API governed'], back: ['بازگشت', 'Back to Experience Hub'],
    },
    'factory.html': {
      title: ['Factory Experience | AFAGHX', 'Factory Experience | AFAGHX'],
      p1: ['نمایش ظرفیت تولید، توانمندی و فرصت‌های صنعتی.', 'Show production capacity, capabilities, and industrial opportunities.'],
      p2: ['Presentation only · API governed', 'Presentation only · API governed'], back: ['بازگشت', 'Back to Experience Hub'],
    },
    'partner.html': {
      title: ['Partner Experience | AFAGHX', 'Partner Experience | AFAGHX'],
      p1: ['مدیریت همکاری‌های راهبردی و شبکه شرکا.', 'Build and manage strategic partnerships across the ecosystem.'],
      p2: ['Network role · API governed', 'Network role · API governed'], back: ['بازگشت', 'Back to Experience Hub'],
    },
  };

  const file = window.location.pathname.split('/').filter(Boolean).pop() || 'roles.html';
  const tr = translations[file] || translations['roles.html'];
  const set = (el, pair, isEnglish) => { if (el) el.textContent = pair[isEnglish ? 1 : 0]; };

  function render() {
    const isEnglish = lang() === 'en';
    document.documentElement.lang = isEnglish ? 'en' : 'fa';
    document.documentElement.dir = isEnglish ? 'ltr' : 'rtl';
    document.title = tr.title[isEnglish ? 1 : 0];
    if (file === 'roles.html') {
      set(document.querySelector('main h1'), tr.h1, isEnglish);
      set(document.querySelector('main > p'), tr.p, isEnglish);
      set(document.querySelector('main > p:last-child a'), tr.home, isEnglish);
    } else {
      set(document.querySelector('main p:nth-of-type(1)'), tr.p1, isEnglish);
      set(document.querySelector('main p:nth-of-type(2)'), tr.p2, isEnglish);
      set(document.querySelector('main a'), tr.back, isEnglish);
    }
    let button = document.querySelector('#afx-role-lang');
    if (!button) {
      button = document.createElement('button');
      button.id = 'afx-role-lang';
      button.type = 'button';
      button.style.cssText = 'position:fixed;top:16px;inset-inline-end:16px;z-index:10;border:1px solid #32414f;border-radius:8px;background:#0f171f;color:#fff;padding:9px 13px;font:700 12px system-ui;cursor:pointer;';
      document.body.appendChild(button);
      button.addEventListener('click', () => {
        localStorage.setItem('afaghx_lang', isEnglish ? 'fa' : 'en');
        render();
      });
    }
    button.textContent = isEnglish ? 'FA' : 'EN';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();