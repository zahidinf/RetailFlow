"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/tax-utils";
import PromotionModal from "./PromotionModal";
import { togglePromotionStatusAction, deletePromotionAction } from "../actions";

interface ProductOption {
  id: string;
  sku: string;
  name: string;
  sellingPrice: number;
}

interface PromotionListProps {
  initialPromotions: any[];
  products: ProductOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
}

export default function PromotionsTable({
  initialPromotions,
  products,
  canCreate,
  canEdit,
  canDelete,
  canActivate,
  canDeactivate,
}: PromotionListProps) {
  const [promotions, setPromotions] = useState(initialPromotions);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<any | null>(null);
  const [detailModalPromo, setDetailModalPromo] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = promotions.filter((p) => {
    if (typeFilter && p.type !== typeFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return (
        p.code.toLowerCase().includes(s) ||
        p.name.toLowerCase().includes(s) ||
        (p.description && p.description.toLowerCase().includes(s))
      );
    }
    return true;
  });

  const handleOpenCreate = () => {
    setSelectedPromo(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (promo: any) => {
    setSelectedPromo(promo);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (promo: any) => {
    const activate = promo.status !== "ACTIVE";
    if (activate && !canActivate) return;
    if (!activate && !canDeactivate) return;

    setIsLoading(true);
    setActionError(null);
    try {
      const res = await togglePromotionStatusAction(promo.id, activate);
      if (res.error) {
        setActionError(res.error);
      } else {
        setPromotions((prev) =>
          prev.map((item) =>
            item.id === promo.id ? { ...item, status: activate ? "ACTIVE" : "INACTIVE" } : item
          )
        );
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (promo: any) => {
    if (!canDelete) return;
    if (!confirm(`Are you sure you want to delete promotion "${promo.name}" (${promo.code})?`)) {
      return;
    }

    setIsLoading(true);
    setActionError(null);
    try {
      const res = await deletePromotionAction(promo.id);
      if (res.error) {
        setActionError(res.error);
      } else {
        setPromotions((prev) => prev.filter((item) => item.id !== promo.id));
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to delete promotion");
    } finally {
      setIsLoading(false);
    }
  };

  const getPromoSummary = (p: any) => {
    if (p.type === "BUY_X_GET_Y") {
      const buyName = p.buyProduct?.name || "Product";
      const rewardName = p.rewardProduct?.name || "Free Product";
      return `Buy ${p.minQuantity}x ${buyName} → Get ${p.rewardQuantity}x ${rewardName} FREE`;
    }
    if (p.type === "TEBUS_MURAH") {
      const tebusName = p.rewardProduct?.name || "Product";
      const minSub = Number(p.minCartSubtotal || 0);
      const specPrice = Number(p.specialPrice || 0);
      return `Min cart ${formatRupiah(minSub)} → Tebus ${tebusName} @ ${formatRupiah(specPrice)}`;
    }
    if (p.type === "PRODUCT_DISCOUNT") {
      const targetName = p.buyProduct?.name || "Product";
      if (p.discountType === "PERCENTAGE") {
        return `Min ${p.minQuantity}x ${targetName} → ${p.discountValue}% OFF`;
      }
      if (p.discountType === "FIXED") {
        return `Min ${p.minQuantity}x ${targetName} → Potongan ${formatRupiah(Number(p.discountValue || 0))}`;
      }
      return `Min ${p.minQuantity}x ${targetName} → Special Price ${formatRupiah(Number(p.discountValue || 0))}`;
    }
    return "-";
  };

  return (
    <div className="space-y-4">
      {/* Top action bar & filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search promo code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white w-52 sm:w-64"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          >
            <option value="">All Promo Types</option>
            <option value="BUY_X_GET_Y">Buy X Get Y</option>
            <option value="TEBUS_MURAH">Tebus Murah</option>
            <option value="PRODUCT_DISCOUNT">Product Discount</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Promotion
          </button>
        )}
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-lg">
          {actionError}
        </div>
      )}

      {/* Promotions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Code / Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Rule Summary</th>
                <th className="py-3 px-4">Active Period</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No promotions found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((promo) => {
                  const now = new Date();
                  const isExpired = new Date(promo.endDate) < now;
                  const isUpcoming = new Date(promo.startDate) > now;
                  const isActiveNow = promo.status === "ACTIVE" && !isExpired && !isUpcoming;

                  return (
                    <tr
                      key={promo.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white font-mono uppercase text-xs">
                          {promo.code}
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">
                          {promo.name}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            promo.type === "BUY_X_GET_Y"
                              ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                              : promo.type === "TEBUS_MURAH"
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {promo.type.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs truncate" title={getPromoSummary(promo)}>
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {getPromoSummary(promo)}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-[11px]">
                        <div>{new Date(promo.startDate).toLocaleDateString("id-ID")}</div>
                        <div className="text-slate-400 text-[10px]">
                          to {new Date(promo.endDate).toLocaleDateString("id-ID")}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                        {promo.priority}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            promo.status !== "ACTIVE"
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              : isExpired
                              ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                              : isUpcoming
                              ? "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-400"
                              : "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                          }`}
                        >
                          {promo.status !== "ACTIVE"
                            ? "INACTIVE"
                            : isExpired
                            ? "EXPIRED"
                            : isUpcoming
                            ? "UPCOMING"
                            : "ACTIVE"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Detail View */}
                          <button
                            onClick={() => setDetailModalPromo(promo)}
                            className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Edit */}
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(promo)}
                              className="p-1 rounded text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors"
                              title="Edit Promotion"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}

                          {/* Toggle Active / Inactive */}
                          {((promo.status === "ACTIVE" && canDeactivate) ||
                            (promo.status !== "ACTIVE" && canActivate)) && (
                            <button
                              disabled={isLoading}
                              onClick={() => handleToggleStatus(promo)}
                              className={`p-1 rounded transition-colors ${
                                promo.status === "ACTIVE"
                                  ? "text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
                                  : "text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                              }`}
                              title={promo.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            >
                              {promo.status === "ACTIVE" ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </button>
                          )}

                          {/* Delete */}
                          {canDelete && (
                            <button
                              disabled={isLoading}
                              onClick={() => handleDelete(promo)}
                              className="p-1 rounded text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              title="Delete Promotion"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Promotion Create / Edit Modal */}
      {isModalOpen && (
        <PromotionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          promotion={selectedPromo}
          products={products}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {/* Details View Modal */}
      {detailModalPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Promotion Details
              </h3>
              <button
                onClick={() => setDetailModalPromo(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Code:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{detailModalPromo.code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Name:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{detailModalPromo.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Type:</span>
                <span className="font-bold">{detailModalPromo.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Rule Summary:</span>
                <span className="text-right max-w-[260px] font-medium">{getPromoSummary(detailModalPromo)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Start Date:</span>
                <span>{new Date(detailModalPromo.startDate).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">End Date:</span>
                <span>{new Date(detailModalPromo.endDate).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Priority:</span>
                <span>{detailModalPromo.priority}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Stackable:</span>
                <span>{detailModalPromo.isStackable ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold">{detailModalPromo.status}</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalPromo(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
