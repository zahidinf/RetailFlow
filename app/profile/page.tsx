import { getSessionWithPermissions, requirePasswordChanged } from "@/lib/auth";
import { getSessionSettings } from "@/lib/session-settings";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ProfileForm from "./ProfileForm";
import { PermissionProvider } from "../components/PermissionProvider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  await requirePasswordChanged();
  const sessionWithPermissions = await getSessionWithPermissions();

  if (!sessionWithPermissions) {
    redirect("/login?expired=1");
  }

  const sessionSettings = await getSessionSettings();

  return (
    <PermissionProvider
      permissions={sessionWithPermissions.permissions}
      isSuperAdmin={sessionWithPermissions.isSuperAdmin}
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        <Navbar
          userName={sessionWithPermissions.name}
          userRole={sessionWithPermissions.roleName}
        />

        {/* Main Content */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              My Profile
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
              Manage your account information and security settings
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left Column - Profile Info */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 sm:p-8 transition-colors">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-xs shrink-0">
                    <span className="text-white text-2xl font-bold">
                      {sessionWithPermissions.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">
                        {sessionWithPermissions.name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                        {sessionWithPermissions.roleName}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {sessionWithPermissions.email}
                    </p>
                  </div>
                </div>

                <ProfileForm
                  userEmail={sessionWithPermissions.email}
                  userFirstName={sessionWithPermissions.firstName}
                  userLastName={sessionWithPermissions.lastName}
                />
              </div>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 transition-colors">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 tracking-tight">
                  Account Security
                </h3>
                <div className="space-y-3.5 text-sm">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500 dark:text-slate-400">Login Status</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Session State</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {sessionSettings.maxActiveSessions === 1
                        ? "Single Device"
                        : `Up to ${sessionSettings.maxActiveSessions} Devices`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Auto Expiry</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {sessionSettings.idleTimeoutMinutes}m Inactivity
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </PermissionProvider>
  );
}
