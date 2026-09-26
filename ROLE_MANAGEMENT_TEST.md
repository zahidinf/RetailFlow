# Role Management - Manual Test Guide

## Setup
1. Run seed: `npx tsx prisma/seed-rbac.ts`
2. Start dev server: `npm run dev`
3. Login with admin@example.com / admin123
4. Navigate to Administration → Role Management

## Test Scenarios

### A. Access Control
- [ ] SUPER_ADMIN user can access /admin/roles
- [ ] Non-SUPER_ADMIN redirected to /
- [ ] Role Management menu visible only for SUPER_ADMIN in AdminMenu

### B. Role List
- [ ] All roles displayed in table
- [ ] Columns: Role Name, Description, Users, Actions
- [ ] User count shows actual count from database
- [ ] SUPER_ADMIN shows 1 user (self)

### C. Add Role
- [ ] Click "+ Add Role" button opens modal
- [ ] Form has: Role Name (required), Description (optional)
- [ ] Required field validation works
- [ ] Whitespace-only name rejected
- [ ] Duplicate role name rejected with error
- [ ] Leading/trailing whitespace trimmed
- [ ] New role added to table after success
- [ ] Modal closes on success

### D. Edit Role
- [ ] Click Edit button opens modal with current values
- [ ] Can change role name
- [ ] Can change description
- [ ] Duplicate name (excluding self) rejected
- [ ] Changes saved and reflected in table
- [ ] Modal closes on success

### E. Delete - Users Assigned
- [ ] Click Delete on role with users shows warning
- [ ] Message: "This role is currently assigned to X user(s)"
- [ ] Delete button disabled/unavailable
- [ ] Can close modal

### F. Delete - No Users
- [ ] Click Delete on role with 0 users shows confirmation
- [ ] Message: "Are you sure you want to delete this role?"
- [ ] Warning: "This action cannot be undone"
- [ ] Confirm delete removes role from table
- [ ] Modal closes on success

### G. SUPER_ADMIN Protection
- [ ] SUPER_ADMIN role cannot be deleted
- [ ] Attempting delete shows: "The SUPER_ADMIN role cannot be deleted"
- [ ] SUPER_ADMIN can still be edited

### H. Error Handling
- [ ] Network errors show user-friendly message
- [ ] Server validation errors displayed in modal
- [ ] No raw error messages exposed

### I. UI/UX
- [ ] Modal is responsive (works on mobile)
- [ ] Loading state shows during submit
- [ ] Double submit prevented (button disabled)
- [ ] Can close modal with X button
- [ ] Can close modal with Cancel button

## Database Verification

```sql
-- Check ROLE_MANAGE permission exists
SELECT * FROM "Permission" WHERE name = 'ROLE_MANAGE';

-- Check SUPER_ADMIN has ROLE_MANAGE
SELECT rp.* FROM "RolePermission" rp
JOIN "Role" r ON rp."roleId" = r.id
JOIN "Permission" p ON rp."permissionId" = p.id
WHERE r.name = 'SUPER_ADMIN' AND p.name = 'ROLE_MANAGE';

-- Check role with users
SELECT r.name, COUNT(ur.id) as user_count
FROM "Role" r
LEFT JOIN "UserRole" ur ON r.id = ur."roleId"
GROUP BY r.id, r.name;
```

## Files Created/Modified

### Created
- `app/admin/roles/actions.ts` - Server actions (create, update, delete, getRoles)
- `app/admin/roles/components/AddRoleDialog.tsx` - Add role modal
- `app/admin/roles/components/EditRoleDialog.tsx` - Edit role modal
- `app/admin/roles/components/DeleteRoleDialog.tsx` - Delete role confirmation
- `app/admin/roles/components/RoleTable.tsx` - Role list table

### Modified
- `app/admin/roles/page.tsx` - Main page with authorization check
- `app/components/AdminMenu.tsx` - Conditional Role Management visibility
- `prisma/seed-rbac.ts` - Added ROLE_MANAGE permission

## Important Notes

- ROLE_MANAGE permission controls access to Role Management
- SUPER_ADMIN role auto-assigned all permissions including ROLE_MANAGE
- Role name validation is case-insensitive (no ADMIN + admin duplicate)
- SUPER_ADMIN role protected from deletion
- Roles with assigned users cannot be deleted
- All mutations validated server-side, not client-side only
