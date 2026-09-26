import { prisma } from "../lib/prisma";
import { ProductUnit, ProductStatus } from "@prisma/client";

interface ProductSeedItem {
  name: string;
  sku: string;
  barcode: string;
  categoryGroup: "Beverages" | "Instant Food & Noodles" | "Snacks" | "Personal Care" | "Household" | "Electronics & Accessories" | "Stationery" | "Baby & Kids" | "Beauty" | "Pet Supplies";
  costPrice: number;
  sellingPrice: number;
  unit: ProductUnit;
  minimumStock: number;
  initialStock: number;
}

const PRODUCTS_50: ProductSeedItem[] = [
  // 1. Beverages — 5 (Category: Food & Beverage)
  {
    name: "Aqua Mineral Water 600ml",
    sku: "BEV-AQU-600",
    barcode: "8992752010015",
    categoryGroup: "Beverages",
    costPrice: 2500,
    sellingPrice: 3500,
    unit: "BOTTLE",
    minimumStock: 20,
    initialStock: 120,
  },
  {
    name: "Coca-Cola Original Taste 390ml",
    sku: "BEV-COK-390",
    barcode: "8992761136010",
    categoryGroup: "Beverages",
    costPrice: 4200,
    sellingPrice: 5500,
    unit: "BOTTLE",
    minimumStock: 15,
    initialStock: 85,
  },
  {
    name: "Teh Botol Sosro Original 450ml",
    sku: "BEV-TBS-450",
    barcode: "8992775210010",
    categoryGroup: "Beverages",
    costPrice: 5000,
    sellingPrice: 6500,
    unit: "BOTTLE",
    minimumStock: 15,
    initialStock: 60,
  },
  {
    name: "Sprite 390ml",
    sku: "BEV-SPR-390",
    barcode: "8992761136027",
    categoryGroup: "Beverages",
    costPrice: 4200,
    sellingPrice: 5500,
    unit: "BOTTLE",
    minimumStock: 15,
    initialStock: 40,
  },
  {
    name: "Good Day Cappuccino 250ml",
    sku: "BEV-GDC-250",
    barcode: "8991002105018",
    categoryGroup: "Beverages",
    costPrice: 5500,
    sellingPrice: 7500,
    unit: "BOTTLE",
    minimumStock: 10,
    initialStock: 8, // Low stock
  },

  // 2. Instant Food & Noodles — 5 (Category: Food & Beverage)
  {
    name: "Indomie Mi Goreng 85g",
    sku: "FOD-IND-MG85",
    barcode: "89686010145",
    categoryGroup: "Instant Food & Noodles",
    costPrice: 2600,
    sellingPrice: 3500,
    unit: "PACK",
    minimumStock: 30,
    initialStock: 150,
  },
  {
    name: "Indomie Soto Mie 75g",
    sku: "FOD-IND-SM75",
    barcode: "89686010152",
    categoryGroup: "Instant Food & Noodles",
    costPrice: 2400,
    sellingPrice: 3200,
    unit: "PACK",
    minimumStock: 25,
    initialStock: 90,
  },
  {
    name: "Indomie Ayam Bawang 69g",
    sku: "FOD-IND-AB69",
    barcode: "89686010169",
    categoryGroup: "Instant Food & Noodles",
    costPrice: 2400,
    sellingPrice: 3200,
    unit: "PACK",
    minimumStock: 25,
    initialStock: 70,
  },
  {
    name: "Pop Mie Mi Goreng Pedas 80g",
    sku: "FOD-POP-MGP80",
    barcode: "89686010213",
    categoryGroup: "Instant Food & Noodles",
    costPrice: 4000,
    sellingPrice: 5500,
    unit: "PACK",
    minimumStock: 15,
    initialStock: 35,
  },
  {
    name: "Mie Sedaap Goreng 90g",
    sku: "FOD-SED-GR90",
    barcode: "8998866200234",
    categoryGroup: "Instant Food & Noodles",
    costPrice: 2500,
    sellingPrice: 3400,
    unit: "PACK",
    minimumStock: 25,
    initialStock: 12, // Low stock
  },

  // 3. Snacks — 5 (Category: Food & Beverage)
  {
    name: "Oreo Original Sandwich Cookies 119.6g",
    sku: "SNK-OREO-120",
    barcode: "8992760221014",
    categoryGroup: "Snacks",
    costPrice: 7500,
    sellingPrice: 9900,
    unit: "PACK",
    minimumStock: 15,
    initialStock: 45,
  },
  {
    name: "Chitato Beef Barbeque 68g",
    sku: "SNK-CHT-BBQ68",
    barcode: "89686041019",
    categoryGroup: "Snacks",
    costPrice: 9000,
    sellingPrice: 11500,
    unit: "PACK",
    minimumStock: 15,
    initialStock: 30,
  },
  {
    name: "SilverQueen Almond 65g",
    sku: "SNK-SQN-ALM65",
    barcode: "8991001101233",
    categoryGroup: "Snacks",
    costPrice: 13500,
    sellingPrice: 17500,
    unit: "PACK",
    minimumStock: 10,
    initialStock: 22,
  },
  {
    name: "Roma Kelapa 300g",
    sku: "SNK-ROM-KLP300",
    barcode: "8992770211010",
    categoryGroup: "Snacks",
    costPrice: 8500,
    sellingPrice: 11000,
    unit: "PACK",
    minimumStock: 15,
    initialStock: 55,
  },
  {
    name: "Pringles Original 107g",
    sku: "SNK-PRG-ORG107",
    barcode: "8886467100017",
    categoryGroup: "Snacks",
    costPrice: 22000,
    sellingPrice: 27500,
    unit: "PACK",
    minimumStock: 10,
    initialStock: 7, // Low stock
  },

  // 4. Personal Care — 5 (Category: Personal Care)
  {
    name: "Lifebuoy Total 10 Body Wash 450ml",
    sku: "PC-LIF-450",
    barcode: "8999999052014",
    categoryGroup: "Personal Care",
    costPrice: 21000,
    sellingPrice: 26500,
    unit: "BOTTLE",
    minimumStock: 10,
    initialStock: 40,
  },
  {
    name: "Pantene Total Damage Care Shampoo 290ml",
    sku: "PC-PAN-290",
    barcode: "4902430752011",
    categoryGroup: "Personal Care",
    costPrice: 33000,
    sellingPrice: 41000,
    unit: "BOTTLE",
    minimumStock: 8,
    initialStock: 25,
  },
  {
    name: "Pepsodent Herbal 190g",
    sku: "PC-PEP-190",
    barcode: "8999999053011",
    categoryGroup: "Personal Care",
    costPrice: 14000,
    sellingPrice: 18000,
    unit: "PACK",
    minimumStock: 12,
    initialStock: 50,
  },
  {
    name: "Sunsilk Hijab Recharge Shampoo 170ml",
    sku: "PC-SUN-170",
    barcode: "8999999054018",
    categoryGroup: "Personal Care",
    costPrice: 18000,
    sellingPrice: 23000,
    unit: "BOTTLE",
    minimumStock: 10,
    initialStock: 28,
  },
  {
    name: "Dove Beauty Bar 100g",
    sku: "PC-DOV-100",
    barcode: "8999999055015",
    categoryGroup: "Personal Care",
    costPrice: 7500,
    sellingPrice: 10500,
    unit: "PCS",
    minimumStock: 15,
    initialStock: 6, // Low stock
  },

  // 5. Household — 5 (Category: Household)
  {
    name: "Rinso Anti Noda 770g",
    sku: "HOU-RNS-770",
    barcode: "8999999056012",
    categoryGroup: "Household",
    costPrice: 18500,
    sellingPrice: 23500,
    unit: "PACK",
    minimumStock: 15,
    initialStock: 65,
  },
  {
    name: "Sunlight Jeruk Nipis 755ml",
    sku: "HOU-SNL-755",
    barcode: "8999999057019",
    categoryGroup: "Household",
    costPrice: 13000,
    sellingPrice: 16500,
    unit: "BOTTLE",
    minimumStock: 15,
    initialStock: 75,
  },
  {
    name: "Molto Pewangi 900ml",
    sku: "HOU-MLT-900",
    barcode: "8999999058016",
    categoryGroup: "Household",
    costPrice: 12500,
    sellingPrice: 16000,
    unit: "PACK",
    minimumStock: 15,
    initialStock: 48,
  },
  {
    name: "Baygon Lavender 600ml",
    sku: "HOU-BYG-600",
    barcode: "8992745120011",
    categoryGroup: "Household",
    costPrice: 32000,
    sellingPrice: 39500,
    unit: "BOTTLE",
    minimumStock: 10,
    initialStock: 30,
  },
  {
    name: "Vixal Porselen 500ml",
    sku: "HOU-VIX-500",
    barcode: "8999999059013",
    categoryGroup: "Household",
    costPrice: 13500,
    sellingPrice: 17500,
    unit: "BOTTLE",
    minimumStock: 10,
    initialStock: 9, // Low stock
  },

  // 6. Electronics & Accessories — 5 (Category: Electronics)
  {
    name: "Philips LED Bulb 9W",
    sku: "ELE-PHI-LED9",
    barcode: "8718696701011",
    categoryGroup: "Electronics & Accessories",
    costPrice: 32000,
    sellingPrice: 42000,
    unit: "PCS",
    minimumStock: 10,
    initialStock: 18,
  },
  {
    name: "Energizer AA Batteries 2pcs",
    sku: "ELE-ENG-AA2",
    barcode: "8888021200112",
    categoryGroup: "Electronics & Accessories",
    costPrice: 18000,
    sellingPrice: 24000,
    unit: "PACK",
    minimumStock: 15,
    initialStock: 42,
  },
  {
    name: "Panasonic AA Batteries 2pcs",
    sku: "ELE-PAN-AA2",
    barcode: "8887012200113",
    categoryGroup: "Electronics & Accessories",
    costPrice: 11000,
    sellingPrice: 15000,
    unit: "PACK",
    minimumStock: 15,
    initialStock: 38,
  },
  {
    name: "Logitech M185 Wireless Mouse",
    sku: "ELE-LOG-M185",
    barcode: "097855070014",
    categoryGroup: "Electronics & Accessories",
    costPrice: 125000,
    sellingPrice: 155000,
    unit: "PCS",
    minimumStock: 5,
    initialStock: 12,
  },
  {
    name: "Krisbow USB Type-C Cable",
    sku: "ELE-KRB-USBC",
    barcode: "8993215200111",
    categoryGroup: "Electronics & Accessories",
    costPrice: 28000,
    sellingPrice: 39000,
    unit: "PCS",
    minimumStock: 8,
    initialStock: 5, // Low stock
  },

  // 7. Stationery — 5 (Category: Office Supplies)
  {
    name: "Pilot G-2 Ballpoint Pen",
    sku: "STA-PIL-G2",
    barcode: "4902505160012",
    categoryGroup: "Stationery",
    costPrice: 15000,
    sellingPrice: 19500,
    unit: "PCS",
    minimumStock: 15,
    initialStock: 55,
  },
  {
    name: "Faber-Castell 2B Pencil",
    sku: "STA-FBC-2B",
    barcode: "8992750100112",
    categoryGroup: "Stationery",
    costPrice: 3500,
    sellingPrice: 5000,
    unit: "PCS",
    minimumStock: 25,
    initialStock: 110,
  },
  {
    name: "Joyko Correction Tape",
    sku: "STA-JYK-CT",
    barcode: "8993988200114",
    categoryGroup: "Stationery",
    costPrice: 5500,
    sellingPrice: 8000,
    unit: "PCS",
    minimumStock: 15,
    initialStock: 44,
  },
  {
    name: "Bantex A4 Document Folder",
    sku: "STA-BNT-A4",
    barcode: "8992751100113",
    categoryGroup: "Stationery",
    costPrice: 18000,
    sellingPrice: 24500,
    unit: "PCS",
    minimumStock: 10,
    initialStock: 26,
  },
  {
    name: "3M Post-it Notes 3x3",
    sku: "STA-3M-POST3",
    barcode: "051131620011",
    categoryGroup: "Stationery",
    costPrice: 12000,
    sellingPrice: 16500,
    unit: "PACK",
    minimumStock: 10,
    initialStock: 8, // Low stock
  },

  // 8. Baby & Kids — 5 (Category: Baby & Kids)
  {
    name: "Zwitsal Baby Shampoo 100ml",
    sku: "BAB-ZWT-100",
    barcode: "8999999060019",
    categoryGroup: "Baby & Kids",
    costPrice: 14000,
    sellingPrice: 18500,
    unit: "BOTTLE",
    minimumStock: 10,
    initialStock: 35,
  },
  {
    name: "Sweety Gold Pants M",
    sku: "BAB-SWT-GLDM",
    barcode: "8993189200115",
    categoryGroup: "Baby & Kids",
    costPrice: 68000,
    sellingPrice: 82000,
    unit: "PACK",
    minimumStock: 8,
    initialStock: 20,
  },
  {
    name: "MamyPoko Pants XL",
    sku: "BAB-MAM-PNTXL",
    barcode: "8992772100114",
    categoryGroup: "Baby & Kids",
    costPrice: 72000,
    sellingPrice: 87000,
    unit: "PACK",
    minimumStock: 8,
    initialStock: 18,
  },
  {
    name: "Cussons Baby Cologne 100ml",
    sku: "BAB-CUS-COL100",
    barcode: "8992781200113",
    categoryGroup: "Baby & Kids",
    costPrice: 16000,
    sellingPrice: 21000,
    unit: "BOTTLE",
    minimumStock: 10,
    initialStock: 24,
  },
  {
    name: "Johnson's Baby Powder 200g",
    sku: "BAB-JHN-PWD200",
    barcode: "8992790200112",
    categoryGroup: "Baby & Kids",
    costPrice: 13000,
    sellingPrice: 17500,
    unit: "BOTTLE",
    minimumStock: 10,
    initialStock: 6, // Low stock
  },

  // 9. Beauty — 5 (Category: Beauty)
  {
    name: "Wardah Lightening Micellar Water 100ml",
    sku: "BTY-WRD-MIC100",
    barcode: "8993137200114",
    categoryGroup: "Beauty",
    costPrice: 24000,
    sellingPrice: 31000,
    unit: "BOTTLE",
    minimumStock: 10,
    initialStock: 8, // Low stock
  },
  {
    name: "Emina Bright Stuff Face Wash 50ml",
    sku: "BTY-EMN-FW50",
    barcode: "8993137200121",
    categoryGroup: "Beauty",
    costPrice: 13500,
    sellingPrice: 17500,
    unit: "PACK",
    minimumStock: 12,
    initialStock: 32,
  },
  {
    name: "Nivea Sun Protect & Moisture SPF50 50ml",
    sku: "BTY-NIV-SUN50",
    barcode: "4005808200118",
    categoryGroup: "Beauty",
    costPrice: 48000,
    sellingPrice: 62000,
    unit: "BOTTLE",
    minimumStock: 6,
    initialStock: 15,
  },
  {
    name: "Garnier Micellar Cleansing Water 125ml",
    sku: "BTY-GAR-MIC125",
    barcode: "8992304010115",
    categoryGroup: "Beauty",
    costPrice: 29000,
    sellingPrice: 37500,
    unit: "BOTTLE",
    minimumStock: 8,
    initialStock: 22,
  },
  {
    name: "POND'S Bright Beauty Serum 20ml",
    sku: "BTY-PND-SER20",
    barcode: "8999999061016",
    categoryGroup: "Beauty",
    costPrice: 38000,
    sellingPrice: 49000,
    unit: "BOTTLE",
    minimumStock: 6,
    initialStock: 14,
  },

  // 10. Pet Supplies — 5 (Category: Pet Supplies)
  {
    name: "Whiskas Tuna 80g",
    sku: "PET-WHK-TUN80",
    barcode: "8853301200112",
    categoryGroup: "Pet Supplies",
    costPrice: 6000,
    sellingPrice: 8000,
    unit: "PACK",
    minimumStock: 20,
    initialStock: 25,
  },
  {
    name: "Me-O Tuna 400g",
    sku: "PET-MEO-TUN400",
    barcode: "8851301200113",
    categoryGroup: "Pet Supplies",
    costPrice: 24000,
    sellingPrice: 31000,
    unit: "PACK",
    minimumStock: 10,
    initialStock: 36,
  },
  {
    name: "Pedigree Adult Dog Food 400g",
    sku: "PET-PDG-DOG400",
    barcode: "8852301200114",
    categoryGroup: "Pet Supplies",
    costPrice: 26000,
    sellingPrice: 34000,
    unit: "PACK",
    minimumStock: 8,
    initialStock: 16,
  },
  {
    name: "Cat Choize Cat Food 800g",
    sku: "PET-CCZ-CAT800",
    barcode: "8993218200116",
    categoryGroup: "Pet Supplies",
    costPrice: 22000,
    sellingPrice: 28500,
    unit: "PACK",
    minimumStock: 10,
    initialStock: 42,
  },
  {
    name: "Vitakraft Cat Treats",
    sku: "PET-VTK-TRT",
    barcode: "4008239200117",
    categoryGroup: "Pet Supplies",
    costPrice: 18000,
    sellingPrice: 23500,
    unit: "PACK",
    minimumStock: 10,
    initialStock: 4, // Low stock
  },
];

async function seedProducts() {
  console.log("=== Seeding 50 Real-World Retail Products ===");

  // 1. Resolve Categories:
  // Reused: Food & Beverage, Electronics, Office Supplies
  // Created: Personal Care, Household, Baby & Kids, Beauty, Pet Supplies
  const categoryMapping: Record<string, string> = {
    Beverages: "Food & Beverage",
    "Instant Food & Noodles": "Food & Beverage",
    Snacks: "Food & Beverage",
    "Personal Care": "Personal Care",
    Household: "Household",
    "Electronics & Accessories": "Electronics",
    Stationery: "Office Supplies",
    "Baby & Kids": "Baby & Kids",
    Beauty: "Beauty",
    "Pet Supplies": "Pet Supplies",
  };

  const newCategoriesToCreate = [
    { name: "Personal Care", description: "Body wash, shampoo, oral care, and personal hygiene" },
    { name: "Household", description: "Laundry detergent, cleaners, and household supplies" },
    { name: "Baby & Kids", description: "Diapers, baby toiletries, and infant care" },
    { name: "Beauty", description: "Skincare, facial cleansers, serums, and cosmetics" },
    { name: "Pet Supplies", description: "Cat and dog food, treats, and pet care" },
  ];

  console.log("\nEnsuring categories exist...");
  for (const cat of newCategoriesToCreate) {
    const existing = await prisma.category.findUnique({ where: { name: cat.name } });
    if (!existing) {
      const created = await prisma.category.create({
        data: {
          name: cat.name,
          description: cat.description,
          status: "ACTIVE",
        },
      });
      console.log(`  + Created category: "${created.name}"`);
    } else {
      console.log(`  = Category already exists: "${existing.name}"`);
    }
  }

  // Load all categories into lookup map
  const allCategories = await prisma.category.findMany();
  const categoryIdMap = new Map<string, string>();
  for (const c of allCategories) {
    categoryIdMap.set(c.name, c.id);
  }

  console.log("\nCategories in system:", Array.from(categoryIdMap.keys()).join(", "));

  // 2. Insert 50 Products and their Stock
  console.log(`\nInserting/Updating ${PRODUCTS_50.length} products...`);
  let createdCount = 0;
  let updatedCount = 0;

  for (const item of PRODUCTS_50) {
    const targetCategoryName = categoryMapping[item.categoryGroup];
    const categoryId = categoryIdMap.get(targetCategoryName);
    if (!categoryId) {
      throw new Error(`Category not found for name: ${targetCategoryName}`);
    }

    const existingProduct = await prisma.product.findUnique({
      where: { sku: item.sku },
      include: { stock: true },
    });

    if (existingProduct) {
      // Update product if needed, do not duplicate
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          name: item.name,
          barcode: item.barcode,
          categoryId,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          unit: item.unit,
          minimumStock: item.minimumStock,
          status: ProductStatus.ACTIVE,
        },
      });

      // Update or create stock
      if (existingProduct.stock) {
        await prisma.stock.update({
          where: { id: existingProduct.stock.id },
          data: { currentStock: item.initialStock },
        });
      } else {
        await prisma.stock.create({
          data: {
            productId: existingProduct.id,
            currentStock: item.initialStock,
          },
        });
      }
      updatedCount++;
    } else {
      // Create new product + stock in transaction
      await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            sku: item.sku,
            barcode: item.barcode,
            name: item.name,
            categoryId,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            unit: item.unit,
            minimumStock: item.minimumStock,
            status: ProductStatus.ACTIVE,
            image: null,
          },
        });

        await tx.stock.create({
          data: {
            productId: product.id,
            currentStock: item.initialStock,
          },
        });
      });
      createdCount++;
    }
  }

  console.log(`\nFinished inserting products: ${createdCount} created, ${updatedCount} updated.`);

  const totalProducts = await prisma.product.count();
  console.log(`Total products now in database: ${totalProducts}`);
}

seedProducts()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
