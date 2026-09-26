"use client";

import { useState } from "react";
import { SessionSettings } from "@/lib/session-settings";
import { saveSessionSettings } from "../actions";

interface SessionSettingsFormProps {
  initialSettings: SessionSettings;
}

const MAX_SESSIONS_OPTIONS = [1, 2, 3, 4, 5];
const IDLE_TIMEOUT_OPTIONS = [
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 120, label: "120 minutes" },
];

export default function SessionSettingsForm({ initialSettings }: SessionSettingsFormProps) {
  const [savedSettings, setSavedSettings] = useState<SessionSettings>(initialSettings);
  const [maxActiveSessions, setMaxActiveSessions] = useState<number>(
    initialSettings.maxActiveSessions
  );
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number>(
    initialSettings.idleTimeoutMinutes
  );

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasChanges =
    maxActiveSessions !== savedSettings.maxActiveSessions ||
    idleTimeoutMinutes !== savedSettings.idleTimeoutMinutes;

  const handleCancel = () => {
    setMaxActiveSessions(savedSettings.maxActiveSessions);
    setIdleTimeoutMinutes(savedSettings.idleTimeoutMinutes);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    // Frontend validation
    if (!Number.isInteger(maxActiveSessions) || maxActiveSessions < 1) {
      setErrorMessage("Maximum Active Sessions must be an integer greater than 0.");
      return;
    }

    if (!Number.isInteger(idleTimeoutMinutes) || idleTimeoutMinutes <= 0) {
      setErrorMessage("Idle Timeout must be an integer greater than 0 minutes.");
      return;
    }

    setLoading(true);

    try {
      const response = await saveSessionSettings({
        maxActiveSessions,
        idleTimeoutMinutes,
      });

      if (!response.success || !response.data) {
        setErrorMessage(response.error || "Failed to update session settings.");
      } else {
        setSavedSettings(response.data);
        setMaxActiveSessions(response.data.maxActiveSessions);
        setIdleTimeoutMinutes(response.data.idleTimeoutMinutes);
        setSuccessMessage("Session settings updated successfully.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred while saving.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 flex items-start gap-3 text-green-800 dark:text-green-300 text-sm transition-colors">
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <div className="flex-1 font-medium">{successMessage}</div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-3 text-red-800 dark:text-red-300 text-sm transition-colors">
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1 font-medium">{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Section 1 — Session Enforcement */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-8 transition-colors">
        <div className="flex items-start gap-3.5 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Session Enforcement
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Control the maximum number of active sessions allowed for each user.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-md">
            <label
              htmlFor="maxActiveSessions"
              className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2"
            >
              Maximum Active Sessions
            </label>
            <div className="relative">
              <select
                id="maxActiveSessions"
                value={maxActiveSessions}
                onChange={(e) => setMaxActiveSessions(parseInt(e.target.value, 10))}
                disabled={loading}
                className="w-full sm:w-64 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 transition-colors cursor-pointer"
              >
                {MAX_SESSIONS_OPTIONS.map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Defines the maximum number of active sessions allowed for each user.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2 — Session Idle Timeout */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-8 transition-colors">
        <div className="flex items-start gap-3.5 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Session Idle Timeout
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Automatically expire inactive user sessions after a configured period of inactivity.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="max-w-md">
            <label
              htmlFor="idleTimeoutMinutes"
              className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2"
            >
              Idle Timeout
            </label>
            <div className="relative">
              <select
                id="idleTimeoutMinutes"
                value={idleTimeoutMinutes}
                onChange={(e) => setIdleTimeoutMinutes(parseInt(e.target.value, 10))}
                disabled={loading}
                className="w-full sm:w-64 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-600/10 dark:focus:ring-blue-500/20 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 transition-colors cursor-pointer"
              >
                {IDLE_TIMEOUT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Automatically expires a user session after the configured period of inactivity.
            </p>
          </div>
        </div>
      </div>

      {/* Save / Cancel Controls */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading || !hasChanges}
          className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-600/20 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
        >
          {loading && (
            <svg
              className="animate-spin w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          <span>Save Changes</span>
        </button>
      </div>
    </form>
  );
}
