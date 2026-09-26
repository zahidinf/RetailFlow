# RetailFlow — Technical Architecture & Design

This document details the architectural decisions, design patterns, and operational boundaries of the RetailFlow application.

## 1. Core Architectural Principles

1. **Permission-Driven Authorization**: All authorization decisions in RetailFlow are mediated by granular permission keys. Roles are simply named permission sets.
2. **Double-Sided Ledger Accounting**: Inventory quantities are never updated in isolation. Every stock adjustment, sale, purchase receipt, or return creates an immutable `StockMovement` entry capturing previous balance, delta, reason, and new balance.
3. **Defense-in-Depth Authorization**: Access control is enforced at four distinct levels:
   * **Database Constraint Level**: Foreign key constraints and unique compound indexes prevent orphan records and conflicting identities.
   * **API / Handler Level**: Next.js route handlers verify session tokens and execute permission checks before query evaluation.
   * **Server Component Level**: Pages query user permissions server-side and render access-denied views if permissions are absent.
   * **Client UI Gateway Level**: Navigation items, action buttons, and dropdown links conditionally render using `Can` guards and `usePermissions` hooks.

## 2. Directory Structure

```
RetailFlow/
├── app/                     # Next.js App Router root
│   ├── admin/               # Administration screens (Users, Roles, Products, Categories, Stock)
│   ├── api/                 # Secure REST API route handlers
│   ├── components/          # Reusable shared UI components (Navbar, Menus, Pagination)
│   ├── pos/                 # Point of Sale interactive checkout terminal
│   ├── purchasing/          # Procurement management (Suppliers, POs, Goods Receipts)
│   ├── reports/             # Unified reporting and analytics center
│   └── sales/               # Sales transaction histories & refund management
├── lib/                     # Domain services and infrastructure utilities
│   ├── auth.ts              # Session management, cookie lifecycle, and authentication
│   ├── auth-guards.ts       # Server-side guard helpers
│   ├── prisma.ts            # Singleton PrismaClient instance
│   ├── purchasing.ts        # Procurement workflows and decimal serialization
│   ├── rbac.ts              # Permission resolution, caching, and alias mapping
│   ├── reports.ts           # Analytical aggregation queries across all report domains
│   ├── sales.ts             # POS checkout transaction workflows
│   └── tax-utils.ts         # Reverse tax calculation utilities (Indonesian PPN 11%)
├── prisma/                  # Database schema, migrations, and seed scripts
└── scripts/                 # Automated test and verification suites
```

## 3. Session & Concurrency Architecture

RetailFlow implements server-side session persistence via the `Session` model:

* **Session Token Generation**: 256-bit cryptographically secure hexadecimal tokens stored in an `HttpOnly`, `SameSite=Lax` cookie.
* **Idle Timeout Detection**: Configurable through Parameter Settings (default: 30 minutes). Stale sessions are purged automatically on validation.
* **Single Concurrent Session Limit**: Configurable maximum active sessions per user (default: 1). Creating a new session automatically terminates older sessions in an atomic transaction.
