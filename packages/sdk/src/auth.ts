import type { AuthContextResponse } from "@afaghx/contracts";
import type { AfxClient } from "./client.js";

export class AuthApi {
  constructor(private readonly client: AfxClient) {}

  getContext(): Promise<AuthContextResponse> {
    return this.client.request<AuthContextResponse>("/v1/auth/context");
  }
}
