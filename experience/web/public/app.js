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
    error.textContent = '';
    const values = Object.fromEntries(new FormData(form));
    try {
      await request('/api/auth/login', { method: 'POST', body: JSON.stringify(values) });
      window.location.assign('/dashboard');
    } catch (e) {
      error.textContent = e.status === 401 ? 'ایمیل یا رمز عبور نادرست است.' : 'ورود انجام نشد.';
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
    identity.textContent = `کاربر: ${data.userId} | سازمان/tenant: ${data.tenantId} | نقش‌ها: ${data.roles.join(', ') || 'بدون نقش'}`;
  }).catch(() => window.location.assign('/'));
}

document.querySelector('#logout')?.addEventListener('click', async () => {
  await request('/api/auth/logout', { method: 'POST' }).catch(() => {});
  window.location.assign('/');
});
