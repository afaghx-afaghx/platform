// AFAGHX Experience System — Canonical UX Contract v1.0
// Experience-only contract. No domain logic and no persistence ownership.

export const AFAGHX_UX_CONTRACT = Object.freeze({
  version: '1.0.0',
  apiBase: 'https://api.afaghx.com',
  architecture: 'AFX-EXPERIENCE -> Canonical API -> Core / Domain',
  languages: Object.freeze([
    { code: 'fa', label: 'فارسی', dir: 'rtl', path: '../index.html', active: true },
    { code: 'en', label: 'English', dir: 'ltr', path: './index.html', active: true },
    { code: 'ar', label: 'العربية', dir: 'rtl', path: '../ar/', active: false },
    { code: 'tr', label: 'Türkçe', dir: 'ltr', path: '../tr/', active: false },
  ]),
  routes: Object.freeze(['home','products','suppliers','factories','services','markets','business-network','intelligence']),
  homeSections: Object.freeze(['header','hero-need','need-actions','product-baskets','economic-network','trust','matching','procurement','industry','business-network','global-trade','intelligence','partners-api','footer']),
  requiredStates: Object.freeze(['loading','empty','success','error','unauthorized','forbidden','unavailable']),
});

export function activeLanguages() {
  return AFAGHX_UX_CONTRACT.languages.filter((item) => item.active);
}

export function languageByCode(code) {
  return AFAGHX_UX_CONTRACT.languages.find((item) => item.code === code) || AFAGHX_UX_CONTRACT.languages[0];
}

export function isCanonicalLanguage(code) {
  return AFAGHX_UX_CONTRACT.languages.some((item) => item.code === code);
}