import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { ErrorBoundary } from "@/components/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DuukaAfrica - East Africa's Trusted Marketplace",
  description: "Shop millions of products from verified sellers across East Africa. Best prices on electronics, fashion, home & more. Fast delivery to Uganda, Kenya, Tanzania, Rwanda.",
  keywords: ["DuukaAfrica", "East Africa", "Marketplace", "Online Shopping", "Uganda", "Kenya", "Tanzania", "Rwanda", "Electronics", "Fashion", "Jumia alternative", "Jiji alternative"],
  authors: [{ name: "DuukaAfrica Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "DuukaAfrica - East Africa's Trusted Marketplace",
    description: "Shop millions of products from verified sellers across East Africa. Best prices on electronics, fashion, home & more.",
    url: "https://duukaafrica.com",
    siteName: "DuukaAfrica",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "DuukaAfrica - East Africa's Trusted Marketplace",
    description: "Shop millions of products from verified sellers across East Africa. Best prices on electronics, fashion, home & more.",
    creator: "@duukaafrica",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
          >
            Skip to main content
          </a>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster />
        </body>
      </html>
    </Providers>
  );
}
