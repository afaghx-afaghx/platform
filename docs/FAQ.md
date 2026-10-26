# FAQ

## Is AFAGHX only a marketplace?
No. The repository architecture defines an ecosystem platform spanning commerce, industry, services, procurement, business networking, trust, data, intelligence, and extensible capabilities.

## Where does authentication live?
AFX-CORE is the single authority. Domain and Experience modules must not create parallel authentication authorities.

## Can Experience access PostgreSQL directly?
No.

## Where are architecture decisions recorded?
In `docs/architecture/adr/`. Structural changes require an ADR before implementation.

## What makes a change complete?
Code, appropriate real tests, CI evidence, security checks, and reviewable documentation. A claim of GREEN requires actual evidence.
