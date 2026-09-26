"use client";

import { useState } from "react";
import { deleteCategory } from "../actions";

interface Category {
  id: string;
  name: string;
  _count: {
    products: number;
  };
}

export default function DeleteCategoryDialog({ category }: { category: Category }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasProducts = category._count.products > 0;

  const handleDelete = async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await deleteCategory(category.id);

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        setIsOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
      >
        Delete
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs text-left">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden transition-colors">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-colors">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Delete Category</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {hasProducts ? (
                <>
                  <p className="text-slate-700 dark:text-slate-300 text-sm mb-4">
                    Category <strong className="text-slate-900 dark:text-white font-semibold">{category.name}</strong> cannot be deleted because it is currently assigned to{" "}
                    <strong className="text-slate-900 dark:text-white font-semibold">{category._count.products}</strong>{" "}
                    {category._count.products === 1 ? "product" : "products"}.
                  </p>
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Remove all products from this category before deleting it.</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-700 dark:text-slate-300 text-sm mb-4">
                    Are you sure you want to delete the category <strong className="text-slate-900 dark:text-white font-semibold">{category.name}</strong>?
                  </p>
                  <div className="bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-800/60 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg text-sm mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>This action cannot be undone.</span>
                  </div>
                </>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4 flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                {hasProducts ? (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 font-medium text-sm transition-colors"
                  >
                    Close
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors shadow-xs"
                    >
                      {loading ? "Deleting..." : "Delete"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
