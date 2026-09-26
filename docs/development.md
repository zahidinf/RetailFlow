# RetailFlow — Local Development & Deployment Guide

## 1. Local Development Setup

### System Prerequisites
* Node.js v20 or v24
* npm v10+
* PostgreSQL 14+

### Step-by-Step Instructions
```bash
# 1. Clone repository
git clone https://github.com/zahidinf/RetailFlow.git
cd RetailFlow

# 2. Install dependencies
npm install

# 3. Setup environment configuration
cp .env.example .env
# Edit .env with your local PostgreSQL credentials

# 4. Run database migrations
npx prisma migrate deploy

# 5. Seed test data & RBAC permissions
npm run prisma:seed
npm run prisma:seed-rbac

# 6. Start local development server
npm run dev
```

## 2. Test Execution

RetailFlow includes test verification scripts covering all core domain modules:

```bash
# Verify product catalog and inventory thresholds
npx tsx scripts/test-phase1.ts

# Verify role isolation and cashier boundary scoping
npx tsx scripts/test-phase2-rbac.ts

# Verify purchasing, approvals, receiving, and ledger trails
npx tsx scripts/test-phase3-and-4.ts

# Verify API route handlers reject unauthenticated and unauthorized requests
npx tsx scripts/test-purchasing-api-403.ts

# Verify reports module queries and auditor read-only restrictions
npx tsx scripts/verify-reports-and-auditor.ts
```

## 3. Production Build

To verify compilation and static generation for production:

```bash
npm run build
npm start
```
