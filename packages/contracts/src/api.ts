import type {
  Membership,
  Organization,
  Permission,
  Role,
  SecurityContext,
  TenantContext,
  User,
} from "./identity.js";

export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly requestId: string;
}

export interface ApiSuccess<T> {
  readonly ok: true;
  readonly data: T;
  readonly requestId: string;
}

export interface ApiFailure {
  readonly ok: false;
  readonly error: ApiError;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PaginationRequest {
  readonly page?: number;
  readonly pageSize?: number;
}

export interface PageMeta {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly hasNext: boolean;
}

export interface Paginated<T> {
  readonly items: readonly T[];
  readonly meta: PageMeta;
}

export interface GetUserResponse {
  readonly user: User;
}

export interface GetOrganizationResponse {
  readonly organization: Organization;
}

export interface GetMembershipResponse {
  readonly membership: Membership;
}

export interface ListRolesResponse {
  readonly roles: readonly Role[];
}

export interface ListPermissionsResponse {
  readonly permissions: readonly Permission[];
}

export interface AuthContextResponse {
  readonly authenticated: boolean;
  readonly securityContext: SecurityContext;
}

export interface ResolveTenantContextRequest {
  readonly tenantId: string;
  readonly organizationId?: string;
}

export interface ResolveTenantContextResponse {
  readonly context: TenantContext;
}

export interface CreateUserRequest {
  readonly email: string;
}

export interface CreateMembershipRequest {
  readonly userId: string;
  readonly organizationId: string;
  readonly tenantId: string;
  readonly roleIds: readonly string[];
}
