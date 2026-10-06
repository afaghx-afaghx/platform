# AFX-DOMAIN-MAP-001 — AFAGHX Domain Map & Bounded Context Inventory

- **System:** AFAGHX — AFA GLOBAL HORIZON X
- **Document ID:** AFX-DOMAIN-MAP-001
- **Version:** 1.0.0-draft
- **Status:** DRAFT — Architecture Review Required
- **Authority:** AFAGHX Architecture Governance
- **Parent Architecture:** AFX-MASTER-ARCH-001 v1.0.0
- **Scope:** AFX-DOMAIN

## 1. Purpose

This document is the authoritative candidate inventory for AFAGHX business domains and their initial bounded-context boundaries. It is the mother reference for G05.2 and later Phase 05 gates.

G05.2 MUST NOT introduce a bounded context that is not represented and approved in this Domain Map. Any addition, removal, merge, split, or ownership change requires an architecture-controlled change and ADR.

This document does not make G05.1 GREEN by itself. Approval, ownership verification, executable dependency enforcement, and evidence remain mandatory.

## 2. Architectural Rules

1. AFX-CORE, AFX-PLATFORM, AFX-INTELLIGENCE, and AFX-EXPERIENCE are architectural layers/platform capabilities, not business bounded contexts in this map.
2. Each business entity has exactly one authoritative owner context.
3. Each bounded context owns its persistence model and database writes.
4. Direct cross-context database access is forbidden.
5. Cross-context interaction is permitted only through explicit application/API contracts, versioned contracts, events, or governed read models/data products.
6. Shared Kernel is limited to stable, domain-neutral primitives and must not become a business-domain dumping ground.
7. Every context enforces tenant context and authorization through AFX-CORE; contexts MUST NOT create parallel identity, membership, RBAC, or authorization systems.
8. Caller-supplied tenant, organization, role, or permission claims MUST NOT be trusted without authoritative AFX-CORE validation.
9. Sensitive operations require governed audit through the platform/core audit capability.
10. Architecture-controlled boundary or ownership changes require an ADR.

## 3. Domain Inventory

### 3.1 Product

**Purpose:** Authoritative product/catalog definition and product lifecycle.

**Boundary:** Product identity, variants, attributes, categories, media references, and catalog representation. Commercial pricing, orders, payment, and fulfillment state are outside this context.

**Owned Entities:** Product, ProductVariant, ProductAttribute, Category, ProductMedia, CatalogEntry.

**Commands:** CreateProduct, UpdateProduct, PublishProduct, ArchiveProduct.

**Queries:** GetProduct, SearchProducts, GetProductVariants, GetCatalogEntry.

**Events:** ProductCreated, ProductUpdated, ProductPublished, ProductArchived.

**Dependencies:** AFX-CORE identity/tenant/policy; AFX-PLATFORM storage and search contracts.

**Forbidden Dependencies:** Direct ownership or mutation of price, order, payment, shipment, or inventory state; direct cross-context database access.

### 3.2 Commerce

**Purpose:** Commercial presentation, offers, carts, sales channels, and checkout orchestration.

**Boundary:** Listing and offer lifecycle, cart state, commercial price representation, and checkout initiation. Product master data, order lifecycle, and payment ledger remain owned elsewhere.

**Owned Entities:** Listing, Offer, Cart, CartItem, CommercialPrice, SalesChannel.

**Commands:** CreateListing, PublishOffer, AddCartItem, UpdateCart, Checkout.

**Queries:** GetListing, GetOffer, GetCart, GetCommercialPrice, GetSalesChannel.

**Events:** ListingPublished, OfferChanged, CartCheckedOut.

**Dependencies:** Product, Order, Payment contracts; AFX-CORE authorization/tenant context.

**Forbidden Dependencies:** Direct Product mutation; direct Payment transaction mutation; direct Order lifecycle mutation; cross-context DB writes.

### 3.3 Supplier

**Purpose:** Supplier identity within the business network, capabilities, qualification, and supply profile.

**Boundary:** Supplier business profile and supply capability. It does not own global identity, product master, order, payment, or banking credentials.

**Owned Entities:** SupplierProfile, SupplyCapability, SupplyAgreement, SupplierQualification.

**Commands:** RegisterSupplier, UpdateCapability, SubmitQualification, SuspendSupplier.

**Queries:** GetSupplierProfile, FindSuppliersByCapability, GetSupplierQualification.

**Events:** SupplierRegistered, SupplierCapabilityChanged, SupplierQualified, SupplierSuspended.

**Dependencies:** AFX-CORE organization/identity; Certification; Procurement; Partner.

**Forbidden Dependencies:** Product ownership; Order ownership; Payment ownership; raw bank/payment data; direct Identity/Membership mutation.

### 3.4 Factory

**Purpose:** Factory and production capability representation, capacity, and qualification.

**Boundary:** Factory profile, production capabilities, production lines, capacity slots, and factory qualification.

**Owned Entities:** FactoryProfile, ProductionCapability, ProductionLine, CapacitySlot, FactoryQualification.

**Commands:** RegisterFactory, DeclareCapability, UpdateCapacity, SubmitFactoryQualification.

**Queries:** GetFactoryProfile, FindFactoriesByCapability, GetCapacity, GetFactoryQualification.

**Events:** FactoryRegistered, CapabilityChanged, CapacityUpdated, FactoryQualified.

**Dependencies:** AFX-CORE organization/identity; Certification; Procurement; Trade.

**Forbidden Dependencies:** Order lifecycle; Payment ledger; shipment state; accounting inventory; direct Organization identity ownership.

### 3.5 Service

**Purpose:** Definition and commercial availability of services and service-provider capacity.

**Boundary:** Service definitions, offerings, provider profiles, slots, and service areas. Order financial state and payment remain outside.

**Owned Entities:** ServiceDefinition, ServiceOffering, ServiceProviderProfile, ServiceSlot, ServiceArea.

**Commands:** CreateService, PublishService, ReserveServiceSlot, UpdateServiceCapacity.

**Queries:** GetService, SearchServices, GetServiceProvider, GetAvailableSlots.

**Events:** ServicePublished, ServiceSlotReserved, ServiceCapacityChanged.

**Dependencies:** AFX-CORE organization/tenant/policy; Commerce; Order; Certification.

**Forbidden Dependencies:** Payment ownership; Order financial-state mutation; Logistics ownership; Product catalog ownership.

### 3.6 Order

**Purpose:** Authoritative commercial order lifecycle and order participant/state representation.

**Boundary:** Order aggregate, lines, lifecycle state, participants, and immutable address/reference snapshots.

**Owned Entities:** Order, OrderLine, OrderStatus, OrderParticipant, OrderAddressSnapshot.

**Commands:** CreateOrder, ConfirmOrder, CancelOrder, CompleteOrder.

**Queries:** GetOrder, GetOrderStatus, GetOrderLines, GetOrderParticipants.

**Events:** OrderCreated, OrderConfirmed, OrderCancelled, OrderCompleted.

**Dependencies:** Commerce; Product snapshot/reference contract; Payment; Logistics; AFX-CORE.

**Forbidden Dependencies:** Direct Cart mutation; Product master mutation; Payment ledger ownership; Logistics state mutation; cross-context DB writes.

### 3.7 Procurement

**Purpose:** Structured sourcing and procurement request lifecycle.

**Boundary:** Procurement requirements, supplier bids, evaluation, and award decision. Supplier master data, contracts, and payment remain owned elsewhere.

**Owned Entities:** ProcurementRequest, Requirement, SupplierBid, Evaluation, AwardDecision.

**Commands:** CreateProcurementRequest, InviteSupplier, SubmitBid, AwardProcurement.

**Queries:** GetProcurementRequest, ListBids, GetEvaluation, GetAwardDecision.

**Events:** ProcurementRequested, BidSubmitted, ProcurementAwarded.

**Dependencies:** Supplier; Product; Factory; Tender; Contract; Order; AFX-CORE.

**Forbidden Dependencies:** Direct Supplier profile mutation; Contract registration; Payment transaction mutation; cross-context DB access.

### 3.8 Logistics

**Purpose:** Shipment execution, carrier assignment, routing, tracking, and delivery proof.

**Boundary:** Physical fulfillment and shipment lifecycle. Order, payment, and contract state remain external dependencies.

**Owned Entities:** Shipment, ShipmentItem, Carrier, Route, TrackingEvent, DeliveryProof.

**Commands:** CreateShipment, AssignCarrier, DispatchShipment, ConfirmDelivery.

**Queries:** GetShipment, TrackShipment, GetCarrier, GetDeliveryProof.

**Events:** ShipmentCreated, ShipmentDispatched, ShipmentDelivered, ShipmentDeliveryFailed.

**Dependencies:** Order; Trade; Partner; AFX-PLATFORM Notification.

**Forbidden Dependencies:** Direct Order state mutation; Payment ownership; Contract mutation; cross-context DB writes.

### 3.9 Payment

**Purpose:** Payment intent, transaction, refund, and settlement lifecycle.

**Boundary:** Payment processing state and references to external payment providers. Raw payment credentials are explicitly outside the context.

**Owned Entities:** PaymentIntent, PaymentTransaction, Refund, Settlement, PaymentAccountReference.

**Commands:** CreatePaymentIntent, AuthorizePayment, CapturePayment, RefundPayment, SettlePayment.

**Queries:** GetPaymentIntent, GetPaymentStatus, GetTransaction, GetSettlement.

**Events:** PaymentAuthorized, PaymentCaptured, PaymentFailed, PaymentRefunded, PaymentSettled.

**Dependencies:** Order; Commerce contract; external payment-provider contract; AFX-CORE.

**Forbidden Dependencies:** Raw card/payment credentials; direct Order mutation; price ownership; direct cross-context DB writes.

### 3.10 Partner

**Purpose:** Business-to-business relationship and collaboration network.

**Boundary:** Partnership relationships, partner roles, collaboration profile, and partner status.

**Owned Entities:** PartnerRelationship, PartnerRole, CollaborationProfile, PartnerStatus.

**Commands:** CreatePartnership, InvitePartner, AcceptPartnership, SuspendPartnership.

**Queries:** GetPartnership, ListPartners, GetPartnerRoles, GetCollaborationProfile.

**Events:** PartnershipCreated, PartnershipAccepted, PartnershipSuspended.

**Dependencies:** AFX-CORE Organization; Supplier; Factory; Service; Contract.

**Forbidden Dependencies:** Identity/Membership ownership; Payment ownership; Order ownership; direct organization identity mutation.

### 3.11 Marketing

**Purpose:** Campaign planning, audience segmentation, touchpoints, and attribution.

**Boundary:** Marketing campaign and audience orchestration. Consent authority and transactional order/payment state remain outside.

**Owned Entities:** Campaign, Audience, Segment, MarketingTouchpoint, AttributionRecord.

**Commands:** CreateCampaign, LaunchCampaign, PauseCampaign, RecordTouchpoint.

**Queries:** GetCampaign, GetAudience, GetSegment, GetAttribution.

**Events:** CampaignLaunched, CampaignPaused, TouchpointRecorded.

**Dependencies:** Product; Commerce; Advertising; AFX-INTELLIGENCE Analytics; AFX-CORE Consent.

**Forbidden Dependencies:** Credentials; direct Order/Payment mutation; Consent bypass; private identity-data ownership.

### 3.12 Advertising

**Purpose:** Advertisement lifecycle, placements, targeting, and delivery records.

**Boundary:** Advertisement and ad-delivery domain. Payment ledger and marketing campaign authority remain elsewhere.

**Owned Entities:** Advertisement, AdPlacement, TargetingRule, AdDelivery, AdCampaign.

**Commands:** CreateAdvertisement, SubmitAdvertisement, ApproveAdvertisement, DeliverAdvertisement.

**Queries:** GetAdvertisement, GetPlacement, EvaluateTargeting, GetAdDelivery.

**Events:** AdvertisementSubmitted, AdvertisementApproved, AdvertisementDelivered.

**Dependencies:** Marketing; Product; AFX-INTELLIGENCE Analytics; AFX-CORE Consent; Payment contract.

**Forbidden Dependencies:** Payment ledger mutation; private user-data ownership; direct Marketing campaign mutation; consent bypass.

### 3.13 Certification

**Purpose:** Certification, verification, issuer, and compliance status lifecycle.

**Boundary:** Certificates and verification records for organizations, suppliers, factories, and services.

**Owned Entities:** Certificate, CertificationType, Issuer, VerificationRecord, ComplianceStatus.

**Commands:** IssueCertificate, VerifyCertificate, SuspendCertificate, ExpireCertificate.

**Queries:** GetCertificate, VerifyCertificate, GetComplianceStatus, ListIssuerCertificates.

**Events:** CertificateIssued, CertificateVerified, CertificateSuspended, CertificateExpired.

**Dependencies:** AFX-CORE Organization; Supplier; Factory; Service; AFX-PLATFORM File/Object Storage.

**Forbidden Dependencies:** Direct profile mutation; Contract ownership; Payment ownership; cross-context DB writes.

### 3.14 Contract

**Purpose:** Business contract lifecycle, parties, versions, signatures, and obligations.

**Boundary:** Contract aggregate and contractual lifecycle. Identity, organization, payment, and order remain separate authorities.

**Owned Entities:** Contract, ContractParty, ContractVersion, SignatureRecord, ContractObligation.

**Commands:** CreateContract, PublishContract, SignContract, TerminateContract.

**Queries:** GetContract, GetContractVersion, GetSignatures, GetObligations.

**Events:** ContractCreated, ContractSigned, ContractActivated, ContractTerminated.

**Dependencies:** Partner; Procurement; Tender; Trade; Certification; AFX-CORE authorization.

**Forbidden Dependencies:** Identity/Organization ownership; direct Payment mutation; direct Order mutation; cross-context DB access.

### 3.15 Tender

**Purpose:** Competitive tender lifecycle, lots, invitations, bids, evaluation, and award.

**Boundary:** Tender-specific sourcing process. Supplier capabilities, contract master, and payment are owned elsewhere.

**Owned Entities:** Tender, TenderLot, TenderInvitation, TenderBid, TenderEvaluation.

**Commands:** CreateTender, PublishTender, SubmitTenderBid, EvaluateTender, AwardTender.

**Queries:** GetTender, ListTenderLots, ListTenderBids, GetTenderEvaluation.

**Events:** TenderPublished, TenderBidSubmitted, TenderEvaluated, TenderAwarded.

**Dependencies:** Procurement; Supplier; Factory; Contract; Certification; AFX-CORE.

**Forbidden Dependencies:** Direct Supplier capability mutation; Contract document ownership; Payment transaction mutation; cross-context DB writes.

### 3.16 Trade

**Purpose:** International/domestic trade case orchestration, trade documents, milestones, and trade terms.

**Boundary:** Trade case lifecycle and trade-specific coordination. Shipment, contract, payment, and organizational identity remain owned by their respective contexts.

**Owned Entities:** TradeCase, TradeDocument, TradeParty, TradeMilestone, TradeTerm.

**Commands:** CreateTradeCase, AttachTradeDocument, UpdateTradeMilestone, CloseTradeCase.

**Queries:** GetTradeCase, ListTradeDocuments, GetTradeMilestones, GetTradeTerms.

**Events:** TradeCaseCreated, TradeDocumentAttached, TradeMilestoneUpdated, TradeCaseClosed.

**Dependencies:** Order; Logistics; Contract; Certification; Payment; Partner; AFX-CORE.

**Forbidden Dependencies:** Shipment ownership; Contract master mutation; Payment ledger mutation; Organization identity ownership; cross-context DB writes.

## 4. Entity Ownership Rule

For G05.1, the following ownership invariant is mandatory:

```text
ONE ENTITY → ONE AUTHORITATIVE OWNER CONTEXT
```

An entity may be referenced by other contexts through an explicit contract, immutable snapshot, event, or governed read model. A reference does not transfer ownership.

Examples:

- Product owns Product and ProductVariant; Order may store a Product snapshot/reference but cannot mutate Product.
- Payment owns PaymentTransaction; Order may reference payment status through a contract/event but cannot write the Payment ledger.
- Logistics owns Shipment; Order may reference shipment status but cannot mutate Shipment state.
- AFX-CORE owns User, Membership, Organization identity/security primitives; business contexts cannot create parallel copies as authorities.

## 5. Dependency Policy

### Allowed interaction patterns

- Synchronous application/API contract with explicit versioning.
- Asynchronous domain/integration events through the event platform.
- Governed read models or data products for cross-context queries.
- AFX-CORE security/tenant/authorization capabilities through approved interfaces.
- AFX-PLATFORM infrastructure capabilities through approved platform contracts.

### Forbidden interaction patterns

- Direct SQL reads/writes into another bounded context's tables.
- Shared mutable ORM models spanning bounded contexts.
- Cross-context database foreign-key ownership that creates hidden lifecycle coupling.
- Direct mutation of another context's aggregate/entity.
- Business logic placed in the API Gateway to bypass domain ownership.
- Frontend-to-database access.
- Duplicate identity, membership, RBAC, authorization, or tenant authorities.
- Undeclared dependency on a business context.

## 6. Context Dependency Matrix

| Context | Primary Allowed Dependencies | Explicitly Forbidden Ownership/Mutation |
|---|---|---|
| Product | Core, Storage, Search | Price, Order, Payment, Shipment, Inventory |
| Commerce | Product, Order, Payment, Core | Product master, Payment ledger, Order lifecycle |
| Supplier | Core, Certification, Procurement, Partner | Product, Order, Payment, banking credentials |
| Factory | Core, Certification, Procurement, Trade | Order, Payment, Shipment, accounting inventory |
| Service | Core, Commerce, Order, Certification | Order financial state, Payment, Logistics, Product catalog |
| Order | Commerce, Product contract, Payment, Logistics, Core | Cart, Product master, Payment ledger, Logistics state |
| Procurement | Supplier, Product, Factory, Tender, Contract, Order, Core | Supplier master, Contract registration, Payment |
| Logistics | Order, Trade, Partner, Notification | Order state, Payment, Contract |
| Payment | Order, Commerce contract, external provider, Core | Raw credentials, Order mutation, price ownership |
| Partner | Core Organization, Supplier, Factory, Service, Contract | Identity, Membership, Payment, Order |
| Marketing | Product, Commerce, Advertising, Analytics, Consent | Credentials, Order/Payment mutation, Consent bypass |
| Advertising | Marketing, Product, Analytics, Consent, Payment contract | Payment ledger, private user data, Marketing mutation |
| Certification | Core Organization, Supplier, Factory, Service, Storage | Profile mutation, Contract, Payment |
| Contract | Partner, Procurement, Tender, Trade, Certification, Core | Identity/Organization, Payment, Order |
| Tender | Procurement, Supplier, Factory, Contract, Certification, Core | Supplier capability, Contract document, Payment |
| Trade | Order, Logistics, Contract, Certification, Payment, Partner, Core | Shipment, Contract master, Payment ledger, Organization identity |

## 7. G05.1 Exit Criteria

G05.1 may be marked GREEN only when all conditions below are evidenced:

- [ ] `docs/architecture/AFX-DOMAIN-MAP-001.md` exists on the Phase 05 branch.
- [ ] Architecture Review result is explicitly recorded as `APPROVED`.
- [ ] Every declared business entity has one authoritative owner context.
- [ ] Entity ownership conflicts are resolved and evidenced.
- [ ] Allowed and forbidden dependency rules are represented in executable CI checks.
- [ ] CI proves no undeclared context and no forbidden cross-context dependency for the governed scope.
- [ ] Machine-readable evidence is generated and retained.
- [ ] G05.2 is explicitly unblocked only after the above criteria pass.

## 8. Change Control

This document is a controlled architecture artifact. Any change to context inventory, boundaries, entity ownership, dependency policy, or forbidden dependencies requires Architecture Review and, where architecture-controlled, an ADR.

G05.2 and subsequent Phase 05 work MUST treat the approved version of this document as the mother reference.

## 9. Current Gate Status

```text
G05.1 = IN PROGRESS
G05.2 = BLOCKED

Artifact       = REGISTERED
Review         = PENDING
Entity Owner   = PENDING VERIFICATION
CI Enforcement = PENDING
Evidence       = PENDING
GREEN          = NOT AUTHORIZED
```
