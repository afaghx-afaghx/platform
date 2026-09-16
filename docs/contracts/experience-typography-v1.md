# AFAGHX Experience Typography Contract v1.0

**Status:** canonical prototype contract

## Font roles

- **Primary Persian / UI:** `Vazirmatn`
- **Primary Latin / English:** `Inter`
- **Fallback:** `Segoe UI`, `Tahoma`, `Arial`, `sans-serif`

## Search typography

- Search input: 16px desktop / 15px mobile
- Basket selector: 15px desktop / 14px mobile
- Search action: 14px
- Search result state: 15px

## UI scale

- Body: 16px desktop / 15px mobile
- Navigation: 13px
- Buttons: 14px
- Card titles: 17–22px
- Section body: 15px
- Metadata: 12px
- Hero heading: responsive `clamp()` scale

## Rules

1. Typography must remain readable in Persian and English.
2. Search must use the same typography system as the rest of the Experience Shell.
3. No decorative or family-level taxonomy labels are introduced into the Search selector.
4. No external font CDN dependency is required by the typography stylesheet.
5. The browser fallback chain must remain deterministic when the preferred font is unavailable.

## Evidence requirement

The contract is not a Release GREEN declaration. CI must verify the stylesheet, page wiring, Search contract, and deployment before the Experience Release Gate can be GREEN.
