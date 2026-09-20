# AFAGHX Local-First Agent Runner

## هدف

AFX-AI-CEA-001 باید بدون وابستگی اجباری به اعتبار OpenAI اجرا شود.

مسیر اصلی:

`GitHub Actions -> self-hosted runner -> OpenCode -> Ollama -> local coding model`

OpenCode از مدل‌های محلی Ollama پشتیبانی می‌کند و می‌تواند با endpoint محلی Ollama کار کند. GitHub self-hosted runner را می‌توان با label سفارشی مسیریابی کرد و استفاده از runner در Actions هزینه‌ای ندارد؛ هزینه سخت‌افزار با مالک runner است.

## پیش‌نیاز runner

- Linux x64
- GitHub Actions self-hosted runner
- labelهای `self-hosted,linux,x64,afaghx-ai`
- Node.js و npm
- Docker برای PostgreSQL service container
- Ollama
- OpenCode CLI
- مدل محلی پیش‌فرض: `qwen2.5-coder:14b`

## آماده‌سازی Ollama

```bash
ollama serve
ollama pull qwen2.5-coder:14b
```

در صورت کمبود RAM/VRAM می‌توان مدل را به `qwen2.5-coder:7b` تغییر داد.

## آماده‌سازی OpenCode

```bash
npm install -g opencode-ai
```

OpenCode برای Ollama از آدرس محلی `http://127.0.0.1:11434/v1` استفاده می‌کند و مدل به شکل `ollama/<model>` انتخاب می‌شود.

## آماده‌سازی runner

در GitHub:
Settings -> Actions -> Runners -> New self-hosted runner

runner را فقط برای repository `afaghx-afaghx/platform` ثبت کنید و label سفارشی `afaghx-ai` را اضافه کنید.

پس از نصب runner، این کنترل باید موفق شود:

```bash
bash scripts/ai/local-agent-preflight.sh
```

## نکات امنیتی

Runner محلی نباید برای اجرای pull requestهای ناشناس استفاده شود. اجرای Agent فقط از مسیرهای کنترل‌شده main/dispatch انجام می‌شود.

Agent محلی حق push/merge/deploy ندارد. Workflow مسئول ایجاد branch و PR است و merge نهایی انسانی باقی می‌ماند.

کلیدهای Provider در repository ذخیره نمی‌شوند. Ollama محلی به کلید API نیاز ندارد.

## معیار سبز

Local Provider فقط وقتی `PROVEN` می‌شود که:
1. مدل محلی واقعاً اجرا شود.
2. تغییر substantive ایجاد شود.
3. baseline ثابت بماند.
4. تست Golden موفق شود.
5. Runtime و Security Gate موفق شوند.
6. Evidence تولید شود.
7. branch ایزوله ساخته شود.
8. PR ایجاد شود.
9. Required Checks سبز شوند.

UNKNOWN/PARTIAL هرگز GREEN نیست.
