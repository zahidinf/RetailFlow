import { PromotionType } from "@prisma/client";

export interface PosProductInfo {
  id: string;
  sku: string;
  name: string;
  sellingPrice: number;
  currentStock: number;
  unit: string;
}

export interface CartLineItem {
  product: PosProductInfo;
  quantity: number;
  isRewardItem?: boolean;
  isTebusMurah?: boolean;
  appliedPromotionId?: string;
  specialPrice?: number;
}

export interface PromotionRule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: PromotionType;
  status: string;
  priority: number;
  isStackable: boolean;
  startDate: string | Date;
  endDate: string | Date;

  // BUY_X_GET_Y
  buyProductId?: string | null;
  minQuantity?: number | null;
  rewardProductId?: string | null;
  rewardQuantity?: number | null;

  // TEBUS_MURAH
  minCartSubtotal?: number | null;
  specialPrice?: number | null;
  maxQuantity?: number | null;

  // PRODUCT_DISCOUNT
  discountType?: "PERCENTAGE" | "FIXED" | "SPECIAL_PRICE" | null;
  discountValue?: number | null;

  buyProduct?: PosProductInfo | null;
  rewardProduct?: PosProductInfo | null;
}

export interface PromotionEligibility {
  promotion: PromotionRule;
  isEligible: boolean;
  currentValue: number;
  requiredValue: number;
  benefitText: string;
  eligibleRewardQuantity: number;
  calculatedDiscount: number;
}

export interface AppliedPromotionResult {
  promotionId: string;
  promotionCode: string;
  promotionName: string;
  promotionType: PromotionType;
  discountAmount: number;
  affectedProductId?: string;
  rewardProductId?: string;
  rewardQuantity?: number;
  details?: Record<string, any>;
}

export interface CartPromotionCalculationResult {
  rawSubtotal: number;
  totalDiscount: number;
  finalSubtotal: number;
  appliedPromotions: AppliedPromotionResult[];
  eligibilityList: PromotionEligibility[];
  itemsWithDiscounts: {
    productId: string;
    productName: string;
    quantity: number;
    originalUnitPrice: number;
    discountPerUnit: number;
    finalUnitPrice: number;
    lineTotal: number;
    isFreeReward: boolean;
    promotionId?: string;
  }[];
}

/**
 * Check if promotion is within active date window
 */
export function isPromotionActiveNow(promo: PromotionRule, currentDate = new Date()): boolean {
  if (promo.status !== "ACTIVE") return false;
  const start = new Date(promo.startDate).getTime();
  const end = new Date(promo.endDate).getTime();
  const now = currentDate.getTime();
  return now >= start && now <= end;
}

/**
 * Evaluate promotions against current cart state.
 * Returns eligibility status for all active promotions and computes exact cart discounts.
 */
export function evaluateCartPromotions(
  cart: CartLineItem[],
  availablePromotions: PromotionRule[],
  appliedPromoIds: string[] = []
): CartPromotionCalculationResult {
  const activePromotions = availablePromotions
    .filter((p) => isPromotionActiveNow(p))
    .sort((a, b) => b.priority - a.priority);

  // 1. Separate regular items from reward items
  const regularItems = cart.filter((i) => !i.isRewardItem && !i.isTebusMurah);
  const rewardItems = cart.filter((i) => i.isRewardItem || i.isTebusMurah);

  // Compute regular cart subtotal
  const rawSubtotal = regularItems.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );

  const eligibilityList: PromotionEligibility[] = [];
  const appliedPromotions: AppliedPromotionResult[] = [];
  let totalDiscount = 0;

  // Working items array for final summary
  const itemsSummary: CartPromotionCalculationResult["itemsWithDiscounts"] = regularItems.map((item) => ({
    productId: item.product.id,
    productName: item.product.name,
    quantity: item.quantity,
    originalUnitPrice: item.product.sellingPrice,
    discountPerUnit: 0,
    finalUnitPrice: item.product.sellingPrice,
    lineTotal: item.product.sellingPrice * item.quantity,
    isFreeReward: false,
  }));

  // Check each promotion
  for (const promo of activePromotions) {
    if (promo.type === "BUY_X_GET_Y") {
      const buyItem = regularItems.find((i) => i.product.id === promo.buyProductId);
      const currentQty = buyItem ? buyItem.quantity : 0;
      const requiredQty = promo.minQuantity || 1;
      const rewardPerBundle = promo.rewardQuantity || 1;
      const eligibleBundles = Math.floor(currentQty / requiredQty);
      const eligibleRewardQty = eligibleBundles * rewardPerBundle;

      const rewardProductName = promo.rewardProduct?.name || "Free Item";
      const benefitText = `Buy ${requiredQty} Get ${rewardPerBundle} ${rewardProductName} Free`;

      const isEligible = eligibleRewardQty > 0;

      eligibilityList.push({
        promotion: promo,
        isEligible,
        currentValue: currentQty,
        requiredValue: requiredQty,
        benefitText,
        eligibleRewardQuantity: eligibleRewardQty,
        calculatedDiscount: isEligible && promo.rewardProduct ? eligibleRewardQty * promo.rewardProduct.sellingPrice : 0,
      });

      // If user selected/applied this promo or if auto-applied
      const isSelected = appliedPromoIds.length === 0 || appliedPromoIds.includes(promo.id);
      if (isEligible && isSelected) {
        // Find if reward product is in cart reward items
        const matchingReward = rewardItems.find(
          (r) => r.appliedPromotionId === promo.id || r.product.id === promo.rewardProductId
        );

        const rewardUnitPrice = promo.rewardProduct ? promo.rewardProduct.sellingPrice : 0;
        const discountVal = eligibleRewardQty * rewardUnitPrice;

        appliedPromotions.push({
          promotionId: promo.id,
          promotionCode: promo.code,
          promotionName: promo.name,
          promotionType: promo.type,
          discountAmount: discountVal,
          affectedProductId: promo.buyProductId || undefined,
          rewardProductId: promo.rewardProductId || undefined,
          rewardQuantity: eligibleRewardQty,
          details: {
            buyProductId: promo.buyProductId,
            boughtQuantity: currentQty,
            rewardProductId: promo.rewardProductId,
            rewardQuantity: eligibleRewardQty,
            freeBenefit: true,
          },
        });
      }
    } else if (promo.type === "TEBUS_MURAH") {
      const minSubtotal = Number(promo.minCartSubtotal || 0);
      const isEligible = rawSubtotal >= minSubtotal;
      const specialPrice = Number(promo.specialPrice || 0);
      const normalPrice = promo.rewardProduct?.sellingPrice || 0;
      const maxQty = promo.maxQuantity || 1;
      const tebusProductName = promo.rewardProduct?.name || "Special Item";

      const discountPerUnit = Math.max(0, normalPrice - specialPrice);
      const totalTebusDiscount = discountPerUnit * maxQty;

      eligibilityList.push({
        promotion: promo,
        isEligible,
        currentValue: rawSubtotal,
        requiredValue: minSubtotal,
        benefitText: `Min. purchase Rp ${minSubtotal.toLocaleString("id-ID")}: ${tebusProductName} @ Rp ${specialPrice.toLocaleString("id-ID")}`,
        eligibleRewardQuantity: isEligible ? maxQty : 0,
        calculatedDiscount: isEligible ? totalTebusDiscount : 0,
      });

      // Tebus murah applied if user included it in cart
      const tebusItemInCart = rewardItems.find(
        (r) => r.isTebusMurah && (r.appliedPromotionId === promo.id || r.product.id === promo.rewardProductId)
      );

      if (isEligible && tebusItemInCart) {
        const actualQty = Math.min(tebusItemInCart.quantity, maxQty);
        const actualDiscount = discountPerUnit * actualQty;

        totalDiscount += actualDiscount;
        appliedPromotions.push({
          promotionId: promo.id,
          promotionCode: promo.code,
          promotionName: promo.name,
          promotionType: promo.type,
          discountAmount: actualDiscount,
          rewardProductId: promo.rewardProductId || undefined,
          rewardQuantity: actualQty,
          details: {
            minCartSubtotal: minSubtotal,
            normalPrice,
            specialPrice,
            quantity: actualQty,
          },
        });
      }
    } else if (promo.type === "PRODUCT_DISCOUNT") {
      const targetItem = regularItems.find((i) => i.product.id === promo.buyProductId);
      const currentQty = targetItem ? targetItem.quantity : 0;
      const minQty = promo.minQuantity || 1;
      const isEligible = currentQty >= minQty;

      let discountAmount = 0;
      let benefitText = "";

      if (promo.discountType === "PERCENTAGE") {
        const pct = Number(promo.discountValue || 0);
        benefitText = `Buy min ${minQty}: ${pct}% OFF`;
        if (targetItem && isEligible) {
          discountAmount = (targetItem.product.sellingPrice * targetItem.quantity * pct) / 100;
        }
      } else if (promo.discountType === "FIXED") {
        const fixed = Number(promo.discountValue || 0);
        benefitText = `Buy min ${minQty}: Potongan Rp ${fixed.toLocaleString("id-ID")}`;
        if (targetItem && isEligible) {
          discountAmount = fixed * targetItem.quantity;
        }
      } else if (promo.discountType === "SPECIAL_PRICE") {
        const special = Number(promo.discountValue || 0);
        benefitText = `Buy min ${minQty}: Special Price Rp ${special.toLocaleString("id-ID")}`;
        if (targetItem && isEligible) {
          const normal = targetItem.product.sellingPrice;
          const diff = Math.max(0, normal - special);
          discountAmount = diff * targetItem.quantity;
        }
      }

      eligibilityList.push({
        promotion: promo,
        isEligible,
        currentValue: currentQty,
        requiredValue: minQty,
        benefitText,
        eligibleRewardQuantity: 0,
        calculatedDiscount: discountAmount,
      });

      const isSelected = appliedPromoIds.length === 0 || appliedPromoIds.includes(promo.id);
      if (isEligible && isSelected && discountAmount > 0) {
        totalDiscount += discountAmount;
        appliedPromotions.push({
          promotionId: promo.id,
          promotionCode: promo.code,
          promotionName: promo.name,
          promotionType: promo.type,
          discountAmount,
          affectedProductId: promo.buyProductId || undefined,
          details: {
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            affectedQuantity: currentQty,
          },
        });

        // Apply discount to summary item
        const summaryItem = itemsSummary.find((s) => s.productId === promo.buyProductId);
        if (summaryItem) {
          summaryItem.discountPerUnit = discountAmount / summaryItem.quantity;
          summaryItem.finalUnitPrice = summaryItem.originalUnitPrice - summaryItem.discountPerUnit;
          summaryItem.lineTotal = summaryItem.finalUnitPrice * summaryItem.quantity;
          summaryItem.promotionId = promo.id;
        }
      }
    }
  }

  // Include reward items in items summary
  for (const reward of rewardItems) {
    if (reward.isTebusMurah) {
      // Find matching tebus promo
      const tebusPromo = activePromotions.find(
        (p) => p.type === "TEBUS_MURAH" && p.rewardProductId === reward.product.id
      );
      const isStillEligible = tebusPromo && rawSubtotal >= Number(tebusPromo.minCartSubtotal || 0);

      const specialPrice = isStillEligible && tebusPromo?.specialPrice ? Number(tebusPromo.specialPrice) : reward.product.sellingPrice;
      const discountPerUnit = isStillEligible ? Math.max(0, reward.product.sellingPrice - specialPrice) : 0;

      itemsSummary.push({
        productId: reward.product.id,
        productName: `${reward.product.name} (Tebus Murah)`,
        quantity: reward.quantity,
        originalUnitPrice: reward.product.sellingPrice,
        discountPerUnit,
        finalUnitPrice: specialPrice,
        lineTotal: specialPrice * reward.quantity,
        isFreeReward: false,
        promotionId: tebusPromo?.id,
      });
    } else if (reward.isRewardItem) {
      // Free item from Buy X Get Y
      const matchingPromo = activePromotions.find(
        (p) => p.type === "BUY_X_GET_Y" && p.rewardProductId === reward.product.id
      );
      const buyItem = regularItems.find((i) => i.product.id === matchingPromo?.buyProductId);
      const eligibleQty = buyItem && matchingPromo ? Math.floor(buyItem.quantity / (matchingPromo.minQuantity || 1)) * (matchingPromo.rewardQuantity || 1) : 0;

      const freeQty = Math.min(reward.quantity, eligibleQty);
      const chargedQty = Math.max(0, reward.quantity - freeQty);

      if (freeQty > 0) {
        itemsSummary.push({
          productId: reward.product.id,
          productName: `${reward.product.name} (FREE)`,
          quantity: freeQty,
          originalUnitPrice: reward.product.sellingPrice,
          discountPerUnit: reward.product.sellingPrice,
          finalUnitPrice: 0,
          lineTotal: 0,
          isFreeReward: true,
          promotionId: matchingPromo?.id,
        });
      }

      if (chargedQty > 0) {
        itemsSummary.push({
          productId: reward.product.id,
          productName: reward.product.name,
          quantity: chargedQty,
          originalUnitPrice: reward.product.sellingPrice,
          discountPerUnit: 0,
          finalUnitPrice: reward.product.sellingPrice,
          lineTotal: reward.product.sellingPrice * chargedQty,
          isFreeReward: false,
        });
      }
    }
  }

  // Calculate final subtotal
  const finalSubtotal = itemsSummary.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    rawSubtotal,
    totalDiscount,
    finalSubtotal,
    appliedPromotions,
    eligibilityList,
    itemsWithDiscounts: itemsSummary,
  };
}
