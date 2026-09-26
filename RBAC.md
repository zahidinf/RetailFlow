# RBAC Implementation Guide

## Overview

Role-Based Access Control (RBAC) system with flexible permission management.

## Database Structure

```
User (1) ←→ (M) UserRole (M) ←→ (1) Role
                                      ↓
                                      (1)
                                      ↓
                              RolePermission
                                      ↓
                                      (M)
                                      ↓
                                 Permission
```

## Migration & Seed

### Run Migration

```bash
npx prisma migrate dev
```

### Seed RBAC Data

```bash
npm run prisma:seed-rbac
```

This will:
- Create 10 default permissions (USER_*, ROLE_*, PERMISSION_*)
- Create SUPER_ADMIN role
- Assign all permissions to SUPER_ADMIN
- Assign SUPER_ADMIN role to all existing users

## Default Permissions

- `USER_VIEW` - View user list and details
- `USER_CREATE` - Create new users
- `USER_UPDATE` - Update existing users
- `USER_DELETE` - Delete users
- `ROLE_VIEW` - View roles
- `ROLE_CREATE` - Create new roles
- `ROLE_UPDATE` - Update existing roles
- `ROLE_DELETE` - Delete roles
- `PERMISSION_VIEW` - View permissions
- `PERMISSION_ASSIGN` - Assign permissions to roles

## Usage

### Server-Side Authorization

#### Protect Server Actions

```typescript
import { requirePermission } from "@/lib/auth-guards";

export async function deleteUser(userId: string) {
  await requirePermission("USER_DELETE");
  
  // Your business logic here
}
```

#### Check Permission (Non-Throwing)

```typescript
import { checkPermission } from "@/lib/auth-guards";

export async function myAction() {
  const canDelete = await checkPermission("USER_DELETE");
  
  if (canDelete) {
    // Do something
  }
}
```

#### Get User Permissions

```typescript
import { getUserPermissions } from "@/lib/rbac";

const permissions = await getUserPermissions(userId);
// Returns: ["USER_VIEW", "USER_CREATE", ...]
```

### Client-Side (UI Only)

#### Wrap Page with PermissionProvider

```typescript
import { PermissionProvider } from "@/app/components/PermissionProvider";
import { getSessionWithPermissions } from "@/lib/auth";

export default async function Page() {
  const session = await getSessionWithPermissions();
  
  return (
    <PermissionProvider permissions={session?.permissions || []}>
      {/* Your content */}
    </PermissionProvider>
  );
}
```

#### Use Permission Hook

```typescript
"use client";
import { usePermissions } from "@/app/components/PermissionProvider";

export function MyComponent() {
  const { hasPermission } = usePermissions();
  
  return (
    <div>
      {hasPermission("USER_CREATE") && (
        <button>Create User</button>
      )}
    </div>
  );
}
```

#### Use Can Component

```typescript
import { Can } from "@/app/components/PermissionProvider";

export function MyComponent() {
  return (
    <Can permission="USER_DELETE">
      <button>Delete</button>
    </Can>
  );
}
```

## Security Notes

⚠️ **Important:**
- Client-side permission checks are **for UX only**
- Always validate permissions on the **server-side**
- Never trust permission data from the client
- Use `requirePermission()` in all server actions/API routes

## Verify Existing User Has SUPER_ADMIN

### Using Prisma Studio

```bash
npx prisma studio
```

Check:
1. User table → verify your user exists
2. UserRole table → verify userId is linked to SUPER_ADMIN roleId
3. RolePermission table → verify SUPER_ADMIN has all permissions

### Using Database Query

```typescript
import { prisma } from "@/lib/prisma";

const user = await prisma.user.findFirst({
  where: { email: "your-email@example.com" },
  include: {
    userRoles: {
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    }
  }
});

console.log(user);
```

## Adding New Permissions

1. Add to seed file: `prisma/seed-rbac.ts`
2. Run seed: `npm run prisma:seed-rbac`
3. Permissions automatically assigned to SUPER_ADMIN

## Files Created/Modified

### Created:
- `lib/rbac.ts` - Permission service
- `lib/auth-guards.ts` - Authorization helpers
- `app/components/PermissionProvider.tsx` - React context for permissions
- `app/actions/user-actions.ts` - Example protected actions
- `prisma/seed-rbac.ts` - RBAC seed script
- `RBAC.md` - This documentation

### Modified:
- `prisma/schema.prisma` - Added RBAC models
- `lib/auth.ts` - Added `getSessionWithPermissions()`
- `app/page.tsx` - Wrapped with PermissionProvider
- `app/profile/page.tsx` - Wrapped with PermissionProvider
- `package.json` - Added `prisma:seed-rbac` script

## Authentication Flow

Login/authentication remains unchanged. Session still uses cookie-based userId. Permissions are loaded from database when needed.

```
Login → Session Cookie (userId) → getSession() → Load Permissions → Check Access
```

## Testing

1. Login with existing user
2. User should have full access (SUPER_ADMIN)
3. Try creating new role/user management pages
4. Test permission checks work correctly

## Next Steps

- Create User Management UI
- Create Role Management UI  
- Create Permission Assignment UI
- Add audit logging for permission changes
