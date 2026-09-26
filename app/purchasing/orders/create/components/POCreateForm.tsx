"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPurchaseOrderAction } from "../../../actions";
import { formatRupiah } from "@/lib/tax-utils";

interface ItemRow {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  orderedQuantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface POCreateFormProps {
  suppliers: any[];
  products: any[];
}

export default function POCreateForm({ suppliers, products }: POCreateFormProps) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSuppliers = suppliers.filter((s) => s.status === "ACTIVE");

  const handleAddItem = () => {
    if (!selectedProductId) return;

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    // Check if already in items
    const existingIndex = items.findIndex((i) => i.productId === prod.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].orderedQuantity += 1;
      updated[existingIndex].totalPrice = updated[existingIndex].orderedQuantity * updated[existingIndex].unitPrice;
      setItems(updated);
    } else {
      const cost = Number(prod.costPrice) || 0;
      setItems([
        ...items,
        {
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          unit: prod.unit,
          orderedQuantity: 1,
          unitPrice: cost,
          totalPrice: cost * 1,
        },
      ]);
    }

    setSelectedProductId("");
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const updated = [...items];
    const validQty = Math.max(1, Math.floor(qty));
    updated[index].orderedQuantity = validQty;
    updated[index].totalPrice = validQty * updated[index].unitPrice;
    setItems(updated);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...items];
    const validPrice = Math.max(0, price);
    updated[index].unitPrice = validPrice;
    updated[index].totalPrice = updated[index].orderedQuantity * validPrice;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = Math.round(subtotal * 0.11);
  const grandTotal = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierId) {
      setError("Please select an active supplier");
      return;
    }

    if (items.length === 0) {
      setError("Please add at least one item to the purchase order");
      return;
    }

    setLoading(true);

    try {
      const res = await createPurchaseOrderAction({
        supplierId,
        notes: notes.trim(),
        items: items.map((i) => ({
          productId: i.productId,
          orderedQuantity: i.orderedQuantity,
          unitPrice: i.unitPrice,
          tax: Math.round(i.totalPrice * 0.11),
        })),
      });

      if (res.error || !res.order) {
        setError(res.error || "Failed to create purchase order");
        setLoading(false);
      } else {
        router.push(`/purchasing/orders/${res.order.id}`);
      }
    } catch {
      setError("Failed to create purchase order. Please check inputs.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-xl">
          {error}
        </div>
      )}

      {/* Supplier & General Settings */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <h2 className="font-bold text-base text-slate-900 dark:text-white">
          Purchase Order Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Supplier <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">-- Choose active supplier --</option>
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
            {activeSuppliers.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                No active suppliers available. Please activate or add a supplier first.
              </p>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Notes / Delivery Terms
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Deliver to store front, payment net 30"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* PO Items Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="font-bold text-base text-slate-900 dark:text-white">
            Order Items
          </h2>

          {/* Add Product Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-blue-500 cursor-pointer min-w-[220px]"
            >
              <option value="">-- Select product to add --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAddItem}
              disabled={!selectedProductId}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
            >
              Add Item
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right w-28">Quantity</th>
                <th className="px-4 py-3 text-right w-36">Unit Price</th>
                <th className="px-4 py-3 text-right">Line Total</th>
                <th className="px-4 py-3 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No items added yet. Select a product above and click "Add Item".
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.productId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                      {item.sku}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={item.orderedQuantity}
                        onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                        className="w-20 px-2.5 py-1.5 text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        required
                        value={item.unitPrice}
                        onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                        className="w-28 px-2.5 py-1.5 text-right bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatRupiah(item.totalPrice)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>PPN (11%):</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(tax)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
              <span>Grand Total:</span>
              <span className="text-blue-600 dark:text-blue-400">{formatRupiah(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href="/purchasing/orders"
          className="px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || items.length === 0}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
        >
          {loading ? "Creating Order..." : "Save as Draft Purchase Order"}
        </button>
      </div>
    </form>
  );
}
