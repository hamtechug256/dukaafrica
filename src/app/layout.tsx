import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // metadataBase intentionally omitted to avoid Next.js hydration bug where
  // new URL(metadataBase) is called before router state is initialized.
  // All URLs in metadata below are absolute, so metadataBase is not needed.
  title: "DuukaAfrica - East Africa's Trusted Marketplace",
  description: "Shop millions of products from verified sellers across East Africa. Best prices on electronics, fashion, home & more. Fast delivery to Uganda, Kenya, Tanzania, Rwanda.",
  keywords: ["DuukaAfrica", "East Africa", "Marketplace", "Online Shopping", "Uganda", "Kenya", "Tanzania", "Rwanda", "Electronics", "Fashion", "Jumia alternative", "Jiji alternative"],
  authors: [{ name: "DuukaAfrica Team" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/brand/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
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
              __html: `(function(){var _U=window.URL;window.URL=function(u,b){if(u===undefined||u===null)return new _U(b||location.href);return b!==undefined?new _U(u,b):new _U(u)};window.URL.prototype=_U.prototype;window.URL.createObjectURL=_U.createObjectURL;window.URL.revokeObjectURL=_U.revokeObjectURL})();`,
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
          <SpeedInsights />
        </body>
      </html>
    </Providers>
  );
}
