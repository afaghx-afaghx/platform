const API_ORIGIN = 'https://api.afaghx.com';
const REQUIRED_PERMISSION = 'agent.execute';
const STATE_LABELS = Object.freeze({ RUNNABLE: 'قابل اجرا', RUNNING: 'در حال اجرا', PROVEN: 'اثبات‌شده', BLOCKED: 'متوقف‌شده', FAIL: 'ناموفق', UNKNOWN: 'نامشخص' });

const byId = id => document.getElementById(id);
const stages = [...document.querySelectorAll('[data-stage]')];
const stateEl = byId('overall-state');
const logEl = byId('execution-log');
const runButton = byId('run-agent');

let context = null;
let pollTimer = null;

function setStage(name, state) {
  const node = document.querySelector('[data-stage="'+name+'"]');
  if (!node) return;
  node.classList.remove('ok','running','blocked','fail');
  if (state) node.classList.add(state);
}

function setOverall(state) {
  stateEl.className = 'state ' + (state === 'PROVEN' ? 'ok' : state.toLowerCase());
  stateEl.textContent = STATE_LABELS[state] || 'نامشخص';
}

function writeLog(message, data) {
  const suffix = data ? '\n' + JSON.stringify(data, null, 2) : '';
  logEl.textContent = message + suffix;
}

async function api(path, options = {}) {
  const response = await fetch(API_ORIGIN + path, {
    ...options,
    credentials: 'include',
    headers: {'Accept':'application/json','Content-Type':'application/json',...(options.headers || {})}
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || 'request_failed');
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function loadContext() {
  setStage('auth','running');
  try {
    const data = await api('/v1/auth/context');
    context = data;
    setStage('auth','ok');
    setStage('tenant','ok');
    byId('identity-state').textContent = data.userId || data.user?.id || 'احراز شد';
    byId('tenant-state').textContent = data.tenantId || data.tenant?.id || 'موجود';
    const permissions = data.permissions || data.permission || [];
    const allowed = Array.isArray(permissions) ? permissions.includes(REQUIRED_PERMISSION) : permissions === REQUIRED_PERMISSION;
    byId('permission-state').textContent = allowed ? 'مجاز' : 'نیازمند مجوز';
    runButton.disabled = !allowed;
    if (!allowed) {
      setStage('tool','blocked');
      setOverall('BLOCKED');
      writeLog('هویت و Tenant معتبر است، اما مجوز agent.execute در context جاری قابل اثبات نیست.');
      return;
    }
    setOverall('RUNNABLE');
    writeLog('احراز هویت و زمینه سازمانی از API رسمی تأیید شد. اجرای کنترل‌شده آماده است.');
  } catch (error) {
    setStage('auth', error.status === 403 ? 'blocked' : 'fail');
    setStage('tenant', 'blocked');
    setStage('tool', 'blocked');
    runButton.disabled = true;
    setOverall(error.status === 401 ? 'BLOCKED' : 'FAIL');
    byId('identity-state').textContent = error.status === 401 ? 'نیازمند ورود' : 'خطا';
    byId('tenant-state').textContent = 'قابل اثبات نیست';
    byId('permission-state').textContent = 'قابل اثبات نیست';
    writeLog('رابط هوش مصنوعی مهندسی عمداً متوقف شد؛ بدون احراز هویت و زمینه معتبر هیچ اجرای ابزاری مجاز نیست.', error.body || {status:error.status});
  }
}

async function runAgent() {
  if (!context) return;
  runButton.disabled = true;
  setOverall('RUNNING');
  ['tool','postgresql','evidence','audit','gate','branch','pr'].forEach(x => setStage(x, null));
  setStage('tool','running');
  const taskId = byId('task-id').value.trim();
  const tool = byId('tool-id').value;
  try {
    const created = await api('/v1/agent/executions', {
      method:'POST',
      body: JSON.stringify({
        taskId,
        tool,
        tenantId: context.tenantId || context.tenant?.id,
        mode: 'golden-execution'
      })
    });
    const executionId = created.executionId || created.id;
    byId('request-state').textContent = executionId || 'ثبت شد';
    byId('execution-title').textContent = 'اجرای کنترل‌شده در جریان است.';
    writeLog('درخواست ابزار توسط API رسمی پذیرفته شد.', created);
    await refreshExecution(executionId);
  } catch (error) {
    setStage('tool', error.status === 403 ? 'blocked' : 'fail');
    setOverall(error.status === 403 ? 'BLOCKED' : 'FAIL');
    writeLog('اجرای ابزار رد شد یا در دسترس نیست. هیچ شواهد ساختگی پذیرفته نشد.', error.body || {status:error.status});
    runButton.disabled = false;
  }
}

async function refreshExecution(executionId) {
  if (!executionId) return;
  try {
    const data = await api('/v1/agent/executions/' + encodeURIComponent(executionId));
    byId('request-state').textContent = executionId;
    const stagesData = data.stages || {};
    for (const [name, value] of Object.entries(stagesData)) {
      const normalized = value === 'success' || value === 'ok' || value === 'PROVEN' ? 'ok'
        : value === 'running' || value === 'pending' ? 'running'
        : value === 'blocked' ? 'blocked' : value === 'failed' ? 'fail' : null;
      setStage(name, normalized);
    }
    if (data.truthState === 'PROVEN' || data.status === 'PROVEN') {
      setOverall('PROVEN');
      byId('execution-title').textContent = 'زنجیره کامل با شواهد معتبر اثبات شد.';
      writeLog('احراز هویت → زمینه سازمانی → ابزار → PostgreSQL → شواهد → ممیزی → دروازه کنترل → شاخه ایزوله → درخواست بازبینی', data);
      runButton.disabled = false;
      return;
    }
    if (data.status === 'FAILED' || data.status === 'BLOCKED') {
      setOverall(data.status);
      writeLog('اجرای Agent متوقف شد و وضعیت سبز ثبت نشد.', data);
      runButton.disabled = false;
      return;
    }
    setOverall('RUNNING');
    writeLog('اجرای هوش مصنوعی مهندسی در حال پیشروی است.', data);
    pollTimer = setTimeout(() => refreshExecution(executionId), 1800);
  } catch (error) {
    setOverall(error.status === 404 ? 'UNKNOWN' : 'FAIL');
    writeLog('وضعیت اجرای هوش مصنوعی مهندسی قابل بازیابی نیست؛ وضعیت نامشخص باقی می‌ماند.', error.body || {status:error.status});
    runButton.disabled = false;
  }
}

runButton.addEventListener('click', runAgent);
loadContext();
