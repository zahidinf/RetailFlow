"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { logout } from "../actions";

interface UserMenuProps {
  userName: string;
  userRole?: string;
}

export default function UserMenu({ userName, userRole }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs">
          <span className="text-white text-sm font-semibold">
            {userName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{userName}</div>
          {userRole && <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{userRole}</div>}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 py-1.5 z-50 divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
          <div className="px-4 py-2.5">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Signed in as</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{userName}</p>
            {userRole && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200/60 dark:border-blue-800/60">
                {userRole}
              </span>
            )}
          </div>
          <div className="py-1">
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-slate-400 dark:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span>My Profile</span>
              </div>
            </Link>
          </div>

          <div className="py-1">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-red-500 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Logout</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
