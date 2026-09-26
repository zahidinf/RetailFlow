import Link from "next/link";
import Image from "next/image";
import Footer from "./components/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center space-y-5 transition-colors">
          <div className="flex justify-center mb-2">
            {/* Light logo */}
            <Image
              src="/branding/logo.svg"
              alt="RetailFlow"
              width={170}
              height={41}
              className="h-10 w-auto object-contain dark:hidden"
              priority
            />
            {/* Dark logo */}
            <Image
              src="/branding/logo-dark.svg"
              alt="RetailFlow"
              width={170}
              height={41}
              className="h-10 w-auto object-contain hidden dark:block"
              priority
            />
          </div>

          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-900/60">
            <span className="text-2xl font-bold">404</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Page Not Found</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              The page you are looking for does not exist or has been moved.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-600/20 shadow-xs transition-colors"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-600/20 transition-colors"
            >
              Login Page
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
