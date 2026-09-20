# AFX-AI-CEA-001 — Agent UI Execution Contract

## هدف

رابط کاربری Agent باید فقط از API رسمی AFAGHX استفاده کند و اجرای ابزار را بدون احراز هویت، Tenant Context و مجوز متوقف کند.

## Canonical flow

`UI → api.afaghx.com/v1/auth/context → Tenant Context → /v1/agent/executions → Tool Gateway → PersistentAfxCore/PostgreSQL → Evidence → Audit → Gate → Isolated Branch → PR`

## Required API contract

### GET /v1/auth/context

باید context معتبر کاربر را برگرداند و حداقل شامل یکی از این قراردادها باشد:

- `userId`
- `tenantId`
- `permissions`

عدم احراز هویت: `401`

عدم دسترسی به context: `403`

### POST /v1/agent/executions

درخواست حداقل:

```json
{
  "taskId": "AFX-GOLDEN-001",
  "tool": "engineering.execute",
  "tenantId": "…",
  "mode": "golden-execution"
}
```

این route فقط پس از Auth + Tenant + Permission باید Tool را اجرا کند.

### GET /v1/agent/executions/{id}

باید مراحل واقعی اجرا و وضعیت حقیقت را برگرداند. مقدار `PROVEN` فقط زمانی مجاز است که Evidence و Audit و Gate قابل بازیابی باشند.

## Non-negotiables

- هیچ token/secretی در `localStorage` یا `sessionStorage` ذخیره نمی‌شود.
- رابط کاربری مستقیماً به PostgreSQL متصل نمی‌شود.
- رابط کاربری مستقیماً به GitHub token دسترسی ندارد.
- Experience به منطق کسب‌وکار تبدیل نمی‌شود.
- اجرای Agent بدون `agent.execute` مجاز نیست.
- `UNKNOWN/PARTIAL` هرگز `GREEN/PROVEN` نیست.

## Current repository status

این فایل «قرارداد اتصال» است؛ استقرار واقعی API routeهای فوق و GitHub workflow dispatch سمت سرور باید در Canonical API Runtime انجام شود. تا زمانی که آن routeها و شواهد واقعی وجود نداشته باشند، رابط کاربری باید صریحاً `BLOCKED/UNKNOWN` نمایش دهد و ادعای اجرای موفق نکند.
