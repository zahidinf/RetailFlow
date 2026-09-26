import fs from "fs";
import path from "path";
import assert from "assert";

const POS_DIR = path.resolve(__dirname, "../app/pos");

const FORBIDDEN_WORDS = [
  "Nota",
  "Keranjang",
  "Pesanan",
  "Pembayaran",
  "Jumlah Dibayar",
  "Kembalian",
  "Harga Jual",
  "Harga Sebelum",
  "Cetak Nota",
  "Tutup",
  "Selesaikan",
  "Stok Tidak",
  "Produk Tidak",
  "Uang Pas",
  "Tunai",
  "Pajak",
  "Diskon",
  "Batal",
  "Simpan",
  "Cari",
  "Pilih",
  "Tambah",
  "Kurang",
  "Berhasil",
  "Gagal",
  "Tidak ditemukan",
  "Tidak cukup",
  "Termasuk",
  "Memproses",
];

const REQUIRED_TERMS = [
  "Cart",
  "Clear Cart",
  "Your cart is empty",
  "Subtotal",
  "Price Before Tax",
  "PPN 11% (Included)",
  "Grand Total",
  "Payment Method",
  "Payment Received",
  "Change",
  "Exact Amount",
  "Complete Sale & Checkout",
  "Receipt",
  "Print Receipt",
  "Close",
  "Thank you for your purchase!",
  "Sale completed successfully",
  "Insufficient Payment",
  "Processing Sale...",
];

function checkFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      checkFiles(fullPath, fileList);
    } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

console.log("=================================================");
console.log("VERIFYING POS MODULE ENGLISH LANGUAGE AUDIT");
console.log("=================================================\n");

const posFiles = checkFiles(POS_DIR);
console.log(`Auditing ${posFiles.length} POS files...`);

let hasError = false;

for (const file of posFiles) {
  const relPath = path.relative(path.resolve(__dirname, ".."), file);
  const content = fs.readFileSync(file, "utf8");

  for (const forbidden of FORBIDDEN_WORDS) {
    const regex = new RegExp(`\\b${forbidden}\\b`, "i");
    if (regex.test(content)) {
      console.error(`  ✗ [${relPath}] contains forbidden non-English term: "${forbidden}"`);
      hasError = true;
    }
  }
}

if (!hasError) {
  console.log("  ✓ PASS: No forbidden Indonesian words found in POS files.");
}

// Check required standard terms exist across POS components
const combinedContent = posFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

for (const term of REQUIRED_TERMS) {
  if (combinedContent.includes(term)) {
    console.log(`  ✓ Found standardized term: "${term}"`);
  } else {
    console.error(`  ✗ Missing standard English term: "${term}"`);
    hasError = true;
  }
}

assert(!hasError, "Language standardization audit failed!");

console.log("\n=================================================");
console.log("ALL POS ENGLISH LANGUAGE AUDIT CHECKS PASSED!");
console.log("=================================================");
