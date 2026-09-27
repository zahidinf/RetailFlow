"use client";

import { useState } from "react";
import {
  createPromotionAction,
  updatePromotionAction,
  togglePromotionStatusAction,
  deletePromotionAction,
} from "../actions";

interface ProductOption {
  id: string;
  sku: string;
  name: string;
  sellingPrice: number;
}

interface PromotionItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: "BUY_X_GET_Y" | "TEBUS_MURAH" | "PRODUCT_DISCOUNT";
  status: "ACTIVE" | "INACTIVE";
  priority: number;
  isStackable: boolean;
  startDate: string | Date;
  endDate: string | Date;
  buyProductId?: string | null;
  minQuantity?: number | null;
  rewardProductId?: string | null;
  rewardQuantity?: number | null;
  minCartSubtotal?: any;
  specialPrice?: any;
  maxQuantity?: number | null;
  discountType?: string | null;
  discountValue?: any;
  buyProduct?: any;
  rewardProduct?: any;
}

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion?: PromotionItem | null;
  products: ProductOption[];
  onSuccess: () => void;
}

export default function PromotionModal({
  isOpen,
  onClose,
  promotion,
  products,
  onSuccess,
}: PromotionModalProps) {
  const isEditing = !!promotion;

  const [code, setCode] = useState(promotion?.code || "");
  const [name, setName] = useState(promotion?.name || "");
  const [description, setDescription] = useState(promotion?.description || "");
  const [type, setType] = useState<"BUY_X_GET_Y" | "TEBUS_MURAH" | "PRODUCT_DISCOUNT">(
    promotion?.type || "BUY_X_GET_Y"
  );
  const [priority, setPriority] = useState<number>(promotion?.priority ?? 0);
  const [isStackable, setIsStackable] = useState<boolean>(promotion?.isStackable ?? true);
  const [startDate, setStartDate] = useState(
    promotion?.startDate
      ? new Date(promotion.startDate).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  );
  const [endDate, setEndDate] = useState(
    promotion?.endDate
      ? new Date(promotion.endDate).toISOString().slice(0, 16)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );

  // Buy X Get Y fields
  const [buyProductId, setBuyProductId] = useState(promotion?.buyProductId || products[0]?.id || "");
  const [minQuantity, setMinQuantity] = useState<number>(promotion?.minQuantity ?? 2);
  const [rewardProductId, setRewardProductId] = useState(
    promotion?.rewardProductId || products[0]?.id || ""
  );
  const [rewardQuantity, setRewardQuantity] = useState<number>(promotion?.rewardQuantity ?? 1);

  // Tebus Murah fields
  const [minCartSubtotal, setMinCartSubtotal] = useState<string>(
    promotion?.minCartSubtotal ? String(Number(promotion.minCartSubtotal)) : "50000"
  );
  const [tebusProductId, setTebusProductId] = useState(
    promotion?.rewardProductId || products[0]?.id || ""
  );
  const [specialPrice, setSpecialPrice] = useState<string>(
    promotion?.specialPrice ? String(Number(promotion.specialPrice)) : "45000"
  );
  const [maxQuantity, setMaxQuantity] = useState<number>(promotion?.maxQuantity ?? 1);

  // Product Discount fields
  const [targetProductId, setTargetProductId] = useState(
    promotion?.buyProductId || products[0]?.id || ""
  );
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED" | "SPECIAL_PRICE">(
    (promotion?.discountType as any) || "PERCENTAGE"
  );
  const [discountValue, setDiscountValue] = useState<string>(
    promotion?.discountValue ? String(Number(promotion.discountValue)) : "10"
  );
  const [discountMinQty, setDiscountMinQty] = useState<number>(promotion?.minQuantity ?? 1);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload: any = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || null,
        type,
        priority: Number(priority),
        isStackable,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      };

      if (type === "BUY_X_GET_Y") {
        payload.buyProductId = buyProductId;
        payload.minQuantity = Number(minQuantity);
        payload.rewardProductId = rewardProductId;
        payload.rewardQuantity = Number(rewardQuantity);
      } else if (type === "TEBUS_MURAH") {
        payload.minCartSubtotal = Number(minCartSubtotal);
        payload.rewardProductId = tebusProductId;
        payload.specialPrice = Number(specialPrice);
        payload.maxQuantity = Number(maxQuantity);
      } else if (type === "PRODUCT_DISCOUNT") {
        payload.buyProductId = targetProductId;
        payload.minQuantity = Number(discountMinQty);
        payload.discountType = discountType;
        payload.discountValue = Number(discountValue);
      }

      let res;
      if (isEditing && promotion) {
        res = await updatePromotionAction(promotion.id, payload);
      } else {
        res = await createPromotionAction(payload);
      }

      if (res.error) {
        setError(res.error);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Failed to save promotion");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isEditing ? "Edit Promotion" : "Create New Promotion"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure promotion rules, period, and eligibility
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Promo Code *
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                placeholder="e.g. BUY2AQUA, TEBUS50K"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Promotion Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Promo Beli 2 Gratis 1 Aqua"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="Brief promotional marketing text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Promotion Type *
              </label>
              <select
                disabled={isEditing}
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white disabled:opacity-60 font-medium"
              >
                <option value="BUY_X_GET_Y">Buy X Get Y Free</option>
                <option value="TEBUS_MURAH">Tebus Murah (Cart Threshold)</option>
                <option value="PRODUCT_DISCOUNT">Quantity / Product Discount</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority (High = First)
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isStackable}
                  onChange={(e) => setIsStackable(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                Stackable with other promos
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Type-Specific Rule Configuration Box */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {type === "BUY_X_GET_Y" && "Buy X Get Y Configuration"}
              {type === "TEBUS_MURAH" && "Tebus Murah Configuration"}
              {type === "PRODUCT_DISCOUNT" && "Product Discount Configuration"}
            </h3>

            {type === "BUY_X_GET_Y" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Buy Product *
                  </label>
                  <select
                    value={buyProductId}
                    onChange={(e) => setBuyProductId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) - Rp {p.sellingPrice.toLocaleString("id-ID")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Minimum Quantity (X) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reward Free Product (Y) *
                  </label>
                  <select
                    value={rewardProductId}
                    onChange={(e) => setRewardProductId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) - Rp {p.sellingPrice.toLocaleString("id-ID")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reward Free Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={rewardQuantity}
                    onChange={(e) => setRewardQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {type === "TEBUS_MURAH" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Minimum Cart Subtotal (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    placeholder="e.g. 50000"
                    value={minCartSubtotal}
                    onChange={(e) => setMinCartSubtotal(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tebus Murah Product *
                  </label>
                  <select
                    value={tebusProductId}
                    onChange={(e) => setTebusProductId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) - Normal Rp {p.sellingPrice.toLocaleString("id-ID")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Special Promo Price (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    placeholder="e.g. 47500"
                    value={specialPrice}
                    onChange={(e) => setSpecialPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                  />
                  <span className="text-[10px] text-slate-500">
                    Master product price is preserved; special price applies only at checkout.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Quantity Allowed
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxQuantity}
                    onChange={(e) => setMaxQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {type === "PRODUCT_DISCOUNT" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Product *
                  </label>
                  <select
                    value={targetProductId}
                    onChange={(e) => setTargetProductId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) - Normal Rp {p.sellingPrice.toLocaleString("id-ID")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Minimum Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={discountMinQty}
                    onChange={(e) => setDiscountMinQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (Rp)</option>
                    <option value="SPECIAL_PRICE">Special Price per Unit (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            >
              {isLoading ? "Saving..." : isEditing ? "Save Changes" : "Create Promotion"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
