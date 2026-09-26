import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getSessionWithPermissions } from "@/lib/auth";
import { PermissionProvider } from "../components/PermissionProvider";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "About",
  description: "A retail management application built with purpose.",
};

const principles = [
  {
    title: "Simple",
    description: "Keep the experience clear and avoid unnecessary complexity.",
    icon: (
      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    title: "Practical",
    description: "Focus on features and workflows that solve real business needs.",
    icon: (
      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Maintainable",
    description: "Build the application with a structure that is easier to understand, improve, and maintain.",
    icon: (
      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    title: "Scalable",
    description: "Create a foundation that can evolve as the application and its requirements grow.",
    icon: (
      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
];

export default async function AboutPage() {
  const session = await getSessionWithPermissions();

  return (
    <PermissionProvider
      permissions={session?.permissions ?? []}
      isSuperAdmin={session?.isSuperAdmin ?? false}
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
        {session ? (
          <Navbar userName={session.name} userRole={session.roleName} />
        ) : (
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <Link
                  href="/"
                  className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                >
                  <Image
                    src="/branding/logo.svg"
                    alt="RetailFlow"
                    width={170}
                    height={41}
                    className="h-10 w-auto object-contain dark:hidden"
                    priority
                  />
                  <Image
                    src="/branding/logo-dark.svg"
                    alt="RetailFlow"
                    width={170}
                    height={41}
                    className="h-10 w-auto object-contain hidden dark:block"
                    priority
                  />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </header>
        )}

        <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <article className="space-y-10 sm:space-y-12">
            {/* Hero Section */}
            <header className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                About RetailFlow
              </h1>
              <p className="text-base sm:text-lg text-slate-500 dark:text-slate-400 font-normal">
                A retail management application built with purpose.
              </p>
            </header>

            <hr className="border-slate-200 dark:border-slate-800" />

            {/* Section 1: About Me */}
            <section className="space-y-4" aria-labelledby="heading-about-me">
              <h2
                id="heading-about-me"
                className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
              >
                About Me
              </h2>
              <div className="space-y-3.5 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                <p>
                  RetailFlow is created and developed by Farhan Hasanudin, a software developer
                  who enjoys turning business needs and ideas into practical software solutions.
                </p>
                <p>
                  This project is also a way to bring together my interests in software development,
                  system design, business processes, and building applications that are designed to
                  be useful in real-world scenarios.
                </p>
                <p>
                  Rather than creating RetailFlow only as a technical demonstration, I want to build
                  it as a real application that can continue to evolve over time.
                </p>
              </div>
            </section>

            {/* Section 2: About RetailFlow */}
            <section className="space-y-4" aria-labelledby="heading-about-rf">
              <h2
                id="heading-about-rf"
                className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
              >
                About RetailFlow
              </h2>
              <div className="space-y-3.5 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                <p>
                  RetailFlow is a modern retail management application designed to help organize and
                  manage essential retail operations in a structured way.
                </p>
                <p>
                  The application starts with fundamental capabilities such as product and category
                  management, inventory management, user management, and role-based access control.
                </p>
                <p>
                  RetailFlow is designed with an extensible foundation so that it can continue to
                  grow as new retail requirements, workflows, and ideas are introduced.
                </p>
              </div>
            </section>

            {/* Section 3: Why I Built RetailFlow */}
            <section className="space-y-4" aria-labelledby="heading-why-built">
              <h2
                id="heading-why-built"
                className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
              >
                Why I Built RetailFlow
              </h2>
              <div className="space-y-3.5 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                <p>
                  I built RetailFlow as more than just a CRUD application or a simple coding
                  exercise.
                </p>
                <p>
                  The goal is to create a practical business application that brings together
                  real-world requirements, user experience, access control, business processes, and
                  maintainable software architecture.
                </p>
                <p>
                  Through RetailFlow, I want to explore how a modern application can be designed and
                  developed end-to-end while keeping the product simple, practical, and useful.
                </p>
                <p>
                  It is also an ongoing project where ideas can be tested, improved, and turned into
                  real features over time.
                </p>
              </div>
            </section>

            {/* Section 4: My Approach */}
            <section className="space-y-5" aria-labelledby="heading-approach">
              <h2
                id="heading-approach"
                className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
              >
                My Approach
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {principles.map((principle) => (
                  <div
                    key={principle.title}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col gap-2 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
                        {principle.icon}
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        {principle.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {principle.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 5: Closing Section */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs transition-colors">
              <div className="space-y-3.5 text-slate-600 dark:text-slate-300 leading-relaxed text-sm sm:text-base">
                <p className="font-semibold text-slate-900 dark:text-white">RetailFlow is a work in progress.</p>
                <p>
                  It will continue to evolve as new ideas, requirements, and real-world retail needs
                  emerge.
                </p>
                <p>
                  The goal is simple: build something useful, keep improving it, and enjoy the
                  process of turning an idea into a real product.
                </p>
              </div>
            </section>
          </article>
        </main>

        <Footer />
      </div>
    </PermissionProvider>
  );
}
