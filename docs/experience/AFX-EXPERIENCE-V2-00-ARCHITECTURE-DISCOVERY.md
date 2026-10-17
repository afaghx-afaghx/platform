# AFX-EXPERIENCE-V2-00 — Architecture Discovery

## Baseline
- Repository: `afaghx-afaghx/platform`
- Main SHA: `6b27932f6d6cfe5923e5f336bff126d11f6d759e`
- Scope: `experience/web`
- Implementation changes: **none**

## Discovery result
The V2-00 inventory is complete for the repository tree at the locked baseline. The scope contains **120 actual files** under `experience/web` (excluding directory entries), including HTML, CSS, production JS, tests, assets and runtime/support files.

### Critical findings
1. The Persian homepage loads **18 CSS generations/layers**; the English homepage loads **17**. This confirms the need to replace the accumulated premium chain instead of adding another layer.
2. `home-v5.js` loads both `commerce-discovery-v1.js` and `afaghx-ai-discovery-v2.js`, so Discovery is currently split across two runtimes.
3. `afaghx-ai-discovery-v2.js` calls the canonical API, but its current responsibility is still governed natural-language search; V2 needs an explicit Intent → Entity → Journey → Action contract.
4. `home-v5.js` injects runtime header CSS with `!important`, creating a competing style authority that must disappear in V2.
5. Existing tests protect the current V5/premium implementation and therefore must be migrated before legacy layers are removed.
6. `product-taxonomy.js` remains the canonical 34-basket registry and is marked **KEEP**.
7. `server.js` preserves the frontend/API boundary and returns `canonical_api_only` for local `/api/` paths.

## V2 migration rule
Every current file is assigned one of:

- **KEEP** — canonical contract/runtime/static asset boundary.
- **MIGRATE** — behavior/evidence is preserved while adapted to V2.
- **REBUILD** — implementation is replaced by the new Design System / Experience Architecture.
- **MERGE** — shared concern is absorbed into the unified V2 system.
- **DELETE** — release/status artifacts with no architectural value after migration.

## Explicit no-go
No `premium-v9`, no additional override stylesheet, and no direct edit on `main` is authorized by this discovery phase.

## Next gate
The next implementation unit is **PR-01 — Experience Architecture + Design System**, branched from the same locked baseline. The migration manifest is the source map for that work.

Machine-readable manifest: `docs/experience/AFX-EXPERIENCE-V2-00-MIGRATION-MANIFEST.json`.
