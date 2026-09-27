# Release Notes - RetailFlow v1.1.0

**Release Date:** September 27, 2026

## Highlights

### 1. Promotion Management Module
- Manage promotions at `/admin/promotions` with permission-driven UI.
- Support for:
  - **Buy X Get Y Free** (e.g. Buy 2 Aqua, Get 1 Aqua Free)
  - **Tebus Murah / Special Price** based on minimum cart purchase subtotal
  - **Quantity / Product Discounts** (Percentage, Fixed Amount, or Special Unit Price)
- Full Audit Trail logging (`CREATE`, `UPDATE`, `ACTIVATE`, `DEACTIVATE`, `DELETE`) with previous/new value capture.

### 2. POS 3-Column Checkout Experience
- Streamlined normal POS Cart displaying only items, quantities, per-item prices, and grand total.
- 3-Column Checkout Popup triggered on "Complete Sale & Checkout":
  - **Col 1 (Promotions)**: Live calculation of applicable promotions, progress counters, and 1-click reward add/apply.
  - **Col 2 (Cart)**: Live cart adjustment with dynamic promotion eligibility revocation when cart items decrease below threshold.
  - **Col 3 (Payment)**: Unified existing reverse tax logic (PPN 11%), multiple payment channels, cash tender & change calculations.
- Integrated receipt popup displaying transaction breakdown.
- Full physical inventory reduction including free promo items.

### 3. Verification & Compatibility
- Full TypeScript type check passed.
- Next.js production build (`npm run build`) succeeded without warnings.
- End-to-end promotion and POS integration test suite passed.
