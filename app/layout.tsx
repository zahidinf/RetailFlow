import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionGuard from "./components/SessionGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "RetailFlow - Modern POS & Inventory Management",
    template: "%s | RetailFlow",
  },
  description: "Enterprise POS and Inventory Management System with Multi-Role Access Control",
  applicationName: "RetailFlow",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "RetailFlow - Modern POS & Inventory Management",
    description: "Enterprise POS and Inventory Management System with Multi-Role Access Control",
    url: "/",
    siteName: "RetailFlow",
    images: [
      {
        url: "/branding/og-image.png",
        width: 1200,
        height: 630,
        alt: "RetailFlow",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RetailFlow - Modern POS & Inventory Management",
    description: "Enterprise POS and Inventory Management System with Multi-Role Access Control",
    images: ["/branding/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionGuard>{children}</SessionGuard>
      </body>
    </html>
  );
}
