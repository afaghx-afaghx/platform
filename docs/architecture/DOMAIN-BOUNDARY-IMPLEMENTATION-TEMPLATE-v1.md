# AFAGHX Domain Boundary Implementation Template v1

Every business capability must be introduced as a bounded context using this minimum contract.

## 1. Mission
Define the business capability and the customer/business outcome it owns.

## 2. Ownership
Declare owning team, data owner, API owner, event owner and operational owner.

## 3. Boundary
List responsibilities and explicit non-responsibilities. A domain may not own identity, authentication, tenant authority or platform-wide authorization.

## 4. Data
Declare aggregates, authoritative tables, transaction boundaries, read models, cache policy, classification and retention. Cross-domain direct database access is prohibited.

## 5. Commands and queries
Every write is an explicit command with validation, authorization and idempotency semantics. Queries are optimized read contracts and must not become hidden write paths.

## 6. Events
Publish only versioned integration events through the platform outbox. Events contain correlation/causation identifiers and never contain credentials or secrets.

## 7. Security
Every protected operation resolves AFX-CORE Security Context and obtains an explicit authorization decision. Tenant scope is mandatory where the resource is tenant-owned.

## 8. Failure model
Declare retry behavior, consistency guarantees, duplicate handling, timeout behavior, dead-letter behavior and recovery procedure.

## 9. Experience contract
Expose UI/mobile/partner requirements through stable application contracts; domain internals never leak into Experience implementations.

## 10. Completion evidence
A domain is production-ready only when unit, integration, contract and security/tenant-isolation tests exist and CI provides evidence for them.
