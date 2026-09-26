"use client";

interface MovementDetailModalProps {
  movement: any;
  onClose: () => void;
}

export default function MovementDetailModal({ movement, onClose }: MovementDetailModalProps) {
  if (!movement) return null;

  const dateFormatted = new Date(movement.createdAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">
              Stock Movement Details
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              ID: {movement.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm">
          {/* Product Overview Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</div>
            <div className="font-bold text-base text-slate-900 dark:text-white">
              {movement.product?.name}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>SKU: <strong className="font-mono text-slate-700 dark:text-slate-300">{movement.product?.sku}</strong></span>
              <span>•</span>
              <span>Unit: <strong className="text-slate-700 dark:text-slate-300">{movement.product?.unit}</strong></span>
              {movement.product?.category?.name && (
                <>
                  <span>•</span>
                  <span>Category: <strong className="text-slate-700 dark:text-slate-300">{movement.product?.category?.name}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Stock Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Stock Before</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {movement.previousStock}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Movement Change</div>
              <div
                className={`text-lg font-bold mt-0.5 ${
                  movement.quantity > 0
                    ? "text-green-600 dark:text-green-400"
                    : movement.quantity < 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Stock After</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {movement.newStock}
              </div>
            </div>
          </div>

          {/* Audit Metadata Details */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">Movement Type:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {movement.type}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">Reference Type:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {movement.referenceType || "N/A"}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">Reference ID / Number:</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {movement.referenceId || "N/A"}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">Reason:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200 text-right max-w-xs">
                {movement.reason || "N/A"}
              </span>
            </div>

            {movement.notes && (
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Notes:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200 text-right max-w-xs">
                  {movement.notes}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">Performed By:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {movement.user
                  ? `${movement.user.firstName} ${movement.user.lastName} (${movement.user.email})`
                  : "System"}
              </span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">Recorded At:</span>
              <span className="text-slate-800 dark:text-slate-200">{dateFormatted}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
