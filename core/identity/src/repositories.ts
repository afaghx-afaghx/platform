import type { Identity, Session, UUID } from './contracts';
import type { RefreshTokenRecord, RefreshTokenStore, TransactionRunner, TransactionalSessionStore } from './runtime';

export interface IdentityStore {
  findBySubject(subject: string): Promise<Identity | null>;
}

export interface MembershipStore {
  resolve(subject: string, tenantId: UUID, organizationId: UUID): Promise<{
    membershipId: UUID;
    roles: string[];
    permissions: string[];
  } | null>;
}

export interface SessionRepository extends TransactionalSessionStore {
  get(id: UUID): Promise<Session | null>;
}

export interface RefreshTokenRepository extends RefreshTokenStore {
  create(record: RefreshTokenRecord): Promise<void>;
}

/** Application-facing repository bundle. Concrete SQL adapters remain outside CORE. */
export interface IdentityRepositories {
  identities: IdentityStore;
  memberships: MembershipStore;
  sessions: SessionRepository;
  refreshTokens: RefreshTokenRepository;
  transactions: TransactionRunner;
}
