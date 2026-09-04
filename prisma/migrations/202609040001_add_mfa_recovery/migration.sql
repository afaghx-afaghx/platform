-- AFX-CORE Trust Foundation: MFA + recovery state.
-- Private MFA material is application-encrypted before persistence; this schema stores ciphertext only.

CREATE TYPE "MfaFactorStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');
CREATE TYPE "RecoveryTokenStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED');

CREATE TABLE "MfaFactor" (
  "id" UUID NOT NULL,
  "identityId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "secretCiphertext" TEXT NOT NULL,
  "status" "MfaFactorStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "MfaFactor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MfaFactor_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RecoveryToken" (
  "id" UUID NOT NULL,
  "identityId" UUID NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "status" "RecoveryTokenStatus" NOT NULL DEFAULT 'ACTIVE',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "RecoveryToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RecoveryToken_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RecoveryToken_tokenHash_key" ON "RecoveryToken"("tokenHash");
CREATE INDEX "MfaFactor_identityId_status_idx" ON "MfaFactor"("identityId", "status");
CREATE INDEX "RecoveryToken_identityId_status_idx" ON "RecoveryToken"("identityId", "status");
