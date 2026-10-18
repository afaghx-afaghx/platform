# PLATFORM Search Runtime — Meilisearch Runbook / کتاب راهنمای عملیاتی

> FA/EN — AFAGHX EXPERIENCE → PLATFORM search binding, live since 2026-10-18.

## فارسی

### معماری
- موتور: **Meilisearch** (باینری رسمی، production mode)، شنونده‌ی `127.0.0.1:7700`
- ایندکس: `afaghx` (پیش‌فرض قرارداد پلتفرم)، primaryKey = `id`
- سند = Product دوزبانه + فیلد محاسبه‌شده‌ی `discountPercent` (توازن با فیلتر deals محلی)
- اپ فروشگاه: `MEILISEARCH_URL` + `MEILISEARCH_API_KEY` (کلید **فقط-جستجو**، کم‌حداقل) + `MEILISEARCH_INDEX` در `.env.local`
- Master key هرگز به اپ نمی‌رسد؛ فقط در `.data/meilisearch/keys.env` (0600)
- تخریب‌ناپذیری: موتور خاموش → 200 + `x-afx-search-source: local` + `x-afx-search-degraded: 1`

### راه‌اندازی از صفر
```bash
# ۱) باینری
curl -L https://github.com/meilisearch/meilisearch/releases/latest/download/meilisearch-linux-amd64 -o bin/meilisearch && chmod +x bin/meilisearch
# ۲) کلید اصلی (یک‌بار)
echo "export MEILI_MASTER_KEY=$(openssl rand -hex 32)" > .data/meilisearch/keys.env && chmod 600 .data/meilisearch/keys.env
# ۳) اجرا (sandbox: mini-services در بوت؛ عمومی: systemd/docker)
bash mini-services/meilisearch/run.sh   # یا: setsid bash mini-services/meilisearch/run.sh &
# ۴) پروویژن (ایندکس + settings + کلید فقط-جستجو → .env.local)
source .data/meilisearch/keys.env && bun run scripts/meilisearch/provision.ts
# ۵) ایندکس کاتالوگ (هر تغییر کاتالوگ دوباره)
source .data/meilisearch/keys.env && bun run scripts/meilisearch/index-catalog.ts
# ۶) ری‌استارت اپ برای خواندن .env.local
```

### عملیات روزمره
| کار | دستور |
|---|---|
| سلامت | `curl 127.0.0.1:7700/health` |
| آمار ایندکس | `curl -H "Authorization: Bearer $MEILI_MASTER_KEY" 127.0.0.1:7700/indexes/afaghx/stats` |
| بازسازی کامل | `bun run scripts/meilisearch/index-catalog.ts` |
| تست تخریب‌ناپذیری | موتور را بکشید → `/api/search` باید 200 + `degraded:1` بدهد |

### نکته‌های امنیتی
- کلید اپ = `actions:["search"], indexes:["afaghx"]` — نشت آن فقط خواندن جستجو است.
- Master key را هرگز در repo/env-shared/log قرار ندهید.
- bind فقط `127.0.0.1`؛ برای دسترسی راه‌دور از reverse proxy + شبکه‌ی خصوصی استفاده کنید.

## English

### Architecture
- Engine: **Meilisearch** (official binary, production mode), listening on `127.0.0.1:7700`
- Index: `afaghx` (platform contract default), primaryKey = `id`
- Document = bilingual Product + computed `discountPercent` (parity with the local deals filter)
- Storefront runtime: `MEILISEARCH_URL` + `MEILISEARCH_API_KEY` (**search-only**, least privilege) + `MEILISEARCH_INDEX` in `.env.local`
- Master key never reaches the app; lives only in `.data/meilisearch/keys.env` (0600)
- Degradation: engine down → 200 + `x-afx-search-source: local` + `x-afx-search-degraded: 1`

### Ops quick reference
| Task | Command |
|---|---|
| Health | `curl 127.0.0.1:7700/health` |
| Index stats | `curl -H "Authorization: Bearer $MEILI_MASTER_KEY" 127.0.0.1:7700/indexes/afaghx/stats` |
| Full reindex | `bun run scripts/meilisearch/index-catalog.ts` |
| Degradation drill | kill engine → `/api/search` must stay 200 + `degraded:1` |

### Deployment note
This sandbox keeps the engine alive via `mini-services/meilisearch` (started by
`.zscripts/dev.sh` at boot, parented to init). On a real host run the same
`run.sh` under systemd (`Restart=always`) or a container orchestrator — the
app contract (env trio + graceful degradation) is unchanged.
