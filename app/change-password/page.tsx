import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ChangePasswordForm from "./ChangePasswordForm";
import type { Metadata } from "next";
import Image from "next/image";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "Change Password",
};

export default async function ChangePasswordPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              {/* Light logo */}
              <Image
                src="/branding/logo.svg"
                alt="RetailFlow"
                width={200}
                height={48}
                className="h-11 sm:h-12 w-auto object-contain dark:hidden"
                priority
              />
              {/* Dark logo */}
              <Image
                src="/branding/logo-dark.svg"
                alt="RetailFlow"
                width={200}
                height={48}
                className="h-11 sm:h-12 w-auto object-contain hidden dark:block"
                priority
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Change Your Password
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              You must change your password before continuing.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 transition-colors">
            <ChangePasswordForm />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
