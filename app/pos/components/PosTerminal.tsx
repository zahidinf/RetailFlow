"use client";

import { useState } from "react";
import { createSaleAction } from "@/app/actions/sales-actions";
import { useRouter } from "next/navigation";
import ProductImage from "@/app/components/ProductImage";
import ReceiptModal, { ReceiptSale } from "./ReceiptModal";
import { calculateReverseTax, formatRupiah } from "@/lib/tax-utils";

export interface PosProduct {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  sellingPrice: number;
  unit: string;
  categoryName: string;
  currentStock: number;
  image?: string | null;
}

interface CartItem {
  product: PosProduct;
  quantity: number;
}

export default function PosTerminal({ products }: { products: PosProduct[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<any | null>(null);
  const [paymentInput, setPaymentInput] = useState<string>("");
  const [receiptModalSale, setReceiptModalSale] = useState<ReceiptSale | null>(null);

  const ITEMS_PER_PAGE = 9;

  const categories = Array.from(new Set(products.map((p) => p.categoryName))).sort();

  const filteredProducts = products.filter((p) => {
    const matchesCategory = !selectedCategory || p.categoryName === selectedCategory;
    if (!matchesCategory) return false;

    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    return (
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      (p.barcode && p.barcode.toLowerCase().includes(term)) ||
      p.categoryName.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const addToCart = (product: PosProduct) => {
    setError(null);
    setLastSale(null);

    if (product.currentStock <= 0) {
      setError(`Cannot add "${product.name}": Out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          setError(
            `Insufficient stock for "${product.name}". Max available: ${product.currentStock} ${product.unit}.`
          );
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, newQty: number) => {
    setError(null);
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (product && newQty > product.currentStock) {
      setError(
        `Insufficient stock (${product.currentStock} ${product.unit}) for ${product.name}.`
      );
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setError(null);
    setPaymentInput("");
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const { preTaxAmount, taxAmount } = calculateReverseTax(cartTotal);

  const isCash = paymentMethod === "CASH";
  const effectivePaymentReceived = isCash
    ? (Number(paymentInput.replace(/\D/g, "")) || 0)
    : cartTotal;
  const change = isCash
    ? Math.max(0, effectivePaymentReceived - cartTotal)
    : 0;
  const isPaymentSufficient = cartTotal > 0 && effectivePaymentReceived >= cartTotal;

  const handlePaymentChange = (val: string) => {
    const raw = val.replace(/\D/g, "");
    if (!raw) {
      setPaymentInput("");
      return;
    }
    const num = Number(raw);
    setPaymentInput(num.toLocaleString("id-ID"));
  };

  const setExactPayment = () => {
    if (cartTotal > 0) {
      setPaymentInput(cartTotal.toLocaleString("id-ID"));
    }
  };

  const handlePaymentMethodChange = (newMethod: string) => {
    setPaymentMethod(newMethod);
    if (newMethod !== "CASH" && cartTotal > 0) {
      setPaymentInput(cartTotal.toLocaleString("id-ID"));
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError("Cart is empty.");
      return;
    }

    if (isCash && (!paymentInput || effectivePaymentReceived <= 0)) {
      setError("Please enter a valid payment amount.");
      return;
    }

    if (effectivePaymentReceived < cartTotal) {
      setError("Insufficient payment. Please enter an amount equal to or greater than the total.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await createSaleAction({
      items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      paymentMethod,
      paymentReceived: effectivePaymentReceived,
      change,
    });

    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.sale) {
      setLastSale(res.sale);
      setReceiptModalSale(res.sale);
      setCart([]);
      setPaymentInput("");
      router.refresh();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Products Column */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Search and Category Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search products by name, SKU, barcode, category..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            />
            <svg
              className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-3 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="sm:w-52">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Cards Grid or Empty State */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
            <svg
              className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-sm font-medium">No products found</p>
            <p className="text-xs mt-1">Try adjusting your search terms or category filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedProducts.map((p) => {
              const isOutOfStock = p.currentStock <= 0;
              const inCartItem = cart.find((i) => i.product.id === p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  className={`group bg-white dark:bg-slate-900 p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                    isOutOfStock
                      ? "opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-800"
                      : "cursor-pointer border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md"
                  }`}
                >
                  <div>
                    {/* Product Image */}
                    <div className="relative w-full h-36 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-800 mb-3 shrink-0">
                      <ProductImage
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-md shadow-sm">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-1">
                      <span>{p.categoryName}</span>
                      <span className="font-mono">{p.sku}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 mb-2">
                      {p.name}
                    </h3>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 block">Price</span>
                      <span className="font-bold text-slate-900 dark:text-white text-base">
                        Rp {p.sellingPrice.toLocaleString("id-ID")}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isOutOfStock
                            ? "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400"
                            : p.currentStock <= 10
                            ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                            : "bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-400"
                        }`}
                      >
                        {isOutOfStock ? "Out of Stock" : `${p.currentStock} ${p.unit}`}
                      </span>
                      {inCartItem && (
                        <span className="block text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
                          In Cart: {inCartItem.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of{" "}
              {filteredProducts.length} products
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-8 h-8 px-2 text-xs font-semibold rounded-lg border transition-colors ${
                      currentPage === page
                        ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cart & Checkout Column */}
      <div className="lg:col-span-5 xl:col-span-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-[calc(100vh-12rem)] sticky top-20">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h2 className="font-semibold text-slate-900 dark:text-white">Cart</h2>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Error / Success Notifications */}
          {error && (
            <div className="m-3 p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {lastSale && (
            <div className="m-3 p-3 bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800 rounded-lg text-xs text-green-700 dark:text-green-300 flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Sale completed successfully!
                </div>
                <p>Receipt Number: <strong className="font-mono">{lastSale.saleNumber}</strong></p>
                <p>Total: <strong>Rp {Number(lastSale.totalAmount).toLocaleString("id-ID")}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalSale(lastSale)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-md bg-green-600 hover:bg-green-700 text-white shadow-xs transition-colors shrink-0"
              >
                Print Receipt
              </button>
            </div>
          )}

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500 py-12">
                <svg className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-sm font-medium">Your cart is empty</p>
                <p className="text-xs mt-1">Click product cards on the left to add items</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-800 gap-3"
                >
                  {/* Cart Item Thumbnail */}
                  <div className="w-11 h-11 rounded-md overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
                    <ProductImage
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Rp {item.product.sellingPrice.toLocaleString("id-ID")} / {item.product.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="px-2 py-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm"
                      >
                        -
                      </button>
                      <span className="px-2 py-0.5 text-xs font-semibold text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="px-2 py-0.5 text-slate-500 hover:text-slate-900 dark:hover:text-white text-sm"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Rp {(item.product.sellingPrice * item.quantity).toLocaleString("id-ID")}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 space-y-3">
            {/* Grand Total */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 dark:text-white">Grand Total</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {formatRupiah(cartTotal)}
              </span>
            </div>

            {/* Payment Method Selector */}
            <div className="pt-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none"
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="QRIS">QRIS / E-Wallet</option>
              </select>
            </div>

            {/* Payment Received Input & Quick Buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Payment Received
                </label>
                {isCash && cartTotal > 0 && (
                  <button
                    type="button"
                    onClick={setExactPayment}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Exact Amount
                  </button>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-semibold text-slate-400 dark:text-slate-500">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={isCash ? paymentInput : cartTotal > 0 ? cartTotal.toLocaleString("id-ID") : ""}
                  onChange={(e) => isCash && handlePaymentChange(e.target.value)}
                  disabled={!isCash || cart.length === 0 || isLoading}
                  className="w-full pl-10 pr-8 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 font-semibold border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                />
                {isCash && paymentInput && (
                  <button
                    type="button"
                    onClick={() => setPaymentInput("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Fast Cash Quick Buttons (Cash only) */}
              {isCash && cartTotal > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={setExactPayment}
                    className="px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Exact Amount
                  </button>
                  {[50000, 100000, 200000, 500000]
                    .filter((amount) => amount >= cartTotal || amount === 100000 || amount === 50000)
                    .slice(0, 3)
                    .map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setPaymentInput(amount.toLocaleString("id-ID"))}
                        className="px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        {formatRupiah(amount)}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Change or Insufficient Indicator */}
            {cart.length > 0 && (isCash ? paymentInput !== "" : true) && (
              <div
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between font-medium ${
                  effectivePaymentReceived < cartTotal
                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400"
                    : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                <span>
                  {effectivePaymentReceived < cartTotal
                    ? "Insufficient Payment"
                    : "Change"}
                </span>
                <span className="font-bold text-sm">
                  {effectivePaymentReceived < cartTotal
                    ? formatRupiah(cartTotal - effectivePaymentReceived)
                    : formatRupiah(change)}
                </span>
              </div>
            )}

            {/* Complete Sale & Checkout Button */}
            <button
              type="button"
              disabled={cart.length === 0 || !isPaymentSufficient || isLoading}
              onClick={handleCheckout}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing Sale...
                </>
              ) : (
                "Complete Sale & Checkout"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {receiptModalSale && (
        <ReceiptModal
          sale={receiptModalSale}
          onClose={() => setReceiptModalSale(null)}
        />
      )}
    </div>
  );
}
