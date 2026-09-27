"use client";

import { useState, useMemo } from "react";
import { formatRupiah, calculateReverseTax, generatePaymentSuggestions } from "@/lib/tax-utils";
import ProductImage from "@/app/components/ProductImage";
import { PosProduct } from "./PosTerminal";
import { PromotionEligibility } from "@/lib/promotions-engine";

export interface CartItem {
  product: PosProduct;
  quantity: number;
  isRewardItem?: boolean;
  isTebusMurah?: boolean;
  appliedPromotionId?: string;
  specialPrice?: number;
}

interface PosCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  allProducts: PosProduct[];
  eligibilityList: PromotionEligibility[];
  appliedPromotions: any[];
  itemsWithDiscounts: any[];
  rawSubtotal: number;
  totalDiscount: number;
  finalSubtotal: number;
  onUpdateCartItemQty: (productId: string, delta: number, isReward?: boolean) => void;
  onRemoveCartItem: (productId: string, isReward?: boolean) => void;
  onAddTebusMurahItem: (promotion: any) => void;
  onAddBuyXRewardItem: (promotion: any) => void;
  onProcessPay: (paymentMethod: string, paymentReceived: number, change: number) => Promise<void>;
  isLoading: boolean;
}

export default function PosCheckoutModal({
  isOpen,
  onClose,
  cart,
  allProducts,
  eligibilityList,
  appliedPromotions,
  itemsWithDiscounts,
  rawSubtotal,
  totalDiscount,
  finalSubtotal,
  onUpdateCartItemQty,
  onRemoveCartItem,
  onAddTebusMurahItem,
  onAddBuyXRewardItem,
  onProcessPay,
  isLoading,
}: PosCheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentInput, setPaymentInput] = useState("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Single authoritative reverse tax calculation
  const { preTaxAmount, taxAmount, totalAmount, taxRate } = calculateReverseTax(finalSubtotal);

  // Dynamic payment suggestions recalculated whenever Grand Total changes
  const paymentSuggestions = useMemo(() => {
    return generatePaymentSuggestions(totalAmount);
  }, [totalAmount]);

  const isCash = paymentMethod === "CASH";
  const effectivePaymentReceived = isCash
    ? Number(paymentInput.replace(/\D/g, "")) || 0
    : totalAmount;
  const change = isCash ? Math.max(0, effectivePaymentReceived - totalAmount) : 0;
  const isPaymentSufficient = totalAmount > 0 && effectivePaymentReceived >= totalAmount;

  const handlePaymentInputChange = (val: string) => {
    const raw = val.replace(/\D/g, "");
    if (!raw) {
      setPaymentInput("");
      return;
    }
    const num = Number(raw);
    setPaymentInput(num.toLocaleString("id-ID"));
  };

  const handleSelectSuggestion = (amount: number) => {
    setPaymentMethod("CASH");
    setPaymentInput(amount.toLocaleString("id-ID"));
    setCheckoutError(null);
  };

  const handleSetExact = () => {
    if (totalAmount > 0) {
      setPaymentInput(totalAmount.toLocaleString("id-ID"));
    }
  };

  const handlePayClick = async () => {
    if (cart.length === 0) {
      setCheckoutError("Cart is empty.");
      return;
    }

    if (isCash && (!paymentInput || effectivePaymentReceived <= 0)) {
      setCheckoutError("Please enter a valid payment amount.");
      return;
    }

    if (effectivePaymentReceived < totalAmount) {
      setCheckoutError("Insufficient payment amount.");
      return;
    }

    setCheckoutError(null);
    try {
      await onProcessPay(paymentMethod, effectivePaymentReceived, change);
    } catch (err: any) {
      setCheckoutError(err.message || "Failed to process sale");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              Complete Sale & Checkout
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              3-Column Checkout: Review eligible promotions, verify cart items, and finalize payment
            </p>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {checkoutError && (
          <div className="mx-4 mt-3 p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-lg">
            {checkoutError}
          </div>
        )}

        {/* 3-Column Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 overflow-y-auto min-h-0">
          {/* KOLOM 1: PROMOTIONS (width 4 cols) */}
          <div className="md:col-span-4 p-4 flex flex-col overflow-y-auto bg-slate-50/40 dark:bg-slate-950/30 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Promotions & Offers
              </h3>
              <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                {eligibilityList.filter((e) => e.isEligible).length} Eligible
              </span>
            </div>

            {eligibilityList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <p className="text-xs font-medium">No active promotions available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {eligibilityList.map((item) => {
                  const p = item.promotion;
                  const isEligible = item.isEligible;

                  // Check if reward product is already in cart
                  const isAlreadyAdded = cart.some(
                    (c) =>
                      (c.isRewardItem || c.isTebusMurah) &&
                      (c.appliedPromotionId === p.id || c.product.id === p.rewardProductId)
                  );

                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-xl border transition-all text-xs ${
                        isEligible
                          ? "bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-900/60 shadow-xs"
                          : "bg-slate-100/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-75"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                p.type === "BUY_X_GET_Y"
                                  ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                                  : p.type === "TEBUS_MURAH"
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                  : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                              }`}
                            >
                              {p.type.replace(/_/g, " ")}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                              {p.code}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                            {p.name}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            isEligible
                              ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                              : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {isEligible ? "ELIGIBLE" : "NOT MET"}
                        </span>
                      </div>

                      {/* Promo Benefit Description */}
                      <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        {item.benefitText}
                      </div>

                      {/* Progress condition indicator */}
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                        <div>
                          {p.type === "BUY_X_GET_Y" && (
                            <span>
                              Current in cart: <strong>{item.currentValue}</strong> / Required: <strong>{item.requiredValue}</strong>
                            </span>
                          )}
                          {p.type === "TEBUS_MURAH" && (
                            <span>
                              Cart Subtotal: <strong>{formatRupiah(item.currentValue)}</strong> / Min: <strong>{formatRupiah(item.requiredValue)}</strong>
                            </span>
                          )}
                          {p.type === "PRODUCT_DISCOUNT" && (
                            <span>
                              Current: <strong>{item.currentValue}</strong> / Min: <strong>{item.requiredValue}</strong>
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        {isEligible && p.type === "BUY_X_GET_Y" && (
                          <button
                            type="button"
                            onClick={() => onAddBuyXRewardItem(p)}
                            disabled={isAlreadyAdded}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                              isAlreadyAdded
                                ? "bg-green-600 text-white cursor-default"
                                : "bg-purple-600 hover:bg-purple-700 text-white"
                            }`}
                          >
                            {isAlreadyAdded ? "Applied (Free)" : "Claim Free Item"}
                          </button>
                        )}

                        {isEligible && p.type === "TEBUS_MURAH" && (
                          <button
                            type="button"
                            onClick={() => onAddTebusMurahItem(p)}
                            disabled={isAlreadyAdded}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                              isAlreadyAdded
                                ? "bg-emerald-600 text-white cursor-default"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            }`}
                          >
                            {isAlreadyAdded ? "In Cart (Special)" : "Add Tebus Murah"}
                          </button>
                        )}

                        {isEligible && p.type === "PRODUCT_DISCOUNT" && (
                          <span className="text-green-600 dark:text-green-400 font-semibold text-[11px]">
                            Auto-Applied ({formatRupiah(item.calculatedDiscount)})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* KOLOM 2: CART (width 4 cols) */}
          <div className="md:col-span-4 p-4 flex flex-col overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Cart Items ({cart.reduce((s, i) => s + i.quantity, 0)})
              </h3>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {formatRupiah(finalSubtotal)}
              </span>
            </div>

            {/* Cart item list with instant re-calculation controls */}
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Your cart is empty.
                </div>
              ) : (
                cart.map((item) => {
                  const isReward = item.isRewardItem;
                  const isTebus = item.isTebusMurah;

                  // Find discounted representation
                  const summaryItem = itemsWithDiscounts.find(
                    (s) => s.productId === item.product.id
                  );

                  return (
                    <div
                      key={`${item.product.id}-${isReward ? "reward" : isTebus ? "tebus" : "regular"}`}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        isReward
                          ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900"
                          : isTebus
                          ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
                          : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0 overflow-hidden">
                          <ProductImage src={(item.product as any).image} alt={item.product.name} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white truncate">
                            {item.product.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {isReward ? (
                              <span className="text-purple-600 font-bold uppercase">Free Benefit Reward</span>
                            ) : isTebus ? (
                              <span className="text-emerald-600 font-bold uppercase">
                                Tebus Murah @ {formatRupiah(item.specialPrice || 0)}
                              </span>
                            ) : summaryItem && summaryItem.discountPerUnit > 0 ? (
                              <span className="text-blue-600 font-semibold">
                                {formatRupiah(summaryItem.finalUnitPrice)} (Diskon {formatRupiah(summaryItem.discountPerUnit)})
                              </span>
                            ) : (
                              formatRupiah(item.product.sellingPrice)
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quantity & remove controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!isReward && (
                          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => onUpdateCartItemQty(item.product.id, -1, isTebus)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                            >
                              -
                            </button>
                            <span className="w-7 text-center font-semibold text-xs text-slate-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateCartItemQty(item.product.id, 1, isTebus)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                            >
                              +
                            </button>
                          </div>
                        )}

                        {isReward && (
                          <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                            Qty: {item.quantity} (Free)
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => onRemoveCartItem(item.product.id, isReward || isTebus)}
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
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

            {/* Discount summary banner */}
            {totalDiscount > 0 && (
              <div className="p-2.5 bg-green-50 dark:bg-green-950/40 rounded-lg border border-green-200 dark:border-green-800/80 flex items-center justify-between text-xs text-green-700 dark:text-green-300">
                <span className="font-semibold">Total Promo Savings:</span>
                <span className="font-bold">-{formatRupiah(totalDiscount)}</span>
              </div>
            )}
          </div>

          {/* KOLOM 3: PAYMENT / CHECKOUT CONFIRMATION (width 4 cols) */}
          <div className="md:col-span-4 p-4 flex flex-col justify-between bg-slate-50/20 dark:bg-slate-950/40 space-y-4">
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Payment / Checkout Confirmation
                </h3>
              </div>

              {/* Price & Tax details */}
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Price Before Tax (Pre-Tax)</span>
                  <span className="font-medium text-slate-900 dark:text-white">{formatRupiah(preTaxAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Tax (PPN {Math.round(taxRate * 100)}% Included)</span>
                  <span className="font-medium text-slate-900 dark:text-white">{formatRupiah(taxAmount)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                    <span>Discount</span>
                    <span>{formatRupiah(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-950 dark:text-white font-bold text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Grand Total</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatRupiah(totalAmount)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["CASH", "QRIS", "DEBIT"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method);
                        if (method !== "CASH" && totalAmount > 0) {
                          setPaymentInput(totalAmount.toLocaleString("id-ID"));
                        }
                      }}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        paymentMethod === method
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Payment Amount Suggestions */}
              {isCash && totalAmount > 0 && paymentSuggestions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Payment Suggestions
                    </label>
                    <span className="text-[10px] text-slate-400">Click to apply</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {paymentSuggestions.map((suggestion) => {
                      const isCurrentInput =
                        effectivePaymentReceived === suggestion && paymentInput !== "";

                      return (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className={`flex-1 min-w-[85px] py-1.5 px-2 text-xs font-bold rounded-lg border transition-all text-center ${
                            isCurrentInput
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300 dark:ring-blue-900"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400"
                          }`}
                        >
                          {formatRupiah(suggestion)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Amount
                  </label>
                  {isCash && totalAmount > 0 && (
                    <button
                      type="button"
                      onClick={handleSetExact}
                      className="text-[11px] font-semibold text-blue-600 hover:underline"
                    >
                      Exact Amount
                    </button>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={isCash ? paymentInput : totalAmount.toLocaleString("id-ID")}
                    onChange={(e) => isCash && handlePaymentInputChange(e.target.value)}
                    disabled={!isCash || isLoading}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-blue-500 disabled:opacity-75"
                  />
                </div>
              </div>

              {/* Change Display */}
              {isCash && (
                <div
                  className={`p-3 rounded-lg border text-xs flex justify-between items-center transition-colors ${
                    effectivePaymentReceived > 0 && effectivePaymentReceived < totalAmount
                      ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300"
                      : "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900/60 text-green-700 dark:text-green-300"
                  }`}
                >
                  <span className="font-semibold">
                    {effectivePaymentReceived > 0 && effectivePaymentReceived < totalAmount
                      ? "Insufficient Payment"
                      : "Change"}
                  </span>
                  <span className="font-bold text-sm">
                    {effectivePaymentReceived > 0 && effectivePaymentReceived < totalAmount
                      ? `-${formatRupiah(totalAmount - effectivePaymentReceived)}`
                      : formatRupiah(change)}
                  </span>
                </div>
              )}
            </div>

            {/* PAY Button */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={cart.length === 0 || !isPaymentSufficient || isLoading}
                onClick={handlePayClick}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition-all text-sm flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing Payment & Sale...
                  </>
                ) : (
                  <>
                    <span>PAY</span>
                    <span>•</span>
                    <span>{formatRupiah(totalAmount)}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
