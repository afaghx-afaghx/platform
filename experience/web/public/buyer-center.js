const API_ORIGIN = 'https://api.afaghx.com';
const byId = (id) => document.getElementById(id);

function setConnection(state, title, description, pillText) {
  const pill = byId('connection-pill');
  if (!pill) return;
  pill.dataset.state = state;
  const label = pill.querySelector('b');
  if (label) label.textContent = pillText;
  byId('connection-title').textContent = title;
  byId('connection-description').textContent = description;
  byId('footer-state').textContent = state === 'ok'
    ? 'هویت تأیید شد؛ داده‌های خرید هنوز نیازمند قرارداد API هستند'
    : state === 'blocked'
      ? 'دسترسی نیازمند احراز هویت یا مجوز معتبر است'
      : 'داده عملیاتی: هنوز اثبات نشده';
}

async function loadBuyerContext() {
  try {
    const response = await fetch(API_ORIGIN + '/v1/auth/context', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error'
    });
    if (response.status === 401) {
      byId('identity-status').textContent = 'ورود لازم است';
      byId('user-role').textContent = 'نیازمند احراز هویت';
      setConnection('blocked', 'برای مشاهده اطلاعات سازمانی وارد شوید', 'API رسمی دسترسی احرازنشده را برگرداند. اطلاعات سفارش، پیشنهاد و اسناد تا احراز هویت نمایش داده نمی‌شود.', 'ورود لازم است');
      return;
    }
    if (response.status === 403) {
      byId('identity-status').textContent = 'دسترسی مجاز نیست';
      byId('user-role').textContent = 'مجوز لازم در دسترس نیست';
      setConnection('blocked', 'دسترسی مرکز خریداران تأیید نشد', 'هویت ممکن است معتبر باشد، اما مجوز لازم از پاسخ API اثبات نشده است. دسترسی به‌صورت پیش‌فرض بسته باقی می‌ماند.', 'دسترسی محدود');
      return;
    }
    if (!response.ok) throw new Error('context_unavailable');
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) throw new Error('unexpected_content_type');
    const context = await response.json();
    const user = context.user && typeof context.user === 'object' ? context.user : {};
    const organization = context.organization && typeof context.organization === 'object' ? context.organization : {};
    const safeText = (value) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 100) : '';
    const userName = safeText(context.displayName) || safeText(context.name) || safeText(user.displayName) || safeText(user.name);
    const orgName = safeText(organization.name) || safeText(context.organizationName);
    if (userName) byId('user-name').textContent = userName;
    if (orgName) byId('org-name').textContent = orgName;
    byId('identity-status').textContent = 'زمینه هویت دریافت شد';
    byId('user-role').textContent = 'هویت از API رسمی دریافت شد';
    setConnection('ok', 'هویت از API رسمی دریافت شد', 'دسترسی پایه پاسخ داده شده است؛ داده‌های خرید فقط پس از تأیید قرارداد اختصاصی و مجوزهای مربوط نمایش داده می‌شوند.', 'هویت دریافت شد');
  } catch {
    byId('identity-status').textContent = 'وضعیت قابل تأیید نیست';
    byId('user-role').textContent = 'اتصال API تأیید نشد';
    setConnection('blocked', 'اتصال یا پاسخ API قابل تأیید نیست', 'هیچ اطلاعات تجاری از روی خطا حدس زده نمی‌شود. اتصال، CORS و وضعیت API باید در محیط واقعی بررسی شوند.', 'نامشخص');
  }
}

const searchForm = byId('buyer-search');
searchForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = byId('search-query');
  const query = input?.value.trim();
  if (!query) {
    input?.focus();
    return;
  }
  window.location.href = './baskets.html?q=' + encodeURIComponent(query);
});

const menuToggle = byId('menu-toggle');
const sidebar = byId('sidebar');
const scrim = byId('mobile-scrim');
function closeMenu() {
  sidebar?.classList.remove('is-open');
  scrim?.setAttribute('hidden', '');
  menuToggle?.setAttribute('aria-expanded', 'false');
}
menuToggle?.addEventListener('click', () => {
  const open = !sidebar?.classList.contains('is-open');
  sidebar?.classList.toggle('is-open', open);
  if (open) scrim?.removeAttribute('hidden');
  else scrim?.setAttribute('hidden', '');
  menuToggle.setAttribute('aria-expanded', String(open));
});
scrim?.addEventListener('click', closeMenu);
sidebar?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

loadBuyerContext();
