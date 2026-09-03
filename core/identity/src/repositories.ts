import type { Identity, Session, UUID } from './contracts';
import type { RefreshTokenRecord, RefreshTokenStore, TransactionRunner } from './runtime';

export interface IdentityStore {
  findBySubject(subject: string): Promise<Identity | null>;
}

export interface MembershipStore {
  resolve(subject: string, tenantId: UUID, organizationId: UUID): Promise<{ membershipId: UUID; roles: string[]; permissions: string[] } | null>;
}

export interface SessionRepository {
  getForUpdate(id: UUID): Promise<Session | null>;
  revoke(id: UUID, reason: string): Promise<void>;
}

export interface RefreshTokenRepository extends RefreshTokenStore {
  create(record: RefreshTokenRecord): Promise<void>;
}

/** Application-facing repository bundle. Concrete SQL/ORM adapters belong outside CORE contracts. */
export interface IdentityRepositories {
  identities: IdentityStore;
  memberships: MembershipStore;
  sessions: SessionRepository;
  refreshTokens: RefreshTokenRepository;
  transactions: TransactionRunner;
}
