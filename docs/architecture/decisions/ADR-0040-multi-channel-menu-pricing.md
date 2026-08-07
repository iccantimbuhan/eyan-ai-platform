# ADR-0040 — Multi-Channel Menu Pricing: A Reference Table, Not a New MenuCategory or a MenuItem Price Field

## Context

Sprint "2B Preparation / Restaurant Operations UX Improvements" needed to support the real business fact that a menu item can sell for a different price on a delivery channel (Wolt, Bolt) than in-house/MyPOS — e.g. Margherita €13.95 in-house vs. €15.50 on Wolt.

This number (0027–0031, "Multi-Channel Pricing") was reserved by the original architecture assessment (see `INDEX.md`) but never filed until this sprint actually needed it, following the same pattern as ADR-0032/0033/0034 (each superseded its own reserved slot with a fresh sequential number at filing time rather than reusing the original placeholder).

## The existing model, inspected first

- `SalesChannel` (Sprint 2C, ADR-0039) is a Restaurant-scoped name tag (Wolt, Bolt, POS/In-house, ...) used only for `SalesChannelEntry` — a per-day aggregate total. It has **no relationship to `MenuItem`** and never did.
- `MenuItem.price` is the one authoritative base price (Sprint 1.1).
- `MenuCategory` (Pizza, Chicken, Drinks) is a product/menu grouping — structurally and conceptually unrelated to `SalesChannel`, despite both being "categories" in casual speech.

Modeling "Wolt" as a `MenuCategory` (so Wolt items and prices would sit under a `MenuCategory` the way Pizza/Chicken do) was considered and rejected: it would conflate a sales channel with a product grouping, force every channel-priced item to be duplicated as a second `MenuItem` row per channel, and make `MenuCategory`'s meaning ambiguous everywhere else it's already used (Menu Items page filtering, Recipe's `menuItemId`, Sales Foundation's own `SalesCategory`, which ADR-0039 already deliberately kept independent of `MenuCategory` for the same reason).

## Decision: `SalesChannelMenuItem` — a thin, optional override join table

```prisma
model SalesChannelMenuItem {
  id             String @id @default(cuid())
  restaurantId   String
  salesChannelId String
  menuItemId     String

  price     Decimal? @db.Decimal(10, 2)
  available Boolean  @default(true)

  @@unique([salesChannelId, menuItemId])
}
```

- One row per `(SalesChannel, MenuItem)` pair that has a channel-specific price and/or availability override. No row at all (the common case for most items) means "use `MenuItem.price` on every channel" — nothing is duplicated.
- `price` is nullable: a row can exist purely to mark an item `available: false` on a channel without necessarily also overriding its price.
- `restaurantId` is denormalized, matching every other Sales Foundation table's tenant-isolation convention.
- **`MenuItem.price` is never written to by this table.** The base price is the one authoritative figure; a channel override is read-only convenience data layered on top, never a competing source of truth.
- **`SalesItemEntry` (the historical sales record) is untouched by this feature.** It still stores only `menuItemId`/`itemName`/`categoryName`/`quantity`/`amount` exactly as before — the channel-specific price is used only to *suggest* a default `amount` value in the Daily Sales entry form at the moment a manager picks a menu item; the manager can freely override it, and whatever they submit is what's saved, permanently, regardless of what the channel price was at that moment or later becomes. This preserves ADR-0039's snapshot principle exactly: renaming a MenuItem, changing a Wolt price, or disabling a channel override can never retroactively change a historical sales line.
- Mutations are scoped under `menu-items.routes.ts` (`PUT`/`DELETE /menu-items/:itemId/channel-prices/:salesChannelId`), reusing the existing `requireMenuItemAccess()` guard; the `salesChannelId` is defense-in-depth-verified against the same restaurant via the existing `SalesScopeMismatchError`. Writes require the same role list as Sprint 2C's Sales writes (`OWNER`/`MANAGER`/`SUPERVISOR`/`ACCOUNTANT`) since this is pricing/financial reference data, not general product-catalog metadata. Reads are a single wholesale `GET /restaurants/:restaurantId/sales-channel-menu-items` — the same "small dataset, fetch once, filter client-side" posture as `Unit`/`SalesChannel`/`SalesCategory`.

## Consequences

Positive: zero duplication of `MenuItem` rows per channel; `MenuCategory` and `SalesChannel` remain structurally distinct; no change whatsoever to Sprint 2C/2D's tested aggregation, reconciliation, or historical-snapshot behavior; the Daily Sales item-entry form can read a channel-aware default price as pure UX sugar without any new coupling in the write path.

Negative, accepted: no bulk "set this item's price on every channel at once" UI — a manager sets one channel at a time via the Menu Items page's "Channel Prices" dialog. Acceptable for the current channel count (a handful per restaurant); revisit only if that becomes a real friction point.

Out of scope, explicitly: this ADR does not touch POS/Wolt/Bolt API integration, automatic price sync, or any revenue reconciliation between channel prices and recorded sales — all remain future, separate work per the sprint's own scope boundary.
