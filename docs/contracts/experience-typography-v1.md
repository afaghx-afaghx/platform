# AFAGHX Experience Typography Contract v1.1

**Status:** canonical prototype contract

## Font roles

- **Primary Persian / UI:** `Vazirmatn`
- **Primary Latin / English:** `Inter`
- **Fallback:** `Segoe UI`, `Tahoma`, `Arial`, `sans-serif`
- **Runtime delivery:** pinned jsDelivr Fontsource packages

## Search typography

- Search input: 16px desktop / 15px mobile
- Basket selector: 15px desktop / 14px mobile
- Search action: 14px
- Search result state: 15px

## Search taxonomy rule

- The top-of-page Search selector contains exactly **34 approved product baskets** plus the default **All baskets / همه سبدها** option.
- Family / parent labels are not rendered in the Search selector.
- No `<optgroup>` or family-level intermediary is permitted in the Search selector.
- Runtime options are generated only from `PRODUCT_TAXONOMY`.

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
2. Search uses the same typography system as the Experience Shell.
3. The Search selector exposes baskets directly; family-level taxonomy is excluded.
4. Font versions are pinned for deterministic browser delivery.
5. Browser fallback remains deterministic when the preferred font is unavailable.

## Evidence requirement

This contract is not a Release GREEN declaration. CI must verify the stylesheet, font wiring, 34-basket Search contract, page payload, and deployment before the Experience Release Gate can be GREEN.
