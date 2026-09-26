"use client";

import { useState } from "react";
import { deleteParameterSettingAction } from "../actions";
import { ParameterSettingData, PARAM_REFUND_VALIDITY_PERIOD } from "@/lib/parameter-settings";

interface Props {
  parameter: ParameterSettingData;
  onSuccess?: () => void;
}

export default function DeleteParameterDialog({ parameter, onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCoreParameter = parameter.code === PARAM_REFUND_VALIDITY_PERIOD;

  const handleOpen = () => {
    setError(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await deleteParameterSettingAction(parameter.id);

      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        handleClose();
        onSuccess?.();
      }
    } finally {
      setLoading(false);
    }
  };

  if (isCoreParameter) {
    return null; // Cannot delete core system parameter
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 text-xs font-semibold cursor-pointer"
      >
        Delete
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 text-left transition-colors">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/60 rounded-xl">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Parameter</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{parameter.code}</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Are you sure you want to delete parameter setting <strong>{parameter.name}</strong>? This action cannot be undone.
            </p>

            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
