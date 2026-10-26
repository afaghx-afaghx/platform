import type { ApiResponse } from "@afaghx/contracts";

export interface AfxClientOptions {
  readonly baseUrl: string;
  readonly fetch?: typeof globalThis.fetch;
}

export class AfxApiError extends Error {
  readonly code: string;
  readonly requestId: string;

  constructor(code: string, message: string, requestId: string) {
    super(message);
    this.name = "AfxApiError";
    this.code = code;
    this.requestId = requestId;
  }
}

export class AfxClient {
  readonly baseUrl: string;
  private readonly transport: typeof globalThis.fetch;

  constructor(options: AfxClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.transport = options.fetch ?? globalThis.fetch;
  }

  async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const response = await this.transport(
      `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`,
      {
        ...init,
        credentials: init?.credentials ?? "include",
        headers: {
          Accept: "application/json",
          ...init?.headers,
        },
      },
    );

    const payload = (await response.json()) as ApiResponse<T>;
    if (!response.ok || !payload.ok) {
      if (payload.ok) {
        throw new Error(`AFAGHX API returned HTTP ${response.status}`);
      }
      throw new AfxApiError(
        payload.error.code,
        payload.error.message,
        payload.error.requestId,
      );
    }

    return payload.data;
  }
}
