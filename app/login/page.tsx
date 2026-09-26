import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import Footer from "../components/Footer";
import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to RetailFlow",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  const params = await searchParams;
  const isExpired = params?.expired === "1";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 sm:p-10 transition-colors">
            <div className="text-center mb-8">
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
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                Welcome Back
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sign in to your account to continue
              </p>
            </div>

            {isExpired && (
              <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-amber-800 dark:text-amber-300 text-sm">
                <svg
                  className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-200">
                    Your session has expired due to inactivity. Please log in again.
                  </p>
                </div>
              </div>
            )}

            <LoginForm />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
