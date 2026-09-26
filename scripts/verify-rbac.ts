import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== RBAC Verification ===\n");

  // Get all users
  const users = await prisma.user.findMany({
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  console.log(`Found ${users.length} user(s)\n`);

  for (const user of users) {
    console.log(`📧 User: ${user.email}`);
    console.log(`👤 Name: ${user.firstName} ${user.lastName}`);
    console.log(`🆔 ID: ${user.id}`);
    
    if (user.userRoles.length === 0) {
      console.log(`⚠️  WARNING: No roles assigned!`);
    } else {
      console.log(`\n🎭 Roles:`);
      for (const userRole of user.userRoles) {
        console.log(`   - ${userRole.role.name}`);
        
        console.log(`\n   🔑 Permissions (${userRole.role.rolePermissions.length}):`);
        for (const rp of userRole.role.rolePermissions) {
          console.log(`      ✓ ${rp.permission.name}`);
        }
      }
    }
    
    console.log("\n" + "=".repeat(60) + "\n");
  }

  // Summary
  const roleCount = await prisma.role.count();
  const permissionCount = await prisma.permission.count();
  
  console.log("📊 Summary:");
  console.log(`   Total Users: ${users.length}`);
  console.log(`   Total Roles: ${roleCount}`);
  console.log(`   Total Permissions: ${permissionCount}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
