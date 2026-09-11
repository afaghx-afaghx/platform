import http from 'node:http';

const json = (response, status, body) => {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
  });
  response.end(payload);
};

const bearerToken = (request) => {
  const value = request.headers.authorization;
  if (typeof value !== 'string') return null;
  const match = /^Bearer ([^\s]+)$/.exec(value);
  return match?.[1] ?? null;
};

export function createAuthApi({ core }) {
  if (!core || typeof core.authenticateAccessToken !== 'function') {
    throw new TypeError('core.authenticateAccessToken is required');
  }

  return http.createServer(async (request, response) => {
    if (request.method !== 'GET' || request.url !== '/v1/auth/context') {
      json(response, 404, { error: 'not_found' });
      return;
    }

    const token = bearerToken(request);
    if (!token) {
      json(response, 401, { error: 'unauthorized' });
      return;
    }

    try {
      const context = await core.authenticateAccessToken(token);
      json(response, 200, { context });
    } catch {
      json(response, 401, { error: 'unauthorized' });
    }
  });
}
