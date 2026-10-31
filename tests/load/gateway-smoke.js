import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failedChecks = new Rate('afx_business_checks_failed');
const gatewayDuration = new Trend('afx_gateway_request_duration', true);
const domainWriteDuration = new Trend('afx_domain_write_duration', true);
const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:8787';
const runId = __ENV.K6_RUN_ID || 'local';

export const options = {
  stages: [
    { duration: '5s', target: 5 },
    { duration: '10s', target: 10 },
    { duration: '20s', target: 20 },
    { duration: '10s', target: 0 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750', 'p(99)<1500'],
    afx_business_checks_failed: ['rate<0.01'],
    afx_gateway_request_duration: ['p(95)<750'],
    afx_domain_write_duration: ['p(95)<1000']
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max']
};

function authHeaders(token) {
  return {
    headers: {
      authorization: 'Bearer ' + token,
      accept: 'application/json',
      'content-type': 'application/json'
    }
  };
}

export function setup() {
  const login = http.post(
    baseUrl + '/v1/auth/login',
    JSON.stringify({
      email: __ENV.K6_LOAD_TEST_EMAIL,
      password: __ENV.K6_LOAD_TEST_PASSWORD,
      tenantId: __ENV.K6_LOAD_TEST_TENANT
    }),
    { headers: { 'content-type': 'application/json', accept: 'application/json' }, tags: { route: 'auth-login' } }
  );

  const loggedIn = check(login, {
    'load test identity can login': response => response.status === 200,
    'login returns access token': response => Boolean(response.json('accessToken'))
  });
  if (!loggedIn) throw new Error('k6_setup_login_failed: HTTP ' + login.status);
  const token = login.json('accessToken');

  const seedKey = 'k6-seed-' + runId + '-product-001';
  const create = http.post(
    baseUrl + '/v1/domains/product',
    JSON.stringify({ name: 'k6 seed product ' + runId, slug: 'k6-seed-' + runId }),
    {
      ...authHeaders(token),
      headers: { ...authHeaders(token).headers, 'idempotency-key': seedKey },
      tags: { route: 'domain-product-create-seed' }
    }
  );
  if (!check(create, { 'seed Domain record created': response => response.status === 201 })) {
    throw new Error('k6_setup_seed_failed: HTTP ' + create.status);
  }
  const productId = create.json('id');

  const activate = http.post(
    baseUrl + '/v1/domains/product/' + productId + '/transition',
    JSON.stringify({ state: 'active' }),
    { ...authHeaders(token), tags: { route: 'domain-product-transition-seed' } }
  );
  if (!check(activate, { 'seed product activated': response => response.status === 200 })) {
    throw new Error('k6_setup_seed_activation_failed: HTTP ' + activate.status);
  }

  return { token, productId };
}

export default function (data) {
  const headers = authHeaders(data.token);
  const context = http.get(baseUrl + '/v1/auth/context', {
    headers: { authorization: headers.headers.authorization, accept: 'application/json' },
    tags: { service: 'afaghx-gateway', route: 'auth-context' }
  });
  const contextOk = check(context, {
    'Gateway returns verified tenant context': response =>
      response.status === 200 && response.json('tenantId') === __ENV.K6_LOAD_TEST_TENANT,
    'Gateway context has request id': response => Boolean(response.headers['X-Request-Id'])
  });
  failedChecks.add(!contextOk);
  gatewayDuration.add(context.timings.duration);

  const product = http.get(baseUrl + '/v1/products/' + data.productId, {
    headers: { authorization: headers.headers.authorization, accept: 'application/json' },
    tags: { service: 'afaghx-gateway', route: 'product-read' }
  });
  const productOk = check(product, {
    'Tenant-scoped product read returns HTTP 200': response => response.status === 200,
    'Product projection contains identifier': response => response.json('id') === data.productId
  });
  failedChecks.add(!productOk);
  gatewayDuration.add(product.timings.duration);

  const idempotencyKey = 'k6-' + runId + '-' + __VU + '-' + __ITER + '-create';
  const write = http.post(
    baseUrl + '/v1/domains/product',
    JSON.stringify({
      name: 'k6 product ' + __VU + '-' + __ITER,
      slug: 'k6-' + runId + '-' + __VU + '-' + __ITER
    }),
    {
      ...headers,
      headers: { ...headers.headers, 'idempotency-key': idempotencyKey },
      tags: { service: 'afaghx-gateway', route: 'domain-product-create' }
    }
  );
  const writeOk = check(write, {
    'Domain write commits HTTP 201': response => response.status === 201,
    'Domain write returns tenant-owned record': response =>
      response.json('data') && response.json('data').tenantId === __ENV.K6_LOAD_TEST_TENANT
  });
  failedChecks.add(!writeOk);
  domainWriteDuration.add(write.timings.duration);
  gatewayDuration.add(write.timings.duration);

  sleep(0.2);
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const duration = metrics.http_req_duration && metrics.http_req_duration.values || {};
  const rate = metrics.http_reqs && metrics.http_reqs.values || {};
  const failed = metrics.http_req_failed && metrics.http_req_failed.values || {};
  const writeDuration = metrics.afx_domain_write_duration && metrics.afx_domain_write_duration.values || {};
  const summary = [
    'AFAGHX k6 Gateway + PostgreSQL + Outbox Load Summary',
    'requests: ' + (rate.count || 0),
    'rate: ' + Number(rate.rate || 0).toFixed(2) + ' req/s',
    'p95: ' + Number(duration['p(95)'] || 0).toFixed(2) + ' ms',
    'p99: ' + Number(duration['p(99)'] || 0).toFixed(2) + ' ms',
    'domain-write-p95: ' + Number(writeDuration['p(95)'] || 0).toFixed(2) + ' ms',
    'failed: ' + Number(failed.rate || 0).toFixed(4)
  ].join('\n') + '\n';
  return {
    'artifacts/distributed-resilience/k6-summary.json': JSON.stringify(data, null, 2),
    stdout: summary
  };
}
