# RetailFlow 1.1.0

**Release Date:** September 27, 2026

### Overview

RetailFlow 1.1.0 introduces comprehensive promotion management, deep promotional integration into the Point of Sale (POS) checkout workflow, enhanced role-based dashboard experiences across all user roles, and precision financial calculations across discounts, reverse tax computations, and customer receipt presentation.

### Dashboard

- Dynamic, role-specific dashboard views tailored for all 9 application roles without hardcoded role strings.
- Dedicated backend API endpoint (`/api/dashboard/[role]`) strictly protected by session RBAC permissions.
- Contextual metrics, quick action shortcuts, and status summaries relevant to each authenticated role.

### Promo Management

- Centralized promotional campaign administration accessible at `/admin/promotions`.
- Three core promotion mechanisms:
  - **Buy X Get Y**: Buy a minimum quantity of product X to receive product Y as a free reward item.
  - **Tebus Murah (Special Price)**: Minimum cart subtotal qualification unlocking special reduced item prices without changing master catalog prices.
  - **Quantity / Product Discounts**: Threshold-based tier discounts supporting percentage discounts, fixed nominal discounts, or fixed unit prices.
- Promotion scheduling with priority configuration, active/inactive status toggles, validity time windows, and stackability settings.
- Comprehensive audit trail recording all promotion modifications (`CREATE`, `UPDATE`, `ACTIVATE`, `DEACTIVATE`, `DELETE`) with before and after state diffs.
- Granular RBAC permissions governing promotion view, creation, editing, status changes, and checkout application.

### POS

- **3-Column Checkout Experience**: Interactive modal dividing the checkout process into live Promotions qualification, Cart review, and Payment settlement.
- **Promo Integration**: Real-time evaluation of applicable promotions with live progress counters and 1-click reward item addition; automatic promotion eligibility revocation when cart items drop below thresholds.
- **Physical Stock Tracking**: Dual inventory deduction accounting for both regular purchased items and promotional reward items.
- **Payment Suggestions**: Dynamic generation of practical, rounded tender denomination chips above the Grand Total, with 1-click amount population and instant change calculation.
- **Tax and Pricing Integrity**: Reverse tax calculation (PPN 11%) applied to tax-inclusive retail pricing, maintaining strict reconciliation between normal price, discounts, pre-tax amounts, and final totals.
- **Customer Receipt Breakdown**: Standardized receipt structure detailing Normal Price, Consolidated Discount, Price After Discount, Pre-Tax Amount, Tax, and Total After Tax.

### Version

This release is **1.1.0**.
