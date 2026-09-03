# AFAGHX Bounded Context Model

This document defines ownership boundaries before business domains are implemented.

## Core contexts

| Context | Owns | Must not own |
|---|---|---|
| Identity | canonical person/service identity | business profiles |
| Authentication | credentials, sessions, authentication factors | domain permissions |
| Authorization | permissions and authorization decisions | business resource state |
| Organizations | organizations and tenant roots | domain records |
| Memberships | subject-to-organization relationships | business roles outside authorization contracts |
| Tenant Context | trusted request tenant context | arbitrary domain tenancy rules |
| RBAC | roles and permission assignments | resource business invariants |
| Policy | contextual authorization policies | authentication credentials |
| Audit | security and compliance audit records | operational application logs |
| Consent | consent records and lifecycle | authentication state |
| Trust | trust signals and verification state | domain business decisions |
| Configuration | governed configuration | secrets |
| Feature Flags | rollout state | business authorization |
| Module Registry | installed/enabled module metadata | module business data |

## Platform contexts

Messaging, Notifications, Search, Files, Workflow, Billing, Observability, and Integration are platform capabilities. They provide reusable primitives and must not become a dumping ground for domain-specific rules.

## Domain contexts

Business domains are introduced incrementally. Each domain receives an explicit owner and a documented boundary. A domain owns its commands, invariants, write model, and domain events.

## Intelligence contexts

AI, Analytics, Recommendations, and Automation operate through governed APIs, events, projections, and data products. They are not an alternative authorization path.

## Boundary test

Before adding a module, answer:

1. What business capability does it own?
2. What data does it own?
3. Which invariants does it enforce?
4. Which tenant scope applies?
5. Which permissions protect it?
6. Which APIs does it expose?
7. Which events does it publish/consume?
8. Who owns it operationally?
9. What failure isolation does it need?
10. What is the migration and rollback strategy?

If these answers are unclear, the boundary is not ready for implementation.
