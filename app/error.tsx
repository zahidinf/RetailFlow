"use client";

import { useEffect } from "react";
import Image from "next/image";
import Footer from "./components/Footer";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4 transition-colors">
          <div className="flex justify-center mb-2">
            {/* Light logo */}
            <Image
              src="/branding/logo.svg"
              alt="RetailFlow"
              width={170}
              height={41}
              className="h-10 w-auto object-contain dark:hidden"
            />
            {/* Dark logo */}
            <Image
              src="/branding/logo-dark.svg"
              alt="RetailFlow"
              width={170}
              height={41}
              className="h-10 w-auto object-contain hidden dark:block"
            />
          </div>

          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-100 dark:border-red-900/60">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Unable to load data</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              An unexpected error occurred while fetching information. Please try again.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-xs text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-600/20 transition-colors cursor-pointer"
            >
              Retry
            </button>
            <a
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-slate-700 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-600/20 transition-colors"
            >
              Back to Login
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
