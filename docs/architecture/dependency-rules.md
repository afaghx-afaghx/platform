# Dependency Rules

## Allowed direction

```text
apps / experience
        ↓
domains + platform
        ↓
AFX-CORE
```

Intelligence consumes approved contracts/events/data products and must not reach into another component's private persistence.

## Forbidden dependencies

- CORE → DOMAIN
- DOMAIN → DOMAIN private implementation
- EXPERIENCE → database
- INTELLIGENCE → transactional database as an integration mechanism
- Any service → another service's private tables
- Any domain → independent authentication authority

## Review rule

A dependency that crosses a layer or ownership boundary must have an explicit architectural reason and, when structural, an ADR.
