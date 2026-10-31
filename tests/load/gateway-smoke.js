import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const failedHealthChecks = new Rate('afx_health_check_failures');
const gatewayDuration = new Trend('afx_gateway_health_duration', true);
const baseUrl = __ENV.BASE_URL || 'http://127.0.0.1:8787';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 30 },
    { duration: '10s', target: 0 }
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750', 'p(99)<1500'],
    afx_health_check_failures: ['rate<0.01'],
    afx_gateway_health_duration: ['p(95)<750']
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max']
};

export default function () {
  const response = http.get(baseUrl + '/v1/health/core', {
    headers: { accept: 'application/json' },
    tags: { service: 'afaghx-gateway', route: 'health' }
  });
  const valid = check(response, {
    'Gateway health is HTTP 200': result => result.status === 200,
    'Gateway returns request id': result => Boolean(result.headers['X-Request-Id']),
    'Gateway reports canonical runtime': result => {
      try { return JSON.parse(result.body).runtime === 'Gateway -> PersistentAfxCore -> PostgreSQL'; }
      catch { return false; }
    }
  });
  failedHealthChecks.add(!valid);
  gatewayDuration.add(response.timings.duration);
  sleep(0.1);
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const duration = metrics.http_req_duration && metrics.http_req_duration.values || {};
  const rate = metrics.http_reqs && metrics.http_reqs.values || {};
  const failed = metrics.http_req_failed && metrics.http_req_failed.values || {};
  const summary = [
    'AFAGHX k6 Gateway Load Summary',
    'requests: ' + (rate.count || 0),
    'rate: ' + Number(rate.rate || 0).toFixed(2) + ' req/s',
    'p95: ' + Number(duration['p(95)'] || 0).toFixed(2) + ' ms',
    'p99: ' + Number(duration['p(99)'] || 0).toFixed(2) + ' ms',
    'failed: ' + Number(failed.rate || 0).toFixed(4)
  ].join('\n') + '\n';
  return {
    'artifacts/distributed-resilience/k6-summary.json': JSON.stringify(data, null, 2),
    stdout: summary
  };
}
