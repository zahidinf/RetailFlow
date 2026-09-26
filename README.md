# RetailFlow — Enterprise Retail & POS Management Platform

RetailFlow is an enterprise-grade retail operations, point of sale (POS), purchasing, inventory, and analytics platform. Built with **Next.js 16 (App Router)**, **TypeScript**, **Prisma ORM**, **PostgreSQL**, and **Tailwind CSS**, it features a strict, permission-based Role-Based Access Control (RBAC) engine, transactional stock ledgers, and comprehensive auditing.

---

## Business Overview

Modern retail environments require strict separation of duties, reliable stock accounting, and multi-channel auditability. RetailFlow addresses these operational demands through:

* **Store POS & Checkout**: High-velocity barcode scanning, cart calculations, tax handling (tax-inclusive reverse calculation for Indonesian PPN 11%), multi-tender payments (Cash, Card, QRIS), and receipt generation.
* **Returns & Refunds**: Policy-enforced refund validation with manager approval, inventory restock tracking, and financial reconciliation.
* **Procurement Lifecycle**: Supplier relationship management, multi-stage Purchase Orders (`DRAFT` → `SUBMITTED` → `APPROVED` → `PARTIALLY_RECEIVED` → `RECEIVED`), and Goods Receipt confirmation directly adjusting stock ledgers.
* **Inventory Control & Adjustments**: Centralized SKU tracking, reorder thresholds (In Stock, Low Stock, Out of Stock), stock adjustment auditing, and chronological movement history.
* **Reporting & Compliance**: Multi-faceted reporting across Sales, Inventory, Purchasing, Warehouse, Finance, Cashier operations, and system Audit logs with CSV data export.
* **Enterprise Security & RBAC**: Fully granular permission-based authorization across frontend navigation, route guards, and backend API handlers with server-side session concurrency and idle-timeout management.

---

## Architecture & Engineering Highlights

```
RetailFlow Architecture
├── Client Tier: Next.js 16 Server & Client Components, Tailwind CSS, Responsive UX
├── Guard Tier: Cookie Sessions, Concurrency Limits, PermissionProvider & Can Gateways
├── Business Layer: Domain Services (/lib/sales, /lib/purchasing, /lib/reports, /lib/refund)
├── Data Access: Prisma ORM, Decimal precision handling, Atomic Transactions ($transaction)
└── Storage: PostgreSQL relational database with index-optimized query filters
```

### Key Technical Capabilities

1. **Permission-Based RBAC Architecture**:
   * No hard-coded role names (`if role == "Admin"` is strictly prohibited).
   * Permissions are granular primitives (e.g., `PURCHASE_ORDER_APPROVE`, `GOODS_RECEIPT_CONFIRM`, `REPORT_FINANCE_VIEW`, `REPORT_EXPORT`).
   * Roles aggregate permissions; users inherit permissions via assigned roles.
   * Super Admin adheres to RBAC rules rather than bypassing security middleware.
2. **Double-Sided Ledger Accounting**:
   * Inventory updates execute within database transactions with corresponding `StockMovement` records logging movement type (`SALE`, `PURCHASE`, `ADJUSTMENT`, `RETURN`), reference entity, delta, and post-transaction balance.
3. **Session Security & Inactivity Handling**:
   * Database-backed session tokens with strict concurrent active session bounds and automatic idle timeout revocation.
4. **Server-Side Pagination & Filtering**:
   * Report queries and ledger views filter directly at the database layer using indexed timestamps, SKUs, and foreign keys.

---

## Technology Stack

* **Frontend & Framework**: Next.js 16.3.6 (App Router with Turbopack), React 19, TypeScript
* **Styling**: Tailwind CSS 4, PostCSS
* **Database & ORM**: PostgreSQL, Prisma Client 6.19
* **Security & Auth**: Bcrypt password hashing, HttpOnly secure cookies, AsyncLocalStorage context
* **Validation & Utilities**: Zod, Native Decimal math handling

---

## Implemented Modules

| Module | Operational Scope |
| :--- | :--- |
| **Point of Sale (POS)** | Barcode search, cart management, cash calculation with change calculation, card/QRIS tenders, and receipt rendering. |
| **Sales & Transactions** | Filterable transaction logs, itemized details, and manager-authorized partial or full returns. |
| **Product Management** | Product catalog, unit configuration, cost vs selling prices, image attachment, and category taxonomy. |
| **Stock & Ledger** | Stock levels, minimum threshold warnings, manual adjustments with audit reason logging, and movement trails. |
| **Purchasing (PO)** | Supplier management, PO authoring, approval workflows, and status tracking. |
| **Warehouse (GR)** | Receiving against approved POs, partial receipt accounting, discrepancy tracking, and automatic stock addition. |
| **Reports Center** | 30+ dedicated report views across Sales, Inventory, Purchasing, Warehouse, Finance, Cashier, and Audit logs with CSV export. |
| **Administration** | User lifecycle management, Role creation and permission assignment, Session parameters, and store policies. |

---

## Role Matrix (Default Configuration)

| Role | Operational Rights | Reporting & Audit Scope |
| :--- | :--- | :--- |
| **Super Admin** | Full system governance, User/Role RBAC, System parameters | Complete operational & financial analytics |
| **Admin** | Full operational management across products, users, suppliers, PO, GR | Complete operational reports |
| **Manager** | Store operations, refund approvals, purchase order approvals | Operational, sales, cashier, and inventory reports |
| **Cashier** | POS execution, checkout, and initiating refund requests | Scoped cashier sales & tender summary |
| **Inventory Staff**| Product oversight, stock level adjustments, viewing incoming shipments | Stock summary, movements, and discrepancy reports |
| **Purchasing** | Supplier management, PO drafting, editing, and submission | Procurement spending and supplier fulfillment reports |
| **Warehouse** | Physical goods receipt verification, GR confirmation, stock movement tracking | Receiving, discrepancy, and warehouse reports |
| **Accountant** | Strictly read-only operational visibility (no data mutations) | Finance, revenue, tax, and sales reports |
| **Auditor** | **Strictly read-only monitoring**: No create, edit, delete, or approve actions | Access to all analytical reports, audit logs, and detail views |

---

## Getting Started

### Prerequisites

* **Node.js**: v20 or newer (`v24.x` recommended)
* **Package Manager**: `npm` (v10+)
* **Database**: PostgreSQL 14+ instance

### Installation & Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/zahidinf/RetailFlow.git
   cd RetailFlow
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Update `DATABASE_URL` with your PostgreSQL credentials:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/retailflow_db?schema=public"
   NEXT_PUBLIC_APP_ENV="development"
   ```

4. **Initialize Database & Migrations**:
   ```bash
   npx prisma migrate deploy
   ```

5. **Seed Catalog & RBAC Configuration**:
   ```bash
   npm run prisma:seed
   npm run prisma:seed-rbac
   ```

6. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Verification & Testing

RetailFlow includes test suites verifying RBAC integrity, separation of duties, stock accounting, and report queries:

```bash
# Verify Phase 1 Stock & Category Logic
npx tsx scripts/test-phase1.ts

# Verify Phase 2 RBAC Matrix & Cashier Isolation
npx tsx scripts/test-phase2-rbac.ts

# Verify Phase 3 & 4 Purchasing, GR, and Audit Trail Workflows
npx tsx scripts/test-phase3-and-4.ts

# Verify API Route Handlers HTTP 401/403 Enforcement
npx tsx scripts/test-purchasing-api-403.ts

# Verify Reports & Auditor Read-Only Confinement
npx tsx scripts/verify-reports-and-auditor.ts

# Verify Production Compilation
npm run build
```

---

## Development Test Accounts (Local Seed)

When initialized with `npm run prisma:seed-rbac`, the following development test accounts are provisioned with default dev password `SecureDevPassword123!`:

* **Super Admin**: `farhan@example.com`
* **Admin**: `admin@example.com`
* **Manager**: `manager@retailflow.local`
* **Cashier**: `cashier@retailflow.local`
* **Inventory Staff**: `inventory@retailflow.local`
* **Purchasing**: `purchasing@retailflow.local`
* **Warehouse**: `warehouse@retailflow.local`
* **Accountant**: `accountant@retailflow.local`
* **Auditor**: `auditor@retailflow.local`

*(Note: These accounts and credentials apply exclusively to local development seed databases and must never be deployed to production.)*

---

## License

This project is currently unlicensed. All rights reserved.
