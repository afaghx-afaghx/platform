async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'request_failed'), { status: response.status });
  return data;
}

const translations = {
  en: {
    'nav.ecosystem': 'Ecosystem',
    'nav.network': 'Network',
    'nav.how': 'How it works',
    'nav.signin': 'Sign in',
    'nav.join': 'Join AFAGHX',
    'hero.eyebrow': 'A GLOBAL DIGITAL ECOSYSTEM',
    'hero.title': 'Where business,<br><span>industry &amp; opportunity</span> connect.',
    'hero.lead': 'AFAGHX brings companies, producers, factories, suppliers, service providers, partners and buyers into one intelligent digital ecosystem.',
    'hero.explore': 'Explore the ecosystem',
    'hero.join': 'Join AFAGHX',
    'hero.note': 'Built for connected commerce, industry and global business.',
    'nodes.industry': 'Industry',
    'nodes.commerce': 'Commerce',
    'nodes.services': 'Services',
    'nodes.trade': 'Trade',
    'ecosystem.eyebrow': 'ONE ECOSYSTEM',
    'ecosystem.title': 'Everything connected.<br>Nothing isolated.',
    'ecosystem.lead': 'AFAGHX is designed as a network of capabilities, not a single marketplace. Each area can evolve independently while remaining part of one trusted ecosystem.',
    'cards.commerce.title': 'Products &amp; Commerce',
    'cards.commerce.text': 'Discover products, commercial opportunities and connected business activity.',
    'cards.organizations.title': 'Companies &amp; Organizations',
    'cards.organizations.text': 'Build meaningful connections between organizations, teams and markets.',
    'cards.industry.title': 'Industry &amp; Factories',
    'cards.industry.text': 'Connect production capacity, industrial capabilities and supply networks.',
    'cards.services.title': 'Services &amp; Suppliers',
    'cards.services.text': 'Bring expertise, sourcing and professional services into one network.',
    'cards.partners.title': 'Partners &amp; Business Network',
    'cards.partners.text': 'Create relationships that extend beyond a single transaction or channel.',
    'cards.trade.title': 'Trade &amp; Logistics',
    'cards.trade.text': 'Prepare the foundation for cross-border commerce and connected movement.',
    'flow.eyebrow': 'THE AFAGHX MODEL',
    'flow.title': 'Discover. Connect. Trade. Grow.',
    'flow.discover.title': 'Discover',
    'flow.discover.text': 'Find organizations, products, capabilities and opportunities across the ecosystem.',
    'flow.connect.title': 'Connect',
    'flow.connect.text': 'Build relationships with the right businesses, suppliers, partners and buyers.',
    'flow.trade.title': 'Trade',
    'flow.trade.text': 'Turn trusted relationships into structured commercial activity as capabilities mature.',
    'flow.grow.title': 'Grow',
    'flow.grow.text': 'Expand across markets, services, industry and international opportunities.',
    'network.eyebrow': 'THE NETWORK',
    'network.title': 'A platform built around relationships, not isolated transactions.',
    'network.business.title': 'Business',
    'network.business.text': 'Organizations &amp; buyers',
    'network.industry.title': 'Industry',
    'network.industry.text': 'Factories &amp; producers',
    'network.services.title': 'Services',
    'network.services.text': 'Experts &amp; suppliers',
    'network.trade.title': 'Trade',
    'network.trade.text': 'Partners &amp; markets',
    'join.eyebrow': 'THE NEXT CONNECTION STARTS HERE',
    'join.title': 'Build your place in the AFAGHX ecosystem.',
    'join.text': 'AFAGHX is being built as a long-term digital foundation for connected business, industry and global trade.',
    'join.cta': 'Enter AFAGHX',
    'footer.ecosystem': 'Ecosystem',
    'footer.network': 'Network',
    'footer.how': 'How it works',
    'footer.signin': 'Sign in',
    'footer.copy': '© AFAGHX. Intelligent Digital Ecosystem.'
  },
  fa: {
    'nav.ecosystem': 'اکوسیستم',
    'nav.network': 'شبکه',
    'nav.how': 'نحوه کار',
    'nav.signin': 'ورود',
    'nav.join': 'عضویت در AFAGHX',
    'hero.eyebrow': 'یک اکوسیستم دیجیتال جهانی',
    'hero.title': 'جایی که کسب‌وکار،<br><span>صنعت و فرصت</span> به هم متصل می‌شوند.',
    'hero.lead': 'AFAGHX شرکت‌ها، تولیدکنندگان، کارخانه‌ها، تأمین‌کنندگان، ارائه‌دهندگان خدمات، شرکا و خریداران را در یک اکوسیستم دیجیتال هوشمند به هم متصل می‌کند.',
    'hero.explore': 'کاوش در اکوسیستم',
    'hero.join': 'عضویت در AFAGHX',
    'hero.note': 'ساخته‌شده برای تجارت، صنعت و کسب‌وکار جهانیِ متصل.',
    'nodes.industry': 'صنعت',
    'nodes.commerce': 'تجارت',
    'nodes.services': 'خدمات',
    'nodes.trade': 'بازرگانی',
    'ecosystem.eyebrow': 'یک اکوسیستم',
    'ecosystem.title': 'همه‌چیز متصل است.<br>هیچ‌چیز جدا نیست.',
    'ecosystem.lead': 'AFAGHX یک شبکه از قابلیت‌هاست، نه صرفاً یک مارکت‌پلیس. هر بخش می‌تواند مستقل رشد کند و در عین حال عضو یک اکوسیستم یکپارچه و قابل اعتماد باقی بماند.',
    'cards.commerce.title': 'محصولات و تجارت',
    'cards.commerce.text': 'محصولات، فرصت‌های تجاری و فعالیت‌های متصل کسب‌وکار را کشف کنید.',
    'cards.organizations.title': 'شرکت‌ها و سازمان‌ها',
    'cards.organizations.text': 'ارتباطات معنادار میان سازمان‌ها، تیم‌ها و بازارها ایجاد کنید.',
    'cards.industry.title': 'صنعت و کارخانه‌ها',
    'cards.industry.text': 'ظرفیت تولید، توانمندی‌های صنعتی و شبکه‌های تأمین را به هم متصل کنید.',
    'cards.services.title': 'خدمات و تأمین‌کنندگان',
    'cards.services.text': 'تخصص، تأمین و خدمات حرفه‌ای را در یک شبکه یکپارچه گرد هم آورید.',
    'cards.partners.title': 'شرکا و شبکه کسب‌وکار',
    'cards.partners.text': 'روابطی بسازید که فراتر از یک معامله یا یک کانال واحد ادامه پیدا کند.',
    'cards.trade.title': 'تجارت و لجستیک',
    'cards.trade.text': 'زیرساخت تجارت فرامرزی و جابه‌جایی متصل را برای رشد آینده آماده کنید.',
    'flow.eyebrow': 'مدل AFAGHX',
    'flow.title': 'کشف کنید. متصل شوید. تجارت کنید. رشد کنید.',
    'flow.discover.title': 'کشف',
    'flow.discover.text': 'سازمان‌ها، محصولات، توانمندی‌ها و فرصت‌ها را در سراسر اکوسیستم پیدا کنید.',
    'flow.connect.title': 'اتصال',
    'flow.connect.text': 'با کسب‌وکارها، تأمین‌کنندگان، شرکا و خریداران مناسب ارتباط بسازید.',
    'flow.trade.title': 'تجارت',
    'flow.trade.text': 'روابط قابل اعتماد را با بلوغ قابلیت‌ها به فعالیت تجاری ساختاریافته تبدیل کنید.',
    'flow.grow.title': 'رشد',
    'flow.grow.text': 'در بازارها، خدمات، صنعت و فرصت‌های بین‌المللی توسعه پیدا کنید.',
    'network.eyebrow': 'شبکه',
    'network.title': 'پلتفرمی بر پایه رابطه‌ها، نه معاملات منفرد.',
    'network.business.title': 'کسب‌وکار',
    'network.business.text': 'سازمان‌ها و خریداران',
    'network.industry.title': 'صنعت',
    'network.industry.text': 'کارخانه‌ها و تولیدکنندگان',
    'network.services.title': 'خدمات',
    'network.services.text': 'متخصصان و تأمین‌کنندگان',
    'network.trade.title': 'تجارت',
    'network.trade.text': 'شرکا و بازارها',
    'join.eyebrow': 'ارتباط بعدی از اینجا شروع می‌شود',
    'join.title': 'جایگاه خود را در اکوسیستم AFAGHX بسازید.',
    'join.text': 'AFAGHX به‌عنوان یک زیرساخت دیجیتال بلندمدت برای کسب‌وکار، صنعت و تجارت جهانیِ متصل در حال ساخته‌شدن است.',
    'join.cta': 'ورود به AFAGHX',
    'footer.ecosystem': 'اکوسیستم',
    'footer.network': 'شبکه',
    'footer.how': 'نحوه کار',
    'footer.signin': 'ورود',
    'footer.copy': '© AFAGHX. اکوسیستم دیجیتال هوشمند.'
  }
};

function applyLanguage(lang) {
  const selected = translations[lang] ? lang : 'en';
  document.documentElement.lang = selected;
  document.documentElement.dir = selected === 'fa' ? 'rtl' : 'ltr';
  document.documentElement.dataset.lang = selected;

  document.querySelectorAll('[data-i18n]').forEach(element => {
    const value = translations[selected][element.dataset.i18n];
    if (value !== undefined) element.innerHTML = value;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(element => {
    const value = translations[selected][element.dataset.i18nHtml];
    if (value !== undefined) element.innerHTML = value;
  });

  document.title = selected === 'fa' ? 'AFAGHX — اکوسیستم دیجیتال هوشمند' : 'AFAGHX — Intelligent Digital Ecosystem';
  const toggle = document.querySelector('#language-toggle');
  if (toggle) {
    toggle.textContent = selected === 'fa' ? 'EN' : 'FA';
    toggle.setAttribute('aria-label', selected === 'fa' ? 'Switch to English' : 'تغییر زبان به فارسی');
    toggle.title = selected === 'fa' ? 'English' : 'فارسی';
  }
  localStorage.setItem('afaghx-language', selected);
}

if (document.body.classList.contains('homepage')) {
  const savedLanguage = localStorage.getItem('afaghx-language');
  applyLanguage(savedLanguage || 'en');
  document.querySelector('#language-toggle')?.addEventListener('click', () => {
    const next = document.documentElement.lang === 'fa' ? 'en' : 'fa';
    applyLanguage(next);
  });
}

const form = document.querySelector('#login-form');
if (form) {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const error = document.querySelector('#error');
    const submit = form.querySelector('button[type="submit"]');
    error.textContent = '';
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    const values = Object.fromEntries(new FormData(form));
    try {
      await request('/api/auth/login', { method: 'POST', body: JSON.stringify(values) });
      window.location.assign('/dashboard');
    } catch (e) {
      error.textContent = e.status === 401 ? 'ایمیل یا رمز عبور نادرست است.' : e.status === 429 ? 'تعداد تلاش‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.' : 'ورود انجام نشد.';
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
    }
  });
}

async function currentIdentity() {
  try { return await request('/api/auth/me'); }
  catch (error) {
    if (error.status !== 401) throw error;
    await request('/api/auth/refresh', { method: 'POST' });
    return request('/api/auth/me');
  }
}

const identity = document.querySelector('#identity');
if (identity) {
  currentIdentity().then(data => {
    identity.textContent = `کاربر ${data.userId}`;
    const tenant = document.querySelector('#tenant-context');
    if (tenant) tenant.textContent = data.tenantId || 'بدون context';
  }).catch(() => window.location.assign('/'));
}

document.querySelector('#logout')?.addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  await request('/api/auth/logout', { method: 'POST' }).catch(() => {});
  window.location.assign('/');
});
