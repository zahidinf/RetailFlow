"use client";

import { logout } from "../actions";

export default function LogoutButton() {
  return (
    <button
      onClick={async () => await logout()}
      className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
    >
      Logout
    </button>
  );
}
