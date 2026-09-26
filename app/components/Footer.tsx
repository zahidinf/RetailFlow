import Link from "next/link";
import { getAppVersion, getAppEnvironment, APP_CONFIG } from "@/lib/app-config";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const version = getAppVersion();
  const environment = getAppEnvironment();

  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 py-4 sm:py-5 text-center transition-colors">
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-1.5 sm:gap-2">
        {/* Baris 1: Copyright, Version, Environment */}
        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 tracking-normal select-none">
          <span>&copy; {currentYear} {APP_CONFIG.name}</span>
          <span className="mx-2 text-slate-400 dark:text-slate-600">&middot;</span>
          <span>v{version}</span>
          <span className="mx-2 text-slate-400 dark:text-slate-600">&middot;</span>
          <span>{environment}</span>
        </p>

        {/* Baris 2: Support & About Navigation Links */}
        <nav aria-label="Footer navigation" className="flex items-center justify-center gap-2 text-xs sm:text-[13px]">
          <a
            href={`mailto:${APP_CONFIG.supportEmail}`}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded px-1"
          >
            Support
          </a>
          <span className="text-slate-400 dark:text-slate-600 select-none">&middot;</span>
          <Link
            href="/about"
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 rounded px-1"
          >
            About
          </Link>
        </nav>
      </div>
    </footer>
  );
}
