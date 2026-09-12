async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'request_failed'), { status: response.status });
  return data;
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
