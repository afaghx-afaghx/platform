# Affiliate

- **Module ID:** AFX-MOD-AFF-001
- **Experience layer:** AFX-EXPERIENCE
- **Entrypoint:** https://affiliate.afaghx.com
- **Purpose:** Affiliate acquisition, referral links, click analytics and earnings view
- **API boundary:** https://api.afaghx.com
- **Authentication authority:** AFX-CORE

This is a thin Experience client. It must not determine click qualification or calculate commissions in the browser. Campaign ownership, signed attribution, fraud triage, click qualification and journal posting are performed by the Affiliate Domain through the canonical Gateway.

The affiliate dashboard reads campaign and click status from the API. Earnings are displayed only from posted ledger transactions; raw or pending-review clicks are not payable balances.
