"use client";

import { useState, useMemo } from "react";
import { createSaleAction } from "@/app/actions/sales-actions";
import { useRouter } from "next/navigation";
import ProductImage from "@/app/components/ProductImage";
import ReceiptModal, { ReceiptSale } from "./ReceiptModal";
import PosCheckoutModal, { CartItem } from "./PosCheckoutModal";
import { formatRupiah } from "@/lib/tax-utils";
import { evaluateCartPromotions, PromotionRule } from "@/lib/promotions-engine";

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

export default function PosTerminal({
  products,
  initialPromotions = [],
}: {
  products: PosProduct[];
  initialPromotions?: PromotionRule[];
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promotions] = useState<PromotionRule[]>(initialPromotions);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptModalSale, setReceiptModalSale] = useState<ReceiptSale | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

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

  // Dynamic promotion evaluation whenever cart changes
  const promoCalculation = useMemo(() => {
    return evaluateCartPromotions(cart as any, promotions);
  }, [cart, promotions]);

  // Clean up any reward items that are no longer eligible
  // If Buy X item reduced, remove or reduce corresponding free item
  const syncRewardsWithEligibility = (newCart: CartItem[]): CartItem[] => {
    const tempEval = evaluateCartPromotions(newCart as any, promotions);

    return newCart.filter((item) => {
      if (item.isTebusMurah) {
        // Must still have eligible tebus murah promo
        const eligibleTebus = tempEval.eligibilityList.find(
          (e) =>
            e.promotion.type === "TEBUS_MURAH" &&
            e.promotion.rewardProductId === item.product.id &&
            e.isEligible
        );
        return Boolean(eligibleTebus);
      }
      if (item.isRewardItem) {
        // Must still have eligible Buy X promo
        const eligibleBuyX = tempEval.eligibilityList.find(
          (e) =>
            e.promotion.type === "BUY_X_GET_Y" &&
            e.promotion.rewardProductId === item.product.id &&
            e.isEligible
        );
        return Boolean(eligibleBuyX);
      }
      return true;
    });
  };

  const addToCart = (product: PosProduct) => {
    setError(null);

    if (product.currentStock <= 0) {
      setError(`Cannot add "${product.name}": Out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && !item.isRewardItem && !item.isTebusMurah
      );
      let updated: CartItem[];
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          setError(
            `Insufficient stock for "${product.name}". Max available: ${product.currentStock} ${product.unit}.`
          );
          return prev;
        }
        updated = prev.map((item) =>
          item.product.id === product.id && !item.isRewardItem && !item.isTebusMurah
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updated = [...prev, { product, quantity: 1 }];
      }

      return syncRewardsWithEligibility(updated);
    });
  };

  const updateQuantity = (productId: string, delta: number, isRewardOrTebus?: boolean) => {
    setError(null);
    setCart((prev) => {
      const match = prev.find(
        (item) =>
          item.product.id === productId &&
          (isRewardOrTebus ? item.isRewardItem || item.isTebusMurah : !item.isRewardItem && !item.isTebusMurah)
      );

      if (!match) return prev;

      const newQty = match.quantity + delta;
      if (newQty <= 0) {
        return syncRewardsWithEligibility(
          prev.filter((i) => i !== match)
        );
      }

      const product = products.find((p) => p.id === productId);
      if (product && newQty > product.currentStock) {
        setError(
          `Insufficient stock (${product.currentStock} ${product.unit}) for ${product.name}.`
        );
        return prev;
      }

      const updated = prev.map((item) =>
        item === match ? { ...item, quantity: newQty } : item
      );

      return syncRewardsWithEligibility(updated);
    });
  };

  const removeFromCart = (productId: string, isRewardOrTebus?: boolean) => {
    setCart((prev) => {
      const updated = prev.filter(
        (item) =>
          !(
            item.product.id === productId &&
            (isRewardOrTebus ? item.isRewardItem || item.isTebusMurah : !item.isRewardItem && !item.isTebusMurah)
          )
      );
      return syncRewardsWithEligibility(updated);
    });
  };

  const clearCart = () => {
    setCart([]);
    setError(null);
  };

  const handleAddTebusMurahItem = (promo: any) => {
    const rewardProduct = products.find((p) => p.id === promo.rewardProductId);
    if (!rewardProduct) {
      setError("Reward product not found");
      return;
    }

    if (rewardProduct.currentStock <= 0) {
      setError(`Cannot add "${rewardProduct.name}": Out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (i) => i.isTebusMurah && (i.appliedPromotionId === promo.id || i.product.id === rewardProduct.id)
      );
      if (existing) return prev;

      return [
        ...prev,
        {
          product: rewardProduct,
          quantity: promo.maxQuantity || 1,
          isTebusMurah: true,
          appliedPromotionId: promo.id,
          specialPrice: Number(promo.specialPrice || 0),
        },
      ];
    });
  };

  const handleAddBuyXRewardItem = (promo: any) => {
    const rewardProduct = products.find((p) => p.id === promo.rewardProductId);
    if (!rewardProduct) {
      setError("Reward product not found");
      return;
    }

    // Find eligible reward quantity from current evaluation
    const evalItem = promoCalculation.eligibilityList.find((e) => e.promotion.id === promo.id);
    const eligibleQty = evalItem ? evalItem.eligibleRewardQuantity : promo.rewardQuantity || 1;

    if (rewardProduct.currentStock < eligibleQty) {
      setError(
        `Insufficient reward stock for "${rewardProduct.name}". Available: ${rewardProduct.currentStock}`
      );
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (i) => i.isRewardItem && (i.appliedPromotionId === promo.id || i.product.id === rewardProduct.id)
      );
      if (existing) {
        return prev.map((i) => (i === existing ? { ...i, quantity: eligibleQty } : i));
      }

      return [
        ...prev,
        {
          product: rewardProduct,
          quantity: eligibleQty,
          isRewardItem: true,
          appliedPromotionId: promo.id,
          specialPrice: 0,
        },
      ];
    });
  };

  const handleProcessPayment = async (
    paymentMethod: string,
    paymentReceived: number,
    change: number
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Re-evaluate promotions right before checkout
      const finalEval = evaluateCartPromotions(cart as any, promotions);

      const itemsPayload = finalEval.itemsWithDiscounts.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.originalUnitPrice,
        discount: item.discountPerUnit * item.quantity,
        isFreeReward: item.isFreeReward,
        promotionId: item.promotionId,
      }));

      const promotionsPayload = finalEval.appliedPromotions.map((p) => ({
        promotionId: p.promotionId,
        promotionCode: p.promotionCode,
        promotionName: p.promotionName,
        promotionType: p.promotionType,
        discountAmount: p.discountAmount,
        details: p.details,
      }));

      const res = await createSaleAction({
        items: itemsPayload,
        appliedPromotions: promotionsPayload,
        paymentMethod,
        paymentReceived,
        change,
      });

      if (res.error) {
        throw new Error(res.error);
      }

      if (res.sale) {
        setIsCheckoutModalOpen(false);
        setReceiptModalSale(res.sale);
        setCart([]);
        router.refresh();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Grand Total for Normal Cart view
  const normalCartTotal = promoCalculation.finalSubtotal;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Products Catalog Column */}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by Category"
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

        {/* Global Error Banner */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/50 rounded-lg text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-200 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400">
            <p className="text-base font-semibold">No products found</p>
            <p className="text-xs mt-1">Try refining your search keyword or selecting a different category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {paginatedProducts.map((p) => {
              const inCartItem = cart.find(
                (item) => item.product.id === p.id && !item.isRewardItem && !item.isTebusMurah
              );
              const isOutOfStock = p.currentStock <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => !isOutOfStock && addToCart(p)}
                  className={`bg-white dark:bg-slate-900 border rounded-xl p-3 flex flex-col justify-between transition-all select-none ${
                    isOutOfStock
                      ? "border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed"
                      : "border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md cursor-pointer group"
                  }`}
                >
                  <div>
                    <div className="w-full h-28 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center relative mb-2">
                      <ProductImage src={p.image} alt={p.name} />
                      <div className="absolute top-1.5 left-1.5 bg-slate-900/70 text-white text-[10px] font-mono px-1.5 py-0.5 rounded backdrop-blur-xs">
                        {p.categoryName}
                      </div>
                    </div>

                    <h3 className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                      SKU: {p.sku}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-end justify-between">
                    <div>
                      <span className="block text-[10px] text-slate-400 dark:text-slate-500">Price</span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {formatRupiah(p.sellingPrice)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
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
                        <span className="block text-[10px] font-medium text-blue-600 dark:text-blue-400 mt-0.5">
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
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* POS Cart Column (Clean normal cart view per prompt specifications: Item list, quantity, line total, Grand Total only) */}
      <div className="lg:col-span-5 xl:col-span-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[calc(100vh-8.5rem)] sticky top-20 transition-colors">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 rounded-t-xl">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">Current Cart</h2>
              <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full font-bold">
                {totalItemCount}
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 font-semibold"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Items List */}
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
              cart.map((item) => {
                const lineTotal = item.isRewardItem
                  ? 0
                  : item.isTebusMurah
                  ? (item.specialPrice || 0) * item.quantity
                  : item.product.sellingPrice * item.quantity;

                return (
                  <div
                    key={`${item.product.id}-${item.isRewardItem ? "reward" : item.isTebusMurah ? "tebus" : "reg"}`}
                    className={`flex items-center justify-between p-3 rounded-lg border gap-3 text-xs ${
                      item.isRewardItem
                        ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900"
                        : item.isTebusMurah
                        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-800"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
                      <ProductImage src={item.product.image} alt={item.product.name} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                        {item.product.name}
                      </h4>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.isRewardItem ? (
                          <span className="text-purple-600 font-bold">FREE REWARD</span>
                        ) : item.isTebusMurah ? (
                          <span className="text-emerald-600 font-bold">
                            Tebus Murah @ {formatRupiah(item.specialPrice || 0)}
                          </span>
                        ) : (
                          `${formatRupiah(item.product.sellingPrice)} / ${item.product.unit}`
                        )}
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!item.isRewardItem && (
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, -1, item.isTebusMurah)}
                            className="w-5 h-6 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-semibold text-xs text-slate-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, 1, item.isTebusMurah)}
                            className="w-5 h-6 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 font-bold"
                          >
                            +
                          </button>
                        </div>
                      )}

                      {item.isRewardItem && (
                        <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                          Qty: {item.quantity}
                        </span>
                      )}

                      {/* Line Total */}
                      <span className="w-16 text-right font-bold text-slate-900 dark:text-white">
                        {item.isRewardItem ? "FREE" : formatRupiah(lineTotal)}
                      </span>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id, item.isRewardItem || item.isTebusMurah)}
                        className="p-1 text-slate-400 hover:text-red-600 ml-1"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Normal Cart Footer: Grand Total and Complete Sale & Checkout button */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded-b-xl space-y-3">
            <div className="flex items-center justify-between text-slate-900 dark:text-white font-bold text-base">
              <span>Grand Total:</span>
              <span className="text-blue-600 dark:text-blue-400">{formatRupiah(normalCartTotal)}</span>
            </div>

            <button
              type="button"
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutModalOpen(true)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2"
            >
              <span>Complete Sale & Checkout</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Checkout Popup Modal */}
      {isCheckoutModalOpen && (
        <PosCheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          cart={cart}
          allProducts={products}
          eligibilityList={promoCalculation.eligibilityList}
          appliedPromotions={promoCalculation.appliedPromotions}
          itemsWithDiscounts={promoCalculation.itemsWithDiscounts}
          rawSubtotal={promoCalculation.rawSubtotal}
          totalDiscount={promoCalculation.totalDiscount}
          finalSubtotal={promoCalculation.finalSubtotal}
          onUpdateCartItemQty={(pId, delta, isReward) => updateQuantity(pId, delta, isReward)}
          onRemoveCartItem={(pId, isReward) => removeFromCart(pId, isReward)}
          onAddTebusMurahItem={handleAddTebusMurahItem}
          onAddBuyXRewardItem={handleAddBuyXRewardItem}
          onProcessPay={handleProcessPayment}
          isLoading={isLoading}
        />
      )}

      {/* Existing Printable Receipt Modal */}
      {receiptModalSale && (
        <ReceiptModal
          sale={receiptModalSale}
          onClose={() => setReceiptModalSale(null)}
        />
      )}
    </div>
  );
}
