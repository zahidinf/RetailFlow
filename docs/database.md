# RetailFlow — Database Schema & Data Models

RetailFlow uses PostgreSQL with Prisma ORM.

## Entity Relationship Overview

```
User (1) ─────────────< (N) UserRole (N) >───────────── (1) Role
                                                           │
                                                           │ (1)
                                                           v
Permission (1) ───────< (N) RolePermission (N) <───────────┘

Category (1) ─────────< (N) Product (1) ─────────────── (1) Stock
                              │
                              ├──< (N) SaleItem (N) >───────── (1) Sale (1) >────< (N) Refund
                              ├──< (N) StockMovement
                              ├──< (N) PurchaseOrderItem (N) > (1) PurchaseOrder
                              └──< (N) GoodsReceiptItem (N)  > (1) GoodsReceipt
```

## Key Relational Models

### 1. Catalog & Inventory
* `Category`: Taxonomy hierarchy (`id`, `name`, `description`, `status`).
* `Product`: SKU, barcode, category relation, pricing (`costPrice`, `sellingPrice` with 12,2 decimal precision), unit enum, minimum stock threshold.
* `Stock`: 1-to-1 relation with Product maintaining current on-hand quantity.
* `StockMovement`: Immutable transactional ledger logging inventory deltas (`IN`, `OUT`, `ADJUSTMENT`, `SALE`, `PURCHASE`, `RETURN`).

### 2. POS & Sales Transactions
* `Sale`: Cashier relationship, sale number, totals, tender type (`CASH`, `CARD`, `QRIS`), payment received, change tendered, and status (`COMPLETED`, `VOID`, `PARTIAL_REFUNDED`, `REFUNDED`).
* `SaleItem`: Itemized line entries capturing unit price and refunded quantity.
* `Refund`: Policy authorization logging approved manager ID, reason, and refunded items.

### 3. Procurement & Logistics
* `Supplier`: Vendor code, contact details, status.
* `PurchaseOrder`: Multi-stage PO tracking supplier relation, line item totals, discounts, taxes, and author/approver users.
* `GoodsReceipt`: Physical inventory intake linking to a Purchase Order, received quantities, and receiving clerk.

### 4. Auditing & Session Governance
* `Session`: Database-tracked active sessions with `token`, `userId`, and `lastActivity` timestamp.
* `AuditLog`: Action, entity, and detail metadata for security-sensitive operational alterations.
* `ParameterSetting`: System-wide parameters such as session idle timeouts and refund validity periods.
