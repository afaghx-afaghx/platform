import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../public/', import.meta.url);
const html = await readFile(new URL('agent.html', root), 'utf8');
const js = await readFile(new URL('agent-ui.js', root), 'utf8');

test('AGENT-UI-01: canonical Agent surface exists', () => {
  assert.match(html, /AFX-AI-CEA-001/);
  assert.match(html, /id="run-agent"/);
  assert.match(html, /اجرای درخواست طلایی/);
  assert.match(html, /GOLDEN AGENT REQUEST/);
  assert.match(html, /id="golden-request"/);
  assert.match(html, /id="task-id"/);
  assert.match(html, /id="tool-id"/);
});

test('AGENT-UI-02: UI uses canonical API only', () => {
  assert.match(js, /const API_ORIGIN = ['"]https:\/\/api\.afaghx\.com['"]/);
  assert.match(js, /\/v1\/auth\/context/);
  assert.match(js, /\/v1\/agent\/executions/);
  assert.doesNotMatch(js, /https?:\/\/(?!api\.afaghx\.com)[^'"]+/);
});

test('AGENT-UI-03: Agent execution requires Auth, Tenant and permission', () => {
  assert.match(js, /agent\.execute/);
  assert.match(js, /runButton\.disabled = !allowed/);
  assert.match(js, /credentials: 'include'/);
  assert.match(js, /tenantId: context\.tenantId/);
});

test('AGENT-UI-04: credentials are not stored in browser storage', () => {
  assert.doesNotMatch(js, /localStorage/);
  assert.doesNotMatch(js, /sessionStorage/);
});

test('AGENT-UI-05: missing evidence never becomes PROVEN in the UI', () => {
  assert.match(js, /data\.truthState === 'PROVEN'/);
  assert.match(js, /data\.status === 'FAILED' \|\| data\.status === 'BLOCKED'/);
  assert.match(js, /UNKNOWN/);
  assert.match(html, /no fabricated/i);
});
