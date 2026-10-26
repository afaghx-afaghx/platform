export interface MockRequest<TBody = unknown> {
  method: string;
  path: string;
  headers: Readonly<Record<string, string>>;
  body: TBody;
}

export interface MockResponse<TBody = unknown> {
  status: number;
  headers: Readonly<Record<string, string>>;
  body: TBody;
}

export function mockRequest<TBody>(
  request: MockRequest<TBody>,
): MockRequest<TBody> {
  return {
    ...request,
    headers: { ...request.headers },
  };
}

export function mockResponse<TBody>(
  response: MockResponse<TBody>,
): MockResponse<TBody> {
  return {
    ...response,
    headers: { ...response.headers },
  };
}

export function mockJsonResponse<TBody>(
  body: TBody,
  status = 200,
): MockResponse<TBody> {
  return {
    status,
    headers: { "content-type": "application/json" },
    body,
  };
}
