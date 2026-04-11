import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://duukaafrica.com'),
  title: "DuukaAfrica - East Africa's Trusted Marketplace",
  description: "Shop millions of products from verified sellers across East Africa. Best prices on electronics, fashion, home & more. Fast delivery to Uganda, Kenya, Tanzania, Rwanda.",
  keywords: ["DuukaAfrica", "East Africa", "Marketplace", "Online Shopping", "Uganda", "Kenya", "Tanzania", "Rwanda", "Electronics", "Fashion", "Jumia alternative", "Jiji alternative"],
  authors: [{ name: "DuukaAfrica Team" }],
  icons: {
    icon: "https://duukaafrica.com/logo.svg",
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
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Patch: Next.js 16 useActionQueue may pass undefined to new URL()
                // during initial hydration before the RSC payload canonicalUrl is ready.
                // This patches the global URL constructor to gracefully handle
                // undefined/null by falling back to the current page URL.
                (function() {
                  var _URL = window.URL;
                  window.URL = function(url, base) {
                    if (url == null) url = window.location.href;
                    return new _URL(url, base);
                  };
                  window.URL.createObjectURL = _URL.createObjectURL.bind(_URL);
                  window.URL.revokeObjectURL = _URL.revokeObjectURL.bind(_URL);
                  // Preserve static URL methods
                  window.URL.canParse = _URL.canParse ? _URL.canParse.bind(_URL) : undefined;
                  window.URL.createBlobURL = _URL.createBlobURL ? _URL.createBlobURL.bind(_URL) : undefined;
                  window.URL.revokeBlobURL = _URL.revokeBlobURL ? _URL.revokeBlobURL.bind(_URL) : undefined;
                })();
              `,
            }}
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
          >
            Skip to main content
          </a>
          {children}
          <Toaster />
        </body>
      </html>
    </Providers>
  );
}
