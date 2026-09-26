"use client";

import { useState } from "react";
import { createParameterSettingAction } from "../actions";
import { usePermissions } from "@/app/components/PermissionProvider";
import {
  TIME_UNITS,
  PRODUCT_UNITS,
  getParameterUnitType,
  isValidTimeUnit,
} from "@/lib/units";

interface Props {
  onSuccess?: () => void;
}

export default function AddParameterDialog({ onSuccess }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { hasPermission, isSuperAdmin } = usePermissions();

  const canCreate = hasPermission("PARAMETER_SETTINGS_CREATE") || isSuperAdmin;

  const defaultFormData = {
    code: "",
    name: "",
    value: "",
    unit: "",
    description: "",
    status: "ACTIVE",
  };

  const [formData, setFormData] = useState(defaultFormData);

  const handleOpen = () => {
    setFormData(defaultFormData);
    setError(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setFormData(defaultFormData);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const code = formData.code.trim().toUpperCase();
    const value = formData.value.trim();

    if (!code) {
      setError("Parameter Code is required");
      return;
    }
    if (!formData.name.trim()) {
      setError("Parameter Name is required");
      return;
    }
    if (!value) {
      setError("Parameter Value is required");
      return;
    }

    const isTime = getParameterUnitType(code) === "TIME";

    if (code === "REFUND_VALIDITY_PERIOD") {
      const num = Number(value);
      if (isNaN(num)) {
        setError("Refund Validity Period must be a numeric value");
        return;
      }
      if (num <= 0) {
        setError("Refund Validity Period must be greater than zero");
        return;
      }
      if (!formData.unit || !isValidTimeUnit(formData.unit)) {
        setError("Please select a valid Time Unit (Seconds, Minutes, Hours, Days)");
        return;
      }
    } else if (isTime && (!formData.unit || !isValidTimeUnit(formData.unit))) {
      setError("Please select a valid Time Unit (Seconds, Minutes, Hours, Days)");
      return;
    }

    setLoading(true);

    try {
      const form = new FormData();
      form.append("code", code);
      form.append("name", formData.name.trim());
      form.append("value", value);
      form.append("unit", formData.unit.trim());
      form.append("description", formData.description.trim());
      form.append("status", formData.status);

      const result = await createParameterSettingAction(form);

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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!canCreate) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-600/20 transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Parameter
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[90vh] overflow-y-auto transition-colors">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10 transition-colors">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Add Parameter</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Create a new application parameter setting</p>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Parameter Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                  placeholder="e.g. REFUND_VALIDITY_PERIOD"
                  className="w-full font-mono uppercase px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Parameter Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="e.g. Refund Validity Period"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Parameter Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.value}
                    onChange={(e) => handleChange("value", e.target.value)}
                    placeholder="e.g. 24"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Unit
                  </label>
                  {getParameterUnitType(formData.code) === "TIME" ? (
                    <select
                      value={formData.unit}
                      onChange={(e) => handleChange("unit", e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                    >
                      <option value="">Select Unit</option>
                      {TIME_UNITS.map((u) => (
                        <option key={u.code} value={u.code}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={formData.unit}
                      onChange={(e) => handleChange("unit", e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                    >
                      <option value="">Select Unit</option>
                      <optgroup label="Time Units">
                        {TIME_UNITS.map((u) => (
                          <option key={u.code} value={u.code}>
                            {u.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Product Units">
                        {PRODUCT_UNITS.map((u) => (
                          <option key={u.code} value={u.code}>
                            {u.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Enter parameter description"
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm resize-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 text-sm transition-colors"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-600/20 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Creating..." : "Create Parameter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
