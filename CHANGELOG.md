# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-09-27

### Enhanced
- **POS Payment Amount Suggestions**:
  - Dynamic payment suggestions algorithm based on current Grand Total generating practical rounded denominations above total.
  - Interactive clickable suggestion chips populating the Payment Received field with instant change recalculation.
  - Dynamic re-evaluation of payment suggestions whenever Grand Total updates from cart changes, discounts, Buy X Get Y, or Tebus Murah.
- **Customer Receipt / Nota Financial Breakdown**:
  - Standardized customer-facing financial layout: `Normal Price`, `Discount`, `Price After Discount`, `Pre-Tax Amount`, `Tax`, `Total After Tax`.
  - Consolidated single `Discount` line uniting regular line discounts, promotional percentage/nominal cuts, Buy X Get Y free items, and Tebus Murah special pricing.
  - Strict mathematical reconciliation: `Price After Discount = Normal Price - Discount`, `Total After Tax = Pre-Tax Amount + Tax`, `Total After Tax = Actual Grand Total`.
  - Reverse tax calculation using configured tax rate with tax-inclusive retail pricing.

### Added
- **Promotion Management Module**:
  - Full CRUD lifecycle for promotional campaigns (`/admin/promotions`).
  - Support for 3 promotion types:
    - **Buy X Get Y**: Buy minimum quantity of product X and receive quantity of reward product Y free.
    - **Tebus Murah (Special Price)**: Minimum cart subtotal threshold triggers special discounted price for tebus murah items without altering product master prices.
    - **Quantity / Product Discount**: Volume thresholds supporting percentage discounts, fixed nominal cuts, or unit special prices.
  - Configurable priority, validity dates (start/end timestamp), and stackability flags.
  - Active/Inactive toggling and audit logging with before/after state diffing.
  - Granular RBAC permissions: `PROMOTION_VIEW`, `PROMOTION_CREATE`, `PROMOTION_EDIT`, `PROMOTION_DELETE`, `PROMOTION_ACTIVATE`, `PROMOTION_DEACTIVATE`, `PROMOTION_APPLY`.
- **POS 3-Column Checkout Flow**:
  - Streamlined normal POS Cart displaying only items, quantities, line totals, and grand total.
  - Interactive 3-column checkout popup upon clicking "Complete Sale & Checkout":
    - **Column 1 (Promotions)**: Dynamic promotion list showing eligibility status, requirements, progress counters, and action triggers.
    - **Column 2 (Cart)**: Interactive cart item management with real-time promotion eligibility recalculation upon quantity changes.
    - **Column 3 (Payment)**: Native tax calculation (PPN 11%), payment method selector (CASH, QRIS, CARD), payment input with quick exact buttons, and change calculation.
  - Direct integration into existing receipt popup (`ReceiptModal`) upon successful payment.
  - Physical inventory stock deduction accounts for both purchased products and free reward items.
  - Automatic recording of promotion records (`SalePromotion`) and line item promotion linkages.
- **Enterprise Role-Based Dashboard Framework**:
  - Role-specific dashboard layouts for all 9 application roles without hardcoded role strings.
  - Backend API endpoint `/api/dashboard/[role]` protected by session RBAC permissions.
