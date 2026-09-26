"use client";

import { useState } from "react";

interface AuditDetailModalProps {
  log: any;
  onClose: () => void;
}

export default function AuditDetailModal({ log, onClose }: AuditDetailModalProps) {
  const [showRawJson, setShowRawJson] = useState(false);

  if (!log) return null;

  const action = (log.action || "").toUpperCase();
  const prevVal = typeof log.previousValue === "string" ? safeJsonParse(log.previousValue) : log.previousValue;
  const newVal = typeof log.newValue === "string" ? safeJsonParse(log.newValue) : log.newValue;

  const isCreate = action === "CREATE";
  const isDelete = action === "DELETE";
  const isUpdate = action === "UPDATE" || (!isCreate && !isDelete);

  // Compute keys for diff
  const beforeObj = (prevVal && typeof prevVal === "object" && !Array.isArray(prevVal)) ? prevVal : {};
  const afterObj = (newVal && typeof newVal === "object" && !Array.isArray(newVal)) ? newVal : {};
  const allFieldKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));

  const formatFieldValue = (val: any): string => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "boolean") return val ? "true" : "false";
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    return String(val);
  };

  const getActionBadgeColor = () => {
    if (action === "CREATE") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800";
    if (action === "DELETE") return "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800";
    if (action === "UPDATE") return "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800";
    return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700";
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 text-xs font-bold rounded-md border uppercase tracking-wider ${getActionBadgeColor()}`}>
              {action}
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {log.entity} Activity Detail
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Record: <span className="font-semibold text-slate-700 dark:text-slate-200">{log.record || log.recordIdentifier || log.recordId || "-"}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">User</span>
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100 mt-1 block truncate" title={log.user}>
                {log.user || "System"}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Timestamp</span>
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100 mt-1 block">
                {new Date(log.timestamp || log.date).toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Module & Entity</span>
              <span className="text-xs font-medium text-slate-900 dark:text-slate-100 mt-1 block truncate">
                {log.module} / {log.entity}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Status</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {log.status || "SUCCESS"}
              </span>
            </div>
          </div>

          {/* Network details if available */}
          {(log.ipAddress || log.userAgent) && (
            <div className="bg-slate-50/70 dark:bg-slate-800/40 px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-slate-600 dark:text-slate-400">
              {log.ipAddress && (
                <div>
                  <span className="font-semibold text-slate-500">IP: </span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{log.ipAddress}</span>
                </div>
              )}
              {log.userAgent && (
                <div className="truncate">
                  <span className="font-semibold text-slate-500">User Agent: </span>
                  <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{log.userAgent}</span>
                </div>
              )}
            </div>
          )}

          {/* Activity Description */}
          {log.description && (
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60 rounded-xl">
              <span className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wider block mb-1">
                Activity Summary
              </span>
              <p className="text-xs text-blue-950 dark:text-blue-100">
                {log.description}
              </p>
            </div>
          )}

          {/* Value Changes Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {isUpdate ? "Field Changes (Before vs After)" : isCreate ? "Created Record State" : "Deleted Record State"}
              </h3>
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
              >
                {showRawJson ? "Show Formatted Table" : "Show Raw JSON"}
              </button>
            </div>

            {showRawJson ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Previous Value (Before):</span>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72">
                    {prevVal ? JSON.stringify(prevVal, null, 2) : "null"}
                  </pre>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500">New Value (After):</span>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72">
                    {newVal ? JSON.stringify(newVal, null, 2) : "null"}
                  </pre>
                </div>
              </div>
            ) : isUpdate ? (
              allFieldKeys.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-2.5 w-1/4">Field</th>
                        <th className="px-4 py-2.5 w-3/8 text-rose-700 dark:text-rose-400">Previous Value (Before)</th>
                        <th className="px-4 py-2.5 w-3/8 text-emerald-700 dark:text-emerald-400">New Value (After)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {allFieldKeys.map((key) => {
                        const valBefore = beforeObj[key];
                        const valAfter = afterObj[key];
                        const isChanged = JSON.stringify(valBefore) !== JSON.stringify(valAfter);

                        return (
                          <tr
                            key={key}
                            className={isChanged ? "bg-amber-50/40 dark:bg-amber-950/20" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"}
                          >
                            <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300">
                              <div className="flex items-center gap-1.5">
                                {isChanged && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Modified field"></span>
                                )}
                                {key}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 font-mono text-[11px] break-all">
                              {formatFieldValue(valBefore)}
                            </td>
                            <td className="px-4 py-2.5 text-slate-800 dark:text-slate-100 font-mono text-[11px] break-all font-medium">
                              {formatFieldValue(valAfter)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {log.details || "No structured field changes recorded for this update."}
                </div>
              )
            ) : isCreate ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="font-semibold">Previous Value:</span> None (New record created)
                </div>
                {Object.keys(afterObj).length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-2.5 w-1/3">Field</th>
                          <th className="px-4 py-2.5 w-2/3 text-emerald-700 dark:text-emerald-400">Created Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {Object.entries(afterObj).map(([k, v]) => (
                          <tr key={k} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300">{k}</td>
                            <td className="px-4 py-2 font-mono text-[11px] text-slate-900 dark:text-slate-100 break-all">{formatFieldValue(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl">
                    {log.details || "No additional record details recorded."}
                  </div>
                )}
              </div>
            ) : isDelete ? (
              <div className="space-y-4">
                <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 rounded-xl text-xs text-rose-800 dark:text-rose-300">
                  <span className="font-semibold">New Value:</span> None (Record permanently removed)
                </div>
                {Object.keys(beforeObj).length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-2.5 w-1/3">Field</th>
                          <th className="px-4 py-2.5 w-2/3 text-rose-700 dark:text-rose-400">Pre-deletion State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {Object.entries(beforeObj).map(([k, v]) => (
                          <tr key={k} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300">{k}</td>
                            <td className="px-4 py-2 font-mono text-[11px] text-slate-900 dark:text-slate-100 break-all">{formatFieldValue(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl">
                    {log.details || "No pre-deletion snapshot recorded."}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function safeJsonParse(val: string): any {
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}
