# Manual Testing Guide - User Management Updates

## Changes Implemented

### 1. Add User Form
- **Removed**: Status selection (ACTIVE/INACTIVE options)
- **Fixed**: Browser autofill issue with autocomplete attributes
- **Enforced**: New users always created as ACTIVE

### 2. SUPER_ADMIN Protection
- **Server-side validation**: Minimum 1 active SUPER_ADMIN enforced
- **Applies to**: Role changes, status changes, user deletion
- **Transaction**: Atomic updates prevent race conditions

## Test Scenarios

### A. Add User - Autofill Test

**Steps:**
1. Login as `farhan@example.com`
2. Navigate to `/admin/users`
3. Click "Add User" button
4. **Verify**: Email field is empty (no browser autofill)
5. **Verify**: Password field is empty (no browser autofill)
6. **Verify**: No Status section visible
7. Fill form:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
   - Role: Select any role
8. Submit
9. **Expected**: User created with status ACTIVE
10. **Verify**: Login page still has browser autofill working

### B. SUPER_ADMIN Role Change - Single Admin

**Setup:** Only 1 active SUPER_ADMIN exists

**Steps:**
1. Navigate to `/admin/users`
2. Find the only active SUPER_ADMIN
3. Click Edit
4. Change role to ADMIN or USER
5. Submit
6. **Expected**: Error message "At least one active Super Admin must remain in the system."
7. **Verify**: Role not changed in database

### C. SUPER_ADMIN Role Change - Multiple Admins

**Setup:** Create 2 active SUPER_ADMIN users

**Steps:**
1. Add second SUPER_ADMIN user
2. Edit first SUPER_ADMIN
3. Change role to ADMIN
4. Submit
5. **Expected**: Success, role changed
6. **Verify**: Second SUPER_ADMIN still active

### D. SUPER_ADMIN Status Change - Single Admin

**Setup:** Only 1 active SUPER_ADMIN exists

**Steps:**
1. Edit the only active SUPER_ADMIN
2. Change status to INACTIVE (temporary or permanent)
3. Submit
4. **Expected**: Error message "At least one active Super Admin must remain in the system."
5. **Verify**: Status remains ACTIVE

### E. SUPER_ADMIN Status Change - Multiple Admins

**Setup:** 2 active SUPER_ADMIN users exist

**Steps:**
1. Edit first SUPER_ADMIN
2. Change status to INACTIVE
3. Submit
4. **Expected**: Success, status changed
5. **Verify**: Second SUPER_ADMIN still active

### F. SUPER_ADMIN Delete - Single Admin

**Setup:** Only 1 active SUPER_ADMIN exists

**Steps:**
1. Try to delete the only active SUPER_ADMIN
2. **Expected**: Error message "This user cannot be deleted because they are the last active Super Admin."
3. **Verify**: User still exists

### G. SUPER_ADMIN Delete - Multiple Admins

**Setup:** 2 active SUPER_ADMIN users exist

**Steps:**
1. Delete first SUPER_ADMIN
2. **Expected**: Success, user deleted
3. **Verify**: Second SUPER_ADMIN still exists and active

### H. Self-Delete Prevention

**Steps:**
1. Login as any user
2. Try to delete own account
3. **Expected**: Delete button disabled in UI
4. **Expected**: If forced via API, error "You cannot delete your own account"

### I. Self-Deactivate Prevention

**Steps:**
1. Login as any user
2. Edit own account
3. Try to change status to INACTIVE
4. **Expected**: INACTIVE radio disabled in UI
5. **Expected**: If forced via API, error "You cannot deactivate your own account"

### J. Temporary Inactive SUPER_ADMIN

**Setup:** 2 active SUPER_ADMIN users exist

**Steps:**
1. Edit first SUPER_ADMIN
2. Set status INACTIVE temporary:
   - Inactive From: today
   - Inactive Until: tomorrow
3. Submit (should succeed)
4. Edit second SUPER_ADMIN
5. Try to change role to ADMIN
6. **Expected**: Error (first admin is currently inactive, only one effective active)
7. Wait until "Inactive Until" date passes
8. Try step 4-5 again
9. **Expected**: Success (first admin auto-reactivated, count = 2)

### K. Combined Role + Status Change

**Setup:** 2 active SUPER_ADMIN users exist

**Steps:**
1. Edit first SUPER_ADMIN
2. Change role to ADMIN AND status to INACTIVE
3. Submit
4. **Expected**: Success (still have second active SUPER_ADMIN)
5. **Verify**: Changes applied

**Setup:** Only 1 active SUPER_ADMIN

**Steps:**
1. Edit the only SUPER_ADMIN
2. Change role to ADMIN AND keep status ACTIVE
3. **Expected**: Error "At least one active Super Admin must remain in the system."

### L. API Direct Test

**Test server validation bypassing UI:**

```bash
# Try to create user with INACTIVE status (should be ignored, created as ACTIVE)
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Direct API User",
    "email": "api@example.com",
    "password": "password123",
    "roleId": "<role-id>",
    "status": "INACTIVE"
  }'

# Verify user created as ACTIVE
```

## Database Verification Queries

```sql
-- Count active SUPER_ADMIN
SELECT COUNT(*) 
FROM "User" u
JOIN "UserRole" ur ON u.id = ur."userId"
JOIN "Role" r ON ur."roleId" = r.id
WHERE r.name = 'SUPER_ADMIN'
  AND u.status = 'ACTIVE'
  AND (u."inactiveUntil" IS NULL OR u."inactiveUntil" <= CURRENT_DATE);

-- View all SUPER_ADMIN with effective status
SELECT u.name, u.email, u.status, u."inactiveFrom", u."inactiveUntil"
FROM "User" u
JOIN "UserRole" ur ON u.id = ur."userId"
JOIN "Role" r ON ur."roleId" = r.id
WHERE r.name = 'SUPER_ADMIN';
```

## Expected Behavior Summary

| Action | Single Active Admin | Multiple Active Admins |
|--------|---------------------|------------------------|
| Change admin role to non-admin | ❌ Rejected | ✅ Allowed |
| Deactivate admin | ❌ Rejected | ✅ Allowed |
| Delete admin | ❌ Rejected | ✅ Allowed |
| Add new user | ✅ Always ACTIVE | ✅ Always ACTIVE |
| Self-delete | ❌ Always rejected | ❌ Always rejected |
| Self-deactivate | ❌ Always rejected | ❌ Always rejected |

## Files Changed

1. `lib/super-admin-validator.ts` - New validator functions
2. `app/admin/users/actions.ts` - Added validation + transaction
3. `app/admin/users/components/AddUserDialog.tsx` - Removed status, fixed autocomplete

## Run Tests

```bash
# Type check
npx tsc --noEmit

# Start dev server (if not running)
npm run dev

# Open browser
http://localhost:3000
```
