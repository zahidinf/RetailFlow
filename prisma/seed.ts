import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding development data...");

  // 1. Seed base user
  const hashedPassword = await bcrypt.hash("SecureDevPassword123!", 10);
  const user = await prisma.user.upsert({
    where: { email: "farhan@example.com" },
    update: {},
    create: {
      firstName: "Farhan",
      lastName: "Hasanudin",
      email: "farhan@example.com",
      password: hashedPassword,
      status: "ACTIVE",
      mustChangePassword: false,
    },
  });
  console.log("Seeded user:", user.email);

  // 2. Seed Categories
  const categoriesData = [
    {
      name: "Electronics",
      description: "Electronic devices, accessories, and gadgets",
      status: "ACTIVE" as const,
    },
    {
      name: "Food & Beverage",
      description: "Packaged foods, beverages, and grocery items",
      status: "ACTIVE" as const,
    },
    {
      name: "Office Supplies",
      description: "Stationery, paper, desk accessories, and office tools",
      status: "ACTIVE" as const,
    },
  ];

  const categories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categories[cat.name] = created.id;
    console.log("Seeded category:", created.name);
  }

  // 3. Seed Products + Stock
  // Need samples with IN STOCK, LOW STOCK, and OUT OF STOCK
  const sampleProducts = [
    {
      sku: "ELEC-WLM-001",
      barcode: "899123456001",
      name: "Wireless Optical Mouse",
      categoryId: categories["Electronics"],
      costPrice: new Prisma.Decimal("75000.00"),
      sellingPrice: new Prisma.Decimal("125000.00"),
      unit: "PCS" as const,
      minimumStock: 10,
      currentStock: 45, // IN STOCK (> 10)
      status: "ACTIVE" as const,
    },
    {
      sku: "ELEC-USB-002",
      barcode: "899123456002",
      name: "USB-C Fast Charging Cable 1m",
      categoryId: categories["Electronics"],
      costPrice: new Prisma.Decimal("25000.00"),
      sellingPrice: new Prisma.Decimal("49000.00"),
      unit: "PCS" as const,
      minimumStock: 15,
      currentStock: 5, // LOW STOCK (> 0 and <= 15)
      status: "ACTIVE" as const,
    },
    {
      sku: "ELEC-KBD-003",
      barcode: "899123456003",
      name: "Mechanical Gaming Keyboard RGB",
      categoryId: categories["Electronics"],
      costPrice: new Prisma.Decimal("350000.00"),
      sellingPrice: new Prisma.Decimal("550000.00"),
      unit: "PCS" as const,
      minimumStock: 5,
      currentStock: 0, // OUT OF STOCK (<= 0)
      status: "ACTIVE" as const,
    },
    {
      sku: "FNB-COF-001",
      barcode: "899123456004",
      name: "Premium Arabica Roasted Coffee Beans 500g",
      categoryId: categories["Food & Beverage"],
      costPrice: new Prisma.Decimal("65000.00"),
      sellingPrice: new Prisma.Decimal("95000.00"),
      unit: "PACK" as const,
      minimumStock: 20,
      currentStock: 80, // IN STOCK
      status: "ACTIVE" as const,
    },
    {
      sku: "FNB-TEA-002",
      barcode: "899123456005",
      name: "Organic Green Tea Box 25 Bags",
      categoryId: categories["Food & Beverage"],
      costPrice: new Prisma.Decimal("18000.00"),
      sellingPrice: new Prisma.Decimal("30000.00"),
      unit: "BOX" as const,
      minimumStock: 10,
      currentStock: 8, // LOW STOCK
      status: "ACTIVE" as const,
    },
    {
      sku: "FNB-MILK-003",
      barcode: null,
      name: "Fresh Whole Milk 1L",
      categoryId: categories["Food & Beverage"],
      costPrice: new Prisma.Decimal("19000.00"),
      sellingPrice: new Prisma.Decimal("26000.00"),
      unit: "LITER" as const,
      minimumStock: 12,
      currentStock: 0, // OUT OF STOCK
      status: "ACTIVE" as const,
    },
    {
      sku: "OFC-PPR-001",
      barcode: "899123456007",
      name: "A4 Copy Paper 80gsm 500 Sheets",
      categoryId: categories["Office Supplies"],
      costPrice: new Prisma.Decimal("42000.00"),
      sellingPrice: new Prisma.Decimal("55000.00"),
      unit: "PACK" as const,
      minimumStock: 25,
      currentStock: 120, // IN STOCK
      status: "ACTIVE" as const,
    },
    {
      sku: "OFC-PEN-002",
      barcode: "899123456008",
      name: "Gel Ink Pen 0.5mm Black Pack of 12",
      categoryId: categories["Office Supplies"],
      costPrice: new Prisma.Decimal("30000.00"),
      sellingPrice: new Prisma.Decimal("45000.00"),
      unit: "BOX" as const,
      minimumStock: 10,
      currentStock: 3, // LOW STOCK
      status: "ACTIVE" as const,
    },
  ];

  for (const item of sampleProducts) {
    const { currentStock, ...productData } = item;

    const existingProduct = await prisma.product.findUnique({
      where: { sku: productData.sku },
    });

    if (!existingProduct) {
      const product = await prisma.product.create({
        data: productData,
      });

      await prisma.stock.create({
        data: {
          productId: product.id,
          currentStock,
        },
      });
      console.log(`Seeded product & stock: ${product.name} (Stock: ${currentStock})`);
    }
  }

  console.log("Development seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
