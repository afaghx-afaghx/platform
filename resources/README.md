# AFAGHX Resources

## Purpose
Canonical repository boundary for shared human-facing resource strings used by AFAGHX interfaces.

Phase B establishes locale catalogs from strings already present in the existing Experience web surface. It does not change the Experience runtime.

## Boundaries

### Owns
- Language-specific resource catalogs.
- Stable resource keys.
- Human-facing translations derived from existing approved Experience content.

### Does not own
- Authentication or authorization.
- Tenant policy or RBAC.
- Business rules or domain state.
- Database access or persistence.
- API or event contracts.
- Secrets or credentials.
- Runtime routing.

## Locale policy
- `fa.json` contains Persian values only.
- `en.json` contains English values only.
- The two catalogs use the same key set so consumers can select a language without changing semantic identifiers.
- This phase records only strings that are already present in the current Experience home surface; it does not invent missing copy.

## Source evidence
The catalogs were derived from:
- `experience/web/public/index.html` — Persian Experience home.
- `experience/web/public/en/index.html` — English Experience home.

The resource layer is intentionally not wired into those files in this phase. Runtime integration requires a separate implementation decision and evidence.

## Validation
A structural check should verify:
1. Both locale files are valid JSON.
2. Both locale files have the same keys.
3. No secret-bearing values are introduced.
4. Persian and English catalogs remain language-specific.
