const DEFAULT_API_BASE_URL = 'https://api.afaghx.com';
const DEFAULT_API_VERSION = 'v1';

export class ApiError extends Error {
  constructor(message, { status, body = null, url }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(details) {
    super('AFAGHX Core rejected authentication.', details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(details) {
    super('AFAGHX Core denied the requested resource.', details);
    this.name = 'ForbiddenError';
  }
}

const normalizeBaseUrl = (value) => String(value || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

export function createApiClient({
  baseUrl = DEFAULT_API_BASE_URL,
  apiVersion = DEFAULT_API_VERSION,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl is required');

  const root = `${normalizeBaseUrl(baseUrl)}/${String(apiVersion).replace(/^\/+|\/+$/g, '')}`;

  async function request(path, { accessToken, method = 'GET', body, headers = {} } = {}) {
    const url = `${root}/${String(path).replace(/^\/+/, '')}`;
    const requestHeaders = { Accept: 'application/json', ...headers };
    if (accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`;

    const response = await fetchImpl(url, {
      method,
      headers: requestHeaders,
      credentials: 'omit',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    let payload = null;
    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType.includes('application/json')) payload = await response.json();

    if (response.status === 401) throw new UnauthorizedError({ status: 401, body: payload, url });
    if (response.status === 403) throw new ForbiddenError({ status: 403, body: payload, url });
    if (!response.ok) throw new ApiError(`AFAGHX API request failed with HTTP ${response.status}.`, { status: response.status, body: payload, url });

    return payload;
  }

  return {
    request,
    getAuthContext: (accessToken) => request('/auth/context', { accessToken }),
  };
}

export const afaghxApi = createApiClient({
  baseUrl: globalThis.AFAGHX_CONFIG?.apiBaseUrl || DEFAULT_API_BASE_URL,
  apiVersion: globalThis.AFAGHX_CONFIG?.apiVersion || DEFAULT_API_VERSION,
});
